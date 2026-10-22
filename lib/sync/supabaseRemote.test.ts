// What SupabaseRemote asks the server for, recorded by a stand-in client: every
// upload carries the remote's language and every download is filtered by it
// (docs/german.md, "Data", DE2). The real server is checked by npm run check:rls
// and npm run check:sync.

import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PULL_PAGE, SupabaseRemote } from "./supabaseRemote";

interface Call {
  table: string;
  op: string;
  args: unknown[];
}

/** A client that records each request and answers a download with that table's `rows`. */
function recordingClient(rows: Record<string, unknown[]> = {}) {
  const calls: Call[] = [];
  const builder = (table: string) => {
    const chain = {
      upsert: (...args: unknown[]) => {
        calls.push({ table, op: "upsert", args });
        return Promise.resolve({ error: null });
      },
      select: (...args: unknown[]) => (calls.push({ table, op: "select", args }), chain),
      eq: (...args: unknown[]) => (calls.push({ table, op: "eq", args }), chain),
      gt: (...args: unknown[]) => (calls.push({ table, op: "gt", args }), chain),
      order: (...args: unknown[]) => (calls.push({ table, op: "order", args }), chain),
      limit: (...args: unknown[]) => {
        calls.push({ table, op: "limit", args });
        return Promise.resolve({ data: rows[table] ?? [], error: null });
      },
    };
    return chain;
  };
  const client = {
    from: (table: string) => builder(table),
  } as unknown as SupabaseClient;
  return { client, calls };
}

const review = {
  id: "r1",
  cardId: "haus-house",
  direction: "forward" as const,
  rating: "good" as const,
  timestamp: Date.UTC(2026, 9, 10),
  section: "learn" as const,
  deviceId: "d1",
};

describe("SupabaseRemote", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("is this build's language unless told otherwise", () => {
    const { client } = recordingClient();
    expect(new SupabaseRemote(client).lang).toBe("es");
    expect(new SupabaseRemote(client, { lang: "de" }).lang).toBe("de");
  });

  it("is German in the German build", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_LANG", "de");
    const { SupabaseRemote: GermanBuildRemote } = await import("./supabaseRemote");
    expect(new GermanBuildRemote(recordingClient().client).lang).toBe("de");
  });

  it("uploads every row with its language, and notes by user, language and card", async () => {
    const { client, calls } = recordingClient();
    const remote = new SupabaseRemote(client, { lang: "de" });
    await remote.pushReviews([review]);
    await remote.pushNotes([{ cardId: "hotel-hotel", text: "das Hotel", updatedAt: review.timestamp }]);
    await remote.pushReports([
      {
        id: "p1",
        cardId: "haus-house",
        comment: null,
        createdAt: review.timestamp,
      },
    ]);
    await remote.pushResets([{ id: "z1", resetAt: review.timestamp, deviceId: "d1" }]);

    const upserts = calls.filter((c) => c.op === "upsert");
    expect(upserts.map((c) => c.table)).toEqual(["reviews", "notes", "card_reports", "resets"]);
    for (const { args } of upserts) {
      for (const row of args[0] as { lang: string }[]) expect(row.lang).toBe("de");
    }
    expect(upserts.map((c) => (c.args[1] as { onConflict: string }).onConflict)).toEqual([
      "user_id,id",
      "user_id,lang,card_id",
      "user_id,id",
      "user_id,id",
    ]);
    expect((upserts[0].args[0] as unknown[])[0]).toEqual({
      id: "r1",
      card_id: "haus-house",
      direction: "forward",
      rating: "good",
      reviewed_at: "2026-10-10T00:00:00.000Z",
      section: "learn",
      device_id: "d1",
      lang: "de",
    });
  });

  it("downloads only its language's rows, after the cursor in seq order", async () => {
    const { client, calls } = recordingClient({
      reviews: [
        {
          id: "r1",
          card_id: "haus-house",
          direction: "forward",
          rating: "good",
          reviewed_at: "2026-10-10T00:00:00.000Z",
          section: "learn",
          device_id: "d1",
          seq: 42,
        },
      ],
    });
    const remote = new SupabaseRemote(client, { lang: "de" });
    const page = await remote.pullReviews("7");
    await remote.pullNotes(null);
    await remote.pullResets("3");

    for (const table of ["reviews", "notes", "resets"]) {
      const ops = calls.filter((c) => c.table === table);
      expect(ops.find((c) => c.op === "eq")?.args, table).toEqual(["lang", "de"]);
      expect(ops.find((c) => c.op === "order")?.args, table).toEqual(["seq"]);
      expect(ops.find((c) => c.op === "limit")?.args, table).toEqual([PULL_PAGE]);
    }
    expect(calls.filter((c) => c.op === "gt").map((c) => [c.table, ...c.args])).toEqual([
      ["reviews", "seq", "7"],
      ["resets", "seq", "3"],
    ]);
    expect(page.cursor).toBe("42");
    expect(page.rows[0]).toMatchObject({
      id: "r1",
      cardId: "haus-house",
      timestamp: Date.UTC(2026, 9, 10),
    });
  });
});

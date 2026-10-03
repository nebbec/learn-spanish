// D3's check against the real Supabase project: a second user can neither read
// nor change the first user's rows in reviews, notes or card_reports, and a
// visitor who is not signed in gets nothing. Also checks the rules sync relies
// on: a repeated upload changes nothing, reviews cannot be changed, a note only
// replaces an earlier one, and the download order (`seq`) follows arrival.
//
// Creates two throwaway users with the secret key, signs each in with an
// emailed-code token through the publishable key as the app would, and deletes
// both users, and with them their rows, at the end. No email is sent.
// Run: npm run check:rls (reads .env.local; see .env.example)

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !publishable || !secret) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

const memoryOnly = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secret, memoryOnly);
const TABLES = ["reviews", "notes", "card_reports"];
const CARD = "rls-check-card";
const DEVICE = randomUUID();

let passed = 0;
let failed = 0;

function check(name, ok, detail) {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${!ok && detail ? ` (${detail})` : ""}`);
}

/** True when Postgres refused the call for lack of permission or a failed row-level security check. */
function refused(result) {
  return result.error?.code === "42501";
}

/** A new confirmed user, signed in through the publishable key. */
async function signedInUser(email) {
  const { data: created, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw new Error(`creating a test user: ${error.message}`);
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError) throw new Error(`making a sign-in token: ${linkError.message}`);
  const client = createClient(url, publishable, memoryOnly);
  const { error: verifyError } = await client.auth.verifyOtp({ type: "email", token_hash: link.properties.hashed_token });
  if (verifyError) throw new Error(`signing in: ${verifyError.message}`);
  return { id: created.user.id, client };
}

function review(userId, at) {
  return {
    user_id: userId,
    id: randomUUID(),
    card_id: CARD,
    direction: "forward",
    rating: "good",
    reviewed_at: new Date(at).toISOString(),
    section: "learn",
    device_id: DEVICE,
  };
}

function note(userId, text, at) {
  return { user_id: userId, card_id: CARD, text, updated_at: new Date(at).toISOString() };
}

function report(userId) {
  return { user_id: userId, id: randomUUID(), card_id: CARD, comment: "rls check", created_at: new Date().toISOString() };
}

// The calls D6's remote will make.
const pushReviews = (client, rows) => client.from("reviews").upsert(rows, { onConflict: "user_id,id", ignoreDuplicates: true });
const pushNotes = (client, rows) => client.from("notes").upsert(rows, { onConflict: "user_id,card_id" });
const pushReports = (client, rows) => client.from("card_reports").upsert(rows, { onConflict: "user_id,id", ignoreDuplicates: true });

/** Every row the client can see in a table, oldest seq first where there is one. */
async function visible(client, table) {
  const query = client.from(table).select("*");
  const { data, error } = table === "card_reports" ? await query : await query.order("seq");
  return { rows: data ?? [], error };
}

async function heldNote(user) {
  const { rows } = await visible(user.client, "notes");
  return rows[0];
}

async function main() {
  const tag = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  const users = [];
  try {
    const a = await signedInUser(`rls-check-a-${tag}@example.com`);
    users.push(a);
    const b = await signedInUser(`rls-check-b-${tag}@example.com`);
    users.push(b);
    const anon = createClient(url, publishable, memoryOnly);
    const t0 = Date.now();

    // The first user's rows.
    const first = review(a.id, t0);
    check("first user adds a review", !(await pushReviews(a.client, [first])).error);
    check("first user adds a note", !(await pushNotes(a.client, [note(a.id, "mine", t0)])).error);
    check("first user adds a report", !(await pushReports(a.client, [report(a.id)])).error);
    for (const table of TABLES) {
      const { rows, error } = await visible(a.client, table);
      check(`first user reads their own ${table}`, !error && rows.length === 1, error?.message ?? `${rows.length} rows`);
    }

    // The second user and a visitor who is not signed in.
    for (const [who, client] of [["second user", b.client], ["visitor", anon]]) {
      for (const table of TABLES) {
        const { rows } = await visible(client, table);
        check(`${who} reads none of ${table}`, rows.length === 0, `${rows.length} rows`);
      }
      const adds = [
        ["reviews", await pushReviews(client, [review(a.id, t0)])],
        ["notes", await pushNotes(client, [note(a.id, "theirs", t0 + 1000)])],
        ["card_reports", await pushReports(client, [report(a.id)])],
      ];
      for (const [table, result] of adds) {
        check(`${who} cannot add to ${table} as the first user`, refused(result), result.error?.code ?? "accepted");
      }
      await client.from("notes").update({ text: "theirs", updated_at: new Date(t0 + 2000).toISOString() }).eq("user_id", a.id);
      await client.from("reviews").update({ rating: "again" }).eq("user_id", a.id);
      for (const table of TABLES) await client.from(table).delete().eq("user_id", a.id);
    }
    const afterB = await Promise.all(TABLES.map((table) => visible(a.client, table)));
    check("first user still has all their rows", afterB.every(({ rows }) => rows.length === 1));
    check("first user's note unchanged", (await heldNote(a))?.text === "mine");
    check("first user's review unchanged", afterB[0].rows[0]?.rating === "good");

    // Reviews are never changed, even by their owner.
    const ownChange = await a.client.from("reviews").update({ rating: "again" }).eq("id", first.id);
    check("owner cannot change a review", refused(ownChange), ownChange.error?.code ?? "accepted");
    const ownDelete = await a.client.from("reviews").delete().eq("id", first.id);
    check("owner cannot delete a review", refused(ownDelete), ownDelete.error?.code ?? "accepted");

    // A repeated upload changes nothing.
    check("repeating a review upload is accepted", !(await pushReviews(a.client, [first])).error);
    check("repeating a review upload adds nothing", (await visible(a.client, "reviews")).rows.length === 1);

    // Notes: the latest edit wins, and on equal times the stored one stays.
    const before = await heldNote(a);
    check("an earlier note is accepted", !(await pushNotes(a.client, [note(a.id, "older", t0 - 1000)])).error);
    check("an earlier note does not replace a later one", (await heldNote(a))?.text === "mine");
    await pushNotes(a.client, [note(a.id, "same time", t0)]);
    const tied = await heldNote(a);
    check("a note at the same time leaves the stored one", tied?.text === "mine" && tied?.seq === before?.seq);
    await pushNotes(a.client, [note(a.id, "newer", t0 + 5000)]);
    const replaced = await heldNote(a);
    check("a later note replaces it", replaced?.text === "newer");
    check("a replaced note gets a later seq", Number(replaced?.seq) > Number(before?.seq));

    // Download order: rows uploaded later come after the cursor, whatever their own times.
    const firstSeq = (await visible(a.client, "reviews")).rows[0]?.seq;
    const offlineLastWeek = review(a.id, t0 - 7 * 24 * 3600 * 1000);
    await pushReviews(a.client, [offlineLastWeek]);
    const { data: page, error: pageError } = await a.client.from("reviews").select("id, seq").gt("seq", firstSeq).order("seq");
    check(
      "a review uploaded later is read after the cursor",
      !pageError && page.length === 1 && page[0].id === offlineLastWeek.id,
      pageError?.message ?? `${page?.length} rows`,
    );
  } finally {
    for (const user of users) await admin.auth.admin.deleteUser(user.id);
  }

  if (users.length === 2) {
    const left = await Promise.all(
      TABLES.map((table) => admin.from(table).select("*", { count: "exact", head: true }).in("user_id", users.map((u) => u.id))),
    );
    check("deleting the users removes their rows", left.every(({ count, error }) => !error && count === 0));
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`check-rls stopped: ${error.message ?? error}`);
  process.exit(1);
});

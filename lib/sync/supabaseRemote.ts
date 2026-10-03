// The Supabase implementation of `SyncRemote`. See docs/design.md, "Data in
// Supabase" and "Sync rules". Row-level security limits every call to the
// signed-in user's rows, and `user_id` is filled in by the database.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Direction, Rating, RemoteNote, RemoteReport, RemoteReview, Section } from "@/lib/store";
import type { RemotePage, SyncRemote } from "./remote";

/** Rows per download page. */
export const PULL_PAGE = 500;

interface ReviewRow {
  id: string;
  card_id: string;
  direction: Direction;
  rating: Rating;
  reviewed_at: string;
  section: Section;
  device_id: string;
  seq?: number | string;
}
interface NoteRow {
  card_id: string;
  text: string;
  updated_at: string;
  seq?: number | string;
}
interface ReportRow {
  id: string;
  card_id: string;
  comment: string | null;
  created_at: string;
}

const REVIEW_COLUMNS = "id, card_id, direction, rating, reviewed_at, section, device_id, seq";
const NOTE_COLUMNS = "card_id, text, updated_at, seq";

const iso = (ms: number) => new Date(ms).toISOString();
const ms = (time: string) => {
  const value = Date.parse(time);
  if (Number.isNaN(value)) throw new Error(`Unreadable time from the server: ${time}`);
  return value;
};

export const reviewToRow = (r: RemoteReview): ReviewRow => ({
  id: r.id,
  card_id: r.cardId,
  direction: r.direction,
  rating: r.rating,
  reviewed_at: iso(r.timestamp),
  section: r.section,
  device_id: r.deviceId,
});
export const rowToReview = (r: ReviewRow): RemoteReview => ({
  id: r.id,
  cardId: r.card_id,
  direction: r.direction,
  rating: r.rating,
  timestamp: ms(r.reviewed_at),
  section: r.section,
  deviceId: r.device_id,
});
export const noteToRow = (n: RemoteNote): NoteRow => ({ card_id: n.cardId, text: n.text, updated_at: iso(n.updatedAt) });
export const rowToNote = (n: NoteRow): RemoteNote => ({ cardId: n.card_id, text: n.text, updatedAt: ms(n.updated_at) });
export const reportToRow = (r: RemoteReport): ReportRow => ({
  id: r.id,
  card_id: r.cardId,
  comment: r.comment,
  created_at: iso(r.createdAt),
});

/** supabase-js reports failures in the answer rather than throwing; the sync core needs a throw. */
function check(error: { message: string; code?: string } | null, what: string): void {
  if (error) throw new SyncRequestError(`${what}: ${error.message}`, error.code);
}

export class SyncRequestError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "SyncRequestError";
  }
}

/** Turns a page of rows carrying `seq` into a `RemotePage`, the cursor being the last `seq`. */
function page<R extends { seq?: number | string }, T>(
  rows: R[],
  since: string | null,
  size: number,
  map: (row: R) => T,
): RemotePage<T> {
  const last = rows.at(-1)?.seq;
  return {
    rows: rows.map(map),
    cursor: last === undefined ? since : String(last),
    more: rows.length === size,
  };
}

export class SupabaseRemote implements SyncRemote {
  constructor(
    private readonly client: SupabaseClient,
    private readonly pageSize: number = PULL_PAGE,
  ) {}

  async pushReviews(rows: readonly RemoteReview[]): Promise<void> {
    if (rows.length === 0) return;
    const { error } = await this.client
      .from("reviews")
      .upsert(rows.map(reviewToRow), { onConflict: "user_id,id", ignoreDuplicates: true });
    check(error, "uploading reviews");
  }

  async pushNotes(rows: readonly RemoteNote[]): Promise<void> {
    if (rows.length === 0) return;
    // A trigger keeps the stored note when it is as late or later (see the migration).
    const { error } = await this.client.from("notes").upsert(rows.map(noteToRow), { onConflict: "user_id,card_id" });
    check(error, "uploading notes");
  }

  async pushReports(rows: readonly RemoteReport[]): Promise<void> {
    if (rows.length === 0) return;
    const { error } = await this.client
      .from("card_reports")
      .upsert(rows.map(reportToRow), { onConflict: "user_id,id", ignoreDuplicates: true });
    check(error, "uploading reports");
  }

  async pullReviews(since: string | null): Promise<RemotePage<RemoteReview>> {
    let query = this.client.from("reviews").select(REVIEW_COLUMNS);
    if (since !== null) query = query.gt("seq", since);
    const { data, error } = await query.order("seq").limit(this.pageSize);
    check(error, "downloading reviews");
    return page((data ?? []) as ReviewRow[], since, this.pageSize, rowToReview);
  }

  async pullNotes(since: string | null): Promise<RemotePage<RemoteNote>> {
    let query = this.client.from("notes").select(NOTE_COLUMNS);
    if (since !== null) query = query.gt("seq", since);
    const { data, error } = await query.order("seq").limit(this.pageSize);
    check(error, "downloading notes");
    return page((data ?? []) as NoteRow[], since, this.pageSize, rowToNote);
  }
}

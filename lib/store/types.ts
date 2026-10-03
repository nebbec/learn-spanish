// Row types for the IndexedDB stores. See docs/design.md, "Data on the device".

export const DIRECTIONS = ["forward", "reverse"] as const;
export type Direction = (typeof DIRECTIONS)[number];

/**
 * Every stored rating. `good`, `nearly` and `again` are the reveal's three buttons (green,
 * orange, red), named after the theme's rating colours. `known` is the intro's "I already
 * know this": Easy in FSRS, and green in summaries and colours. See "Intro, then test" in
 * docs/design.md.
 */
export const RATINGS = ["good", "nearly", "again", "known"] as const;
export type Rating = (typeof RATINGS)[number];

/** The ratings the reveal's buttons give. */
export type ButtonRating = Exclude<Rating, "known">;

export const SECTIONS = ["learn", "practice"] as const;
export type Section = (typeof SECTIONS)[number];

/** IndexedDB cannot index booleans, so the synced flag is stored as 0 or 1. */
export type SyncedFlag = 0 | 1;

/** One rating event. Append-only: a review is never edited or deleted. */
export interface Review {
  /** UUID. Sync merges reviews by union on this id. */
  id: string;
  cardId: string;
  direction: Direction;
  rating: Rating;
  /** Milliseconds since the Unix epoch. */
  timestamp: number;
  section: Section;
  deviceId: string;
  synced: SyncedFlag;
}

/** What a caller supplies to record a rating; the store fills in the rest. */
export interface NewReview {
  cardId: string;
  direction: Direction;
  rating: Rating;
  section: Section;
  /** Defaults to now. */
  timestamp?: number;
}

/**
 * Scheduler state for one card: a cache derived by replaying forward reviews.
 * The store only requires the key; the scheduler (B2) owns the other fields.
 */
export interface CardStateRow {
  cardId: string;
}

/** One note per card. */
export interface Note {
  cardId: string;
  text: string;
  /** Milliseconds since the Unix epoch. The latest edit wins in sync. */
  updatedAt: number;
  synced: SyncedFlag;
}

/** A "something's off" report on a card. */
export interface Report {
  /** UUID. */
  id: string;
  cardId: string;
  comment: string | null;
  /** Milliseconds since the Unix epoch. */
  createdAt: number;
  synced: SyncedFlag;
}

/**
 * One "Start over" (L15). Reviews at or before the latest reset no longer count for
 * card state, the queues, the wheel or Struggling; they stay stored and synced, as
 * reviews are append-only. Resets sync like reviews (L16), so a reset on one device
 * clears progress on every device of the account. See "Reset" in docs/design.md.
 */
export interface Reset {
  /** UUID. */
  id: string;
  /** Milliseconds since the Unix epoch. */
  resetAt: number;
  deviceId: string;
  synced: SyncedFlag;
}

export interface Unsynced {
  reviews: Review[];
  notes: Note[];
  reports: Report[];
  resets: Reset[];
}

export interface ReviewFilter {
  cardId?: string;
  direction?: Direction;
}

/** A row as the server holds it: the same fields without the device's synced flag. */
export type RemoteReview = Omit<Review, "synced">;
export type RemoteNote = Omit<Note, "synced">;
export type RemoteReport = Omit<Report, "synced">;
export type RemoteReset = Omit<Reset, "synced">;

/** The kinds of row a device downloads. Reports only go up. */
export type SyncTable = "reviews" | "notes" | "resets";

/** How far this device has read the server's rows of one kind. */
export interface SyncStateRow {
  key: SyncTable;
  /** The server's own marker, passed back unchanged on the next download. */
  cursor: string;
}

/** The account the synced flags and cursors refer to (D6). Kept in `sync_state` too. */
export interface SyncAccountRow {
  key: "account";
  userId: string;
}

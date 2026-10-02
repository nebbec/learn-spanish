// The server as the sync core sees it. See docs/design.md, "Sync rules".
// D6 writes the Supabase implementation; tests use `FakeRemote`.

import type { RemoteNote, RemoteReport, RemoteReview } from "@/lib/store";

/** One page of a download. */
export interface RemotePage<T> {
  rows: T[];
  /**
   * The server's marker for the end of this page, passed back as `since` to get
   * what follows. Null only when there was nothing to read and no marker yet.
   */
  cursor: string | null;
  /** True when rows remain after this page. */
  more: boolean;
}

/**
 * One signed-in user's rows on the server.
 *
 * Every push is safe to repeat: sending a row the server already has changes
 * nothing. A call that fails must throw, and must not have stored half a batch
 * in a way a repeat would not finish.
 *
 * The download cursor has to follow the order rows reached the server, not
 * their own timestamps: a review made offline last week arrives after one made
 * online today, and a device that already read today's must still get it.
 */
export interface SyncRemote {
  /** Stores the reviews it does not have yet. A review is never changed. */
  pushReviews(rows: readonly RemoteReview[]): Promise<void>;
  /**
   * Stores each note unless the server's note for that card has the same or a
   * later `updatedAt`: the latest edit wins, and on a tie the one already there.
   */
  pushNotes(rows: readonly RemoteNote[]): Promise<void>;
  /** Stores the reports it does not have yet. */
  pushReports(rows: readonly RemoteReport[]): Promise<void>;
  /** Reviews that reached the server after `since`, from every device; all of them when null. */
  pullReviews(since: string | null): Promise<RemotePage<RemoteReview>>;
  /** Notes stored or replaced on the server after `since`; all of them when null. */
  pullNotes(since: string | null): Promise<RemotePage<RemoteNote>>;
}

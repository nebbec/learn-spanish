// Sync core: upload what this device recorded, download what the others did,
// then rebuild card state. See docs/design.md, "Sync rules".

import { replayReviews } from "@/lib/scheduler";
import type { LocalStore, Note, RemoteNote, RemoteReport, RemoteReview, Report, Review } from "@/lib/store";
import type { RemotePage, SyncRemote } from "./remote";

/** Rows sent per request, so one upload after a long time offline stays small. */
export const UPLOAD_CHUNK = 200;

export interface SyncResult {
  uploaded: { reviews: number; notes: number; reports: number };
  /** Rows this device did not have before. Its own rows coming back are not counted. */
  downloaded: { reviews: number; notes: number };
  /** True when card state was rebuilt, so screens showing progress should reload. */
  replayed: boolean;
}

function chunks<T>(rows: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

const toRemoteReview = (r: Review): RemoteReview => ({
  id: r.id,
  cardId: r.cardId,
  direction: r.direction,
  rating: r.rating,
  timestamp: r.timestamp,
  section: r.section,
  deviceId: r.deviceId,
});
const toRemoteNote = (n: Note): RemoteNote => ({ cardId: n.cardId, text: n.text, updatedAt: n.updatedAt });
const toRemoteReport = (r: Report): RemoteReport => ({
  id: r.id,
  cardId: r.cardId,
  comment: r.comment,
  createdAt: r.createdAt,
});

/** Reads pages until the server says there are no more, merging each as it arrives. */
async function download<T>(
  start: string | null,
  pull: (since: string | null) => Promise<RemotePage<T>>,
  merge: (rows: T[], cursor: string | null) => Promise<unknown[]>,
): Promise<number> {
  let since = start;
  let count = 0;
  for (;;) {
    const page = await pull(since);
    count += (await merge(page.rows, page.cursor)).length;
    // A page that does not move the cursor would be asked for again for ever.
    if (!page.more || page.cursor === null || page.cursor === since) return count;
    since = page.cursor;
  }
}

/**
 * One full sync of this device with the server.
 *
 * Uploads unsynced reviews, notes and reports, downloads reviews and notes from
 * other devices, and, if any forward review arrived, replays every review into
 * the card-state cache.
 *
 * It throws if the server cannot be reached or refuses a request. Nothing is
 * lost when it does: rows are marked synced only after the server took them,
 * and the download carries on from the last page that was merged. Running it
 * again, or twice at once, is safe.
 */
export async function sync(store: LocalStore, remote: SyncRemote): Promise<SyncResult> {
  const result: SyncResult = {
    uploaded: { reviews: 0, notes: 0, reports: 0 },
    downloaded: { reviews: 0, notes: 0 },
    replayed: false,
  };

  const unsynced = await store.listUnsynced();
  for (const reviews of chunks(unsynced.reviews, UPLOAD_CHUNK)) {
    await remote.pushReviews(reviews.map(toRemoteReview));
    await store.markSynced({ reviews });
    result.uploaded.reviews += reviews.length;
  }
  for (const notes of chunks(unsynced.notes, UPLOAD_CHUNK)) {
    await remote.pushNotes(notes.map(toRemoteNote));
    // A note edited since `listUnsynced` keeps its flag and goes up next time.
    await store.markSynced({ notes });
    result.uploaded.notes += notes.length;
  }
  for (const reports of chunks(unsynced.reports, UPLOAD_CHUNK)) {
    await remote.pushReports(reports.map(toRemoteReport));
    await store.markSynced({ reports });
    result.uploaded.reports += reports.length;
  }

  // Card state is rebuilt even when a later page fails, so the cache never
  // lags behind reviews that were already merged.
  let forwardArrived = false;
  try {
    result.downloaded.reviews = await download(
      await store.getSyncCursor("reviews"),
      (since) => remote.pullReviews(since),
      async (rows, cursor) => {
        const added = await store.mergeReviews(rows, cursor);
        forwardArrived ||= added.some((r) => r.direction === "forward");
        return added;
      },
    );
  } finally {
    if (forwardArrived) {
      await rebuildCardStates(store);
      result.replayed = true;
    }
  }

  result.downloaded.notes = await download(
    await store.getSyncCursor("notes"),
    (since) => remote.pullNotes(since),
    (rows, cursor) => store.mergeNotes(rows, cursor),
  );
  return result;
}

/** Replaces the card-state cache with a replay of the reviews since the latest reset. */
export async function rebuildCardStates(store: LocalStore): Promise<void> {
  const states = replayReviews(await store.getReviewsSinceReset());
  await store.replaceCardStates([...states.values()]);
}

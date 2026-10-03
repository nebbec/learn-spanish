import Dexie, { type DexieOptions, type Table } from "dexie";
import type {
  CardStateRow,
  NewReview,
  Note,
  RemoteNote,
  RemoteReview,
  Report,
  Reset,
  Review,
  ReviewFilter,
  SyncAccountRow,
  SyncStateRow,
  SyncTable,
  Unsynced,
} from "./types";
import { sinceLatestReset } from "./reset";

export const DB_NAME = "learn-spanish";
const DEVICE_ID_KEY = "learn-spanish.device-id";

class LocalDb extends Dexie {
  reviews!: Table<Review, string>;
  card_state!: Table<CardStateRow, string>;
  notes!: Table<Note, string>;
  reports!: Table<Report, string>;
  sync_state!: Table<SyncStateRow | SyncAccountRow, string>;
  resets!: Table<Reset, string>;

  constructor(name: string, options?: DexieOptions) {
    super(name, options);
    // Only indexed fields are listed; the first is the primary key.
    this.version(1).stores({
      reviews: "id, cardId, timestamp, synced",
      card_state: "cardId",
      notes: "cardId, synced",
      reports: "id, cardId, synced",
    });
    // Version 2 (D5) adds the download cursors. The four stores above are unchanged.
    this.version(2).stores({ sync_state: "key" });
    // Version 3 (L15) adds the resets ("Start over"). The other stores are unchanged.
    this.version(3).stores({ resets: "id, resetAt, synced" });
  }
}

export interface LocalStoreOptions {
  /** Database name. Defaults to `DB_NAME`. */
  name?: string;
  /** Written on every review. Defaults to `getDeviceId()`. */
  deviceId?: string;
  /** An IndexedDB implementation other than the global one, for tests. */
  indexedDB?: IDBFactory;
  IDBKeyRange?: typeof IDBKeyRange;
}

let memoryDeviceId: string | null = null;

/**
 * A random id for this browser, created on first use and kept in localStorage.
 * Where localStorage is unavailable the id lasts only as long as the page.
 */
export function getDeviceId(): string {
  if (memoryDeviceId) return memoryDeviceId;
  let id: string | null = null;
  try {
    id = globalThis.localStorage?.getItem(DEVICE_ID_KEY) ?? null;
    if (!id) {
      id = crypto.randomUUID();
      globalThis.localStorage?.setItem(DEVICE_ID_KEY, id);
    }
  } catch {
    // Storage is blocked (private mode, disabled site data): keep the id in memory.
    id ??= crypto.randomUUID();
  }
  memoryDeviceId = id;
  return id;
}

/** Oldest first; the id breaks ties so the order never depends on storage order. */
function byTimeThenId(a: Review, b: Review): number {
  return a.timestamp - b.timestamp || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** The device's study data. All timestamps are milliseconds since the Unix epoch. */
export class LocalStore {
  private readonly db: LocalDb;
  private readonly deviceIdOption: string | undefined;

  constructor(options: LocalStoreOptions = {}) {
    const { name = DB_NAME, deviceId, indexedDB, IDBKeyRange } = options;
    this.db = new LocalDb(name, indexedDB ? { indexedDB, IDBKeyRange } : undefined);
    this.deviceIdOption = deviceId;
  }

  get deviceId(): string {
    return this.deviceIdOption ?? getDeviceId();
  }

  // Reviews

  /** Records one rating as a new, unsynced event. */
  async appendReview(input: NewReview): Promise<Review> {
    const review: Review = {
      id: crypto.randomUUID(),
      cardId: input.cardId,
      direction: input.direction,
      rating: input.rating,
      timestamp: input.timestamp ?? Date.now(),
      section: input.section,
      deviceId: this.deviceId,
      synced: 0,
    };
    // add, not put: reviews are append-only, so an id collision must fail.
    await this.db.reviews.add(review);
    return review;
  }

  /** Reviews oldest first, optionally for one card or one direction. */
  async getReviews(filter: ReviewFilter = {}): Promise<Review[]> {
    const { cardId, direction } = filter;
    const rows =
      cardId === undefined
        ? await this.db.reviews.toArray()
        : await this.db.reviews.where("cardId").equals(cardId).toArray();
    const kept = direction === undefined ? rows : rows.filter((r) => r.direction === direction);
    return kept.sort(byTimeThenId);
  }

  /**
   * The reviews that count for state: those made after the latest reset, oldest first.
   * Replay, the queues, the wheel, Struggling and media keeping read these, never
   * `getReviews`, which returns every stored review.
   */
  async getReviewsSinceReset(filter: ReviewFilter = {}): Promise<Review[]> {
    const { reviews, resets } = this.db;
    return this.db.transaction("r", reviews, resets, async () =>
      sinceLatestReset(await this.getReviews(filter), await resets.toArray()),
    );
  }

  // Resets

  /**
   * "Start over": records a reset as a new, unsynced row and empties the card-state
   * cache, since no review counts any more. Reviews, notes and reports are kept.
   */
  async startOver(at: number = Date.now()): Promise<Reset> {
    const reset: Reset = { id: crypto.randomUUID(), resetAt: at, deviceId: this.deviceId, synced: 0 };
    const { resets, card_state } = this.db;
    await this.db.transaction("rw", resets, card_state, async () => {
      await resets.add(reset);
      await card_state.clear();
    });
    return reset;
  }

  /** Resets oldest first. */
  async getResets(): Promise<Reset[]> {
    const rows = await this.db.resets.toArray();
    return rows.sort((a, b) => a.resetAt - b.resetAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  // Card state

  async getCardState<T extends CardStateRow = CardStateRow>(cardId: string): Promise<T | undefined> {
    return (await this.db.card_state.get(cardId)) as T | undefined;
  }

  async getAllCardStates<T extends CardStateRow = CardStateRow>(): Promise<T[]> {
    return (await this.db.card_state.toArray()) as T[];
  }

  async putCardState<T extends CardStateRow>(state: T): Promise<void> {
    await this.db.card_state.put(state);
  }

  /** Swaps the whole cache for the result of a fresh replay. */
  async replaceCardStates<T extends CardStateRow>(states: T[]): Promise<void> {
    await this.db.transaction("rw", this.db.card_state, async () => {
      await this.db.card_state.clear();
      await this.db.card_state.bulkPut(states);
    });
  }

  // Notes

  /** Creates or overwrites the card's note and marks it unsynced. */
  async saveNote(cardId: string, text: string, updatedAt: number = Date.now()): Promise<Note> {
    const note: Note = { cardId, text, updatedAt, synced: 0 };
    await this.db.notes.put(note);
    return note;
  }

  async getNote(cardId: string): Promise<Note | undefined> {
    return this.db.notes.get(cardId);
  }

  async getNotes(): Promise<Note[]> {
    return this.db.notes.toArray();
  }

  // Reports

  async addReport(cardId: string, comment?: string | null, createdAt: number = Date.now()): Promise<Report> {
    const trimmed = comment?.trim();
    const report: Report = {
      id: crypto.randomUUID(),
      cardId,
      comment: trimmed ? trimmed : null,
      createdAt,
      synced: 0,
    };
    await this.db.reports.add(report);
    return report;
  }

  /** Reports oldest first. */
  async getReports(): Promise<Report[]> {
    const rows = await this.db.reports.toArray();
    return rows.sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));
  }

  // Sync bookkeeping

  /** Every row not yet uploaded, from one consistent snapshot. */
  async listUnsynced(): Promise<Unsynced> {
    const { reviews, notes, reports } = this.db;
    return this.db.transaction("r", reviews, notes, reports, async () => ({
      reviews: (await reviews.where("synced").equals(0).toArray()).sort(byTimeThenId),
      notes: await notes.where("synced").equals(0).toArray(),
      reports: await reports.where("synced").equals(0).sortBy("createdAt"),
    }));
  }

  /**
   * Marks uploaded rows as synced. Pass back the rows `listUnsynced` returned:
   * a note edited since then has a newer `updatedAt` and stays unsynced.
   */
  async markSynced(uploaded: Partial<Unsynced>): Promise<void> {
    const { reviews, notes, reports } = this.db;
    await this.db.transaction("rw", reviews, notes, reports, async () => {
      await reviews
        .where("id")
        .anyOf((uploaded.reviews ?? []).map((r) => r.id))
        .modify({ synced: 1 });
      await reports
        .where("id")
        .anyOf((uploaded.reports ?? []).map((r) => r.id))
        .modify({ synced: 1 });
      for (const sent of uploaded.notes ?? []) {
        await notes
          .where("cardId")
          .equals(sent.cardId)
          .and((n) => n.updatedAt === sent.updatedAt)
          .modify({ synced: 1 });
      }
    });
  }

  // Rows from other devices

  /**
   * Adds downloaded reviews this device does not have yet, as synced rows, and
   * returns the ones it added. A review already here is left as it is: reviews
   * merge by union on id. `cursor`, when given, is saved in the same transaction,
   * so a download cut short never skips or loses a page.
   */
  async mergeReviews(rows: readonly RemoteReview[], cursor?: string | null): Promise<Review[]> {
    const { reviews, sync_state } = this.db;
    return this.db.transaction("rw", reviews, sync_state, async () => {
      const unique = [...new Map(rows.map((r) => [r.id, r])).values()];
      const existing = await reviews.bulkGet(unique.map((r) => r.id));
      const added = unique
        .filter((_, i) => existing[i] === undefined)
        .map((r): Review => ({
          id: r.id,
          cardId: r.cardId,
          direction: r.direction,
          rating: r.rating,
          timestamp: r.timestamp,
          section: r.section,
          deviceId: r.deviceId,
          synced: 1,
        }));
      await reviews.bulkAdd(added);
      if (cursor != null) await sync_state.put({ key: "reviews", cursor });
      return added;
    });
  }

  /**
   * Takes each downloaded note unless this device holds a later edit, and returns
   * the notes it changed. On equal times the server's copy wins, so every device
   * ends on the same text. `cursor` is saved in the same transaction.
   */
  async mergeNotes(rows: readonly RemoteNote[], cursor?: string | null): Promise<Note[]> {
    const { notes, sync_state } = this.db;
    return this.db.transaction("rw", notes, sync_state, async () => {
      const changed: Note[] = [];
      for (const row of rows) {
        const local = await notes.get(row.cardId);
        if (local && local.updatedAt > row.updatedAt) continue;
        if (local && local.updatedAt === row.updatedAt && local.text === row.text && local.synced === 1) {
          continue;
        }
        const note: Note = { cardId: row.cardId, text: row.text, updatedAt: row.updatedAt, synced: 1 };
        await notes.put(note);
        changed.push(note);
      }
      if (cursor != null) await sync_state.put({ key: "notes", cursor });
      return changed;
    });
  }

  /** Where the last download of this kind of row stopped, or null before the first. */
  async getSyncCursor(table: SyncTable): Promise<string | null> {
    const row = await this.db.sync_state.get(table);
    return row && "cursor" in row ? row.cursor : null;
  }

  /** The account this device last synced with, or null before the first sync. */
  async getSyncAccount(): Promise<string | null> {
    const row = await this.db.sync_state.get("account");
    return row && "userId" in row ? row.userId : null;
  }

  /**
   * Makes the synced flags and cursors refer to `userId` before a sync. When the
   * device last synced with another account, every row is marked unsynced and
   * both cursors are dropped, so the next sync uploads everything on the device
   * to this account and downloads all of its rows. Nothing is deleted. Returns
   * true when the rows had been synced with a different account.
   */
  async bindSyncAccount(userId: string): Promise<boolean> {
    const { reviews, notes, reports, sync_state } = this.db;
    return this.db.transaction("rw", [reviews, notes, reports, sync_state], async () => {
      const row = await sync_state.get("account");
      const current = row && "userId" in row ? row.userId : null;
      if (current === userId) return false;
      await reviews.where("synced").equals(1).modify({ synced: 0 });
      await notes.where("synced").equals(1).modify({ synced: 0 });
      await reports.where("synced").equals(1).modify({ synced: 0 });
      await sync_state.bulkDelete(["reviews", "notes"]);
      await sync_state.put({ key: "account", userId });
      return current !== null;
    });
  }

  // Lifecycle

  close(): void {
    this.db.close();
  }

  /** Deletes the database and everything in it. */
  async destroy(): Promise<void> {
    await this.db.delete();
  }
}

let shared: LocalStore | null = null;

/** The app's one store. Opens lazily, so importing this on the server is safe. */
export function localStore(): LocalStore {
  shared ??= new LocalStore();
  return shared;
}

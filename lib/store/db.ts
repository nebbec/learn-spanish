import Dexie, { type DexieOptions, type Table } from "dexie";
import type {
  CardStateRow,
  NewReview,
  Note,
  Report,
  Review,
  ReviewFilter,
  Unsynced,
} from "./types";

export const DB_NAME = "learn-spanish";
const DEVICE_ID_KEY = "learn-spanish.device-id";

class LocalDb extends Dexie {
  reviews!: Table<Review, string>;
  card_state!: Table<CardStateRow, string>;
  notes!: Table<Note, string>;
  reports!: Table<Report, string>;

  constructor(name: string, options?: DexieOptions) {
    super(name, options);
    // Only indexed fields are listed; the first is the primary key.
    this.version(1).stores({
      reviews: "id, cardId, timestamp, synced",
      card_state: "cardId",
      notes: "cardId, synced",
      reports: "id, cardId, synced",
    });
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

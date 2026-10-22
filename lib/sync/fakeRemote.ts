// An in-memory server for tests: one user's rows, shared by every simulated device.
// Like the real tables, every row belongs to a language (docs/german.md, "Data"): a
// FakeRemote uploads its rows as its language and downloads only that language's.
// `forLang` gives another language's view of the same server, as the Spanish and
// German apps share one account.

import { LANG, type LangCode } from "@/lang";
import type { RemoteNote, RemoteReport, RemoteReset, RemoteReview } from "@/lib/store";
import type { RemotePage, SyncRemote } from "./remote";

interface Stored<T> {
  /** The order the row reached the server, one count across tables and languages. A replaced note gets a new one. */
  seq: number;
  lang: LangCode;
  row: T;
}

/** What every language's view shares. */
class FakeServer {
  seq = 0;
  readonly reviews = new Map<string, Stored<RemoteReview>>();
  /** Keyed by language and card, as the notes table is. */
  readonly notes = new Map<string, Stored<RemoteNote>>();
  readonly reports = new Map<string, Stored<RemoteReport>>();
  readonly resets = new Map<string, Stored<RemoteReset>>();
}

export interface FakeRemoteOptions {
  /** Rows per download page. Defaults to 100. */
  pageSize?: number;
  /** The language this view uploads and downloads. Defaults to this build's. */
  lang?: LangCode;
}

export class FakeRemote implements SyncRemote {
  /** While true every call throws, as with no connection. */
  offline = false;
  /** How many more push calls succeed before one throws. Null for no limit. */
  failPushAfter: number | null = null;
  /** The name of every call made through this view, in order. */
  readonly calls: string[] = [];
  readonly lang: LangCode;

  private readonly pageSize: number;
  private readonly server: FakeServer;

  constructor(options: FakeRemoteOptions = {}, server: FakeServer = new FakeServer()) {
    this.pageSize = options.pageSize ?? 100;
    this.lang = options.lang ?? LANG.code;
    this.server = server;
  }

  /** The same server seen by a device of another language, with its own calls log and switches. */
  forLang(lang: LangCode): FakeRemote {
    return new FakeRemote({ pageSize: this.pageSize, lang }, this.server);
  }

  /** What the server holds in this view's language, in arrival order. */
  get reviews(): RemoteReview[] {
    return this.inOrder(this.server.reviews);
  }
  get notes(): RemoteNote[] {
    return this.inOrder(this.server.notes);
  }
  get reports(): RemoteReport[] {
    return this.inOrder(this.server.reports);
  }
  get resets(): RemoteReset[] {
    return this.inOrder(this.server.resets);
  }

  async pushReviews(rows: readonly RemoteReview[]): Promise<void> {
    this.beforePush("pushReviews");
    for (const row of rows) this.addOnce(this.server.reviews, row.id, row);
  }

  async pushNotes(rows: readonly RemoteNote[]): Promise<void> {
    this.beforePush("pushNotes");
    for (const row of rows) {
      const key = `${this.lang}:${row.cardId}`;
      const held = this.server.notes.get(key);
      if (held && held.row.updatedAt >= row.updatedAt) continue;
      this.server.notes.set(key, this.stored(row));
    }
  }

  async pushReports(rows: readonly RemoteReport[]): Promise<void> {
    this.beforePush("pushReports");
    for (const row of rows) this.addOnce(this.server.reports, row.id, row);
  }

  async pushResets(rows: readonly RemoteReset[]): Promise<void> {
    this.beforePush("pushResets");
    for (const row of rows) this.addOnce(this.server.resets, row.id, row);
  }

  async pullReviews(since: string | null): Promise<RemotePage<RemoteReview>> {
    this.begin("pullReviews");
    return this.page(this.server.reviews, since);
  }

  async pullNotes(since: string | null): Promise<RemotePage<RemoteNote>> {
    this.begin("pullNotes");
    return this.page(this.server.notes, since);
  }

  async pullResets(since: string | null): Promise<RemotePage<RemoteReset>> {
    this.begin("pullResets");
    return this.page(this.server.resets, since);
  }

  private begin(call: string): void {
    this.calls.push(call);
    if (this.offline) throw new Error("FakeRemote is offline");
  }

  private beforePush(call: string): void {
    this.begin(call);
    if (this.failPushAfter === null) return;
    if (this.failPushAfter === 0) throw new Error("FakeRemote refused the upload");
    this.failPushAfter -= 1;
  }

  private stored<T>(row: T): Stored<T> {
    return { seq: ++this.server.seq, lang: this.lang, row: { ...row } };
  }

  /** Reviews, reports and resets are keyed by their UUID alone, whatever their language, as on the server. */
  private addOnce<T>(rows: Map<string, Stored<T>>, id: string, row: T): void {
    if (!rows.has(id)) rows.set(id, this.stored(row));
  }

  private mine<T>(rows: Map<string, Stored<T>>): Stored<T>[] {
    return [...rows.values()].filter((s) => s.lang === this.lang).sort((a, b) => a.seq - b.seq);
  }

  private inOrder<T>(rows: Map<string, Stored<T>>): T[] {
    return this.mine(rows).map((s) => ({ ...s.row }));
  }

  private page<T>(rows: Map<string, Stored<T>>, since: string | null): RemotePage<T> {
    const after = since === null ? 0 : Number(since);
    const pending = this.mine(rows).filter((s) => s.seq > after);
    const taken = pending.slice(0, this.pageSize);
    const last = taken[taken.length - 1];
    return {
      rows: taken.map((s) => ({ ...s.row })),
      cursor: last ? String(last.seq) : since,
      more: pending.length > taken.length,
    };
  }
}

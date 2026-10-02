// An in-memory server for tests: one user's rows, shared by every simulated device.

import type { RemoteNote, RemoteReport, RemoteReview } from "@/lib/store";
import type { RemotePage, SyncRemote } from "./remote";

interface Stored<T> {
  /** The order the row reached the server. A replaced note gets a new one. */
  seq: number;
  row: T;
}

export interface FakeRemoteOptions {
  /** Rows per download page. Defaults to 100. */
  pageSize?: number;
}

export class FakeRemote implements SyncRemote {
  /** While true every call throws, as with no connection. */
  offline = false;
  /** How many more push calls succeed before one throws. Null for no limit. */
  failPushAfter: number | null = null;
  /** The name of every call made, in order. */
  readonly calls: string[] = [];

  private seq = 0;
  private readonly pageSize: number;
  private readonly reviewRows = new Map<string, Stored<RemoteReview>>();
  private readonly noteRows = new Map<string, Stored<RemoteNote>>();
  private readonly reportRows = new Map<string, Stored<RemoteReport>>();

  constructor(options: FakeRemoteOptions = {}) {
    this.pageSize = options.pageSize ?? 100;
  }

  /** What the server holds, in arrival order. */
  get reviews(): RemoteReview[] {
    return this.inOrder(this.reviewRows);
  }
  get notes(): RemoteNote[] {
    return this.inOrder(this.noteRows);
  }
  get reports(): RemoteReport[] {
    return this.inOrder(this.reportRows);
  }

  async pushReviews(rows: readonly RemoteReview[]): Promise<void> {
    this.beforePush("pushReviews");
    for (const row of rows) {
      if (!this.reviewRows.has(row.id)) this.reviewRows.set(row.id, { seq: ++this.seq, row: { ...row } });
    }
  }

  async pushNotes(rows: readonly RemoteNote[]): Promise<void> {
    this.beforePush("pushNotes");
    for (const row of rows) {
      const held = this.noteRows.get(row.cardId);
      if (held && held.row.updatedAt >= row.updatedAt) continue;
      this.noteRows.set(row.cardId, { seq: ++this.seq, row: { ...row } });
    }
  }

  async pushReports(rows: readonly RemoteReport[]): Promise<void> {
    this.beforePush("pushReports");
    for (const row of rows) {
      if (!this.reportRows.has(row.id)) this.reportRows.set(row.id, { seq: ++this.seq, row: { ...row } });
    }
  }

  async pullReviews(since: string | null): Promise<RemotePage<RemoteReview>> {
    this.begin("pullReviews");
    return this.page(this.reviewRows, since);
  }

  async pullNotes(since: string | null): Promise<RemotePage<RemoteNote>> {
    this.begin("pullNotes");
    return this.page(this.noteRows, since);
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

  private inOrder<T>(rows: Map<string, Stored<T>>): T[] {
    return [...rows.values()].sort((a, b) => a.seq - b.seq).map((s) => ({ ...s.row }));
  }

  private page<T>(rows: Map<string, Stored<T>>, since: string | null): RemotePage<T> {
    const after = since === null ? 0 : Number(since);
    const pending = [...rows.values()].filter((s) => s.seq > after).sort((a, b) => a.seq - b.seq);
    const taken = pending.slice(0, this.pageSize);
    const last = taken[taken.length - 1];
    return {
      rows: taken.map((s) => ({ ...s.row })),
      cursor: last ? String(last.seq) : since,
      more: pending.length > taken.length,
    };
  }
}

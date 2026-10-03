import Anthropic from "@anthropic-ai/sdk";
import { chmodSync, existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateDraftCard } from "@/lib/deck/validate";
import {
  apiRunner,
  cliArgs,
  cliEnv,
  cliRunner,
  readCliResult,
  type CallResult,
  type DraftRequest,
  type MessagesClient,
  type Runner,
} from "./claude";
import {
  DRAFT_SCHEMA,
  DraftStore,
  draftWords,
  formatSummary,
  guardDraft,
  parseWordList,
  slug,
  SYSTEM_PROMPT,
  type WordEntry,
} from "./drafting";

const tener: WordEntry = { rank: 13, word: "tener", forms: ["tengo", "tiene", "tener"] };
const casa: WordEntry = { rank: 90, word: "casa", forms: ["casa", "casas"] };
const de: WordEntry = { rank: 2, word: "de", forms: ["de"] };
const oh: WordEntry = { rank: 120, word: "oh", forms: ["oh"] };

const noGrammar = { gender: null, article: null, feminine: null, present: null, irregular: null };

function tenerCard(over: Record<string, unknown> = {}) {
  return {
    id: "tener-have",
    kind: "content",
    pos: "verb",
    es: "tener",
    en: "to have",
    hint: null,
    grammar: { ...noGrammar, present: { yo: "tengo", tu: "tienes", el: "tiene" }, irregular: true },
    example: { es: "Tengo dos hermanos.", en: "I have two brothers." },
    spain: null,
    trick: "TENER sounds like TENNER: you have a tenner in your pocket.",
    ...over,
  };
}

const answers: Record<string, unknown> = {
  tener: { skip: null, cards: [tenerCard()] },
  casa: {
    skip: null,
    cards: [
      {
        id: "casa-house",
        kind: "content",
        pos: "noun",
        es: "la casa",
        en: "house",
        hint: null,
        grammar: { ...noGrammar, gender: "f", article: "la" },
        example: { es: "Mi casa es pequeña.", en: "My house is small." },
        spain: null,
        trick: "CASA sounds like CASTLE: every house is your castle.",
      },
    ],
  },
  de: {
    skip: null,
    cards: [
      {
        id: "de-of",
        kind: "glue",
        pos: "preposition",
        es: "de",
        en: "the house [of] Maria",
        hint: null,
        grammar: noGrammar,
        example: { es: "Es la casa de María.", en: "It is Maria's house." },
        spain: null,
        trick: "DE sounds like the start of DEscended from.",
      },
    ],
  },
  oh: { skip: { reason: "interjection", note: "Same in English." }, cards: [] },
};

const usage = { input: 3, output: 500, cacheRead: 4000, cacheWrite: 1000, costUsd: 0.05, durationMs: 20, models: ["m"] };

/** Answers from `answers` by word; `script` can replace any call's result. */
function fakeRunner(script: Array<CallResult | undefined> = []) {
  const calls: DraftRequest[] = [];
  const runner: Runner = async (request) => {
    calls.push(request);
    const scripted = script[calls.length - 1];
    if (scripted) return scripted;
    const word = /^Rank \d+: (\S+)/.exec(request.prompt)![1];
    return { ok: true, output: structuredClone(answers[word]), usage };
  };
  return { runner, calls };
}

function setup() {
  const dir = mkdtempSync(path.join(tmpdir(), "drafts-test-"));
  const printed: string[] = [];
  const store = new DraftStore(dir);
  const options = {
    store,
    via: "cli",
    model: "claude-opus-5-5",
    effort: "medium" as const,
    print: (line: string) => printed.push(line),
    sleep: async () => {},
  };
  return { dir, store, printed, options };
}

describe("word list", () => {
  it("reads the committed list, skipping comments and the header", () => {
    const words = parseWordList(readFileSync(path.join(__dirname, "../../content/word-list.tsv"), "utf8"));
    expect(words).toHaveLength(1200);
    expect(words[0]).toEqual({ rank: 1, word: "el", forms: ["la", "el", "los", "las"] });
  });

  it("slugs words for ids", () => {
    expect(slug("qué")).toBe("que");
    expect(slug("año")).toBe("ano");
  });
});

describe("output guard", () => {
  it("turns an answer into valid cards with media paths from the id", () => {
    const result = guardDraft(answers.casa, casa);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [card] = result.cards;
    expect(validateDraftCard(card).ok).toBe(true);
    expect(card).toMatchObject({ rank: 90, grammar: { gender: "f", article: "la" }, image: "/deck/img/casa-house.webp" });
    expect(card.audio.word).toBe("/deck/audio/casa-house.word.mp3");
  });

  it("keeps only the grammar the part of speech uses", () => {
    const glue = guardDraft(answers.de, de);
    expect(glue.ok && glue.cards[0].grammar).toBeNull();
    const verb = guardDraft(answers.tener, tener);
    expect(verb.ok && verb.cards[0].grammar).toEqual({ present: { yo: "tengo", tu: "tienes", el: "tiene" }, irregular: true });
  });

  it("strips wrapping quotes and a heading marker, but not quotes inside", () => {
    const result = guardDraft(
      { skip: null, cards: [tenerCard({ en: '"to have"', es: "# tener", trick: '"TENER" sounds like "TENNER"' })] },
      tener,
    );
    expect(result.ok && result.cards[0]).toMatchObject({ en: "to have", es: "tener", trick: '"TENER" sounds like "TENNER"' });
  });

  it("names the failing fields and never their contents", () => {
    const result = guardDraft(
      {
        skip: null,
        cards: [tenerCard({ id: "have-tener", example: { es: "Tengo.\nTienes.", en: "x" }, grammar: noGrammar })],
      },
      tener,
    );
    expect(result).toEqual({
      ok: false,
      kind: "invalid",
      fields: ["example.es", "grammar.irregular", "grammar.present.el", "grammar.present.tu", "grammar.present.yo", "id"],
    });
  });

  it("refuses two cards with the same prompt, and a glue prompt without a target", () => {
    expect(guardDraft({ skip: null, cards: [tenerCard(), tenerCard({ id: "tener-own" })] }, tener)).toMatchObject({
      ok: false,
      fields: ["en"],
    });
    const glue = (answers.de as { cards: object[] }).cards[0];
    expect(guardDraft({ skip: null, cards: [{ ...glue, en: "the house of Maria" }] }, de)).toMatchObject({ fields: ["en"] });
  });

  it("accepts a skip only with no cards", () => {
    expect(guardDraft(answers.oh, oh)).toEqual({
      ok: true,
      cards: [],
      skip: { reason: "interjection", note: "Same in English." },
    });
    expect(guardDraft({ skip: { reason: "interjection", note: "" }, cards: [tenerCard()] }, tener).ok).toBe(false);
    expect(guardDraft({ skip: null, cards: [] }, tener).ok).toBe(false);
    expect(guardDraft("not json", tener)).toEqual({ ok: false, kind: "shape", fields: [] });
  });
});

describe("draft run", () => {
  it("writes one file per card and per word, and prints only ids and counts", async () => {
    const { dir, store, printed, options } = setup();
    const { runner, calls } = fakeRunner();
    const summary = await draftWords([de, tener, casa, oh], { ...options, runner, concurrency: 3 });

    expect(summary).toMatchObject({ drafted: 3, skipped: 1, failed: 0, cards: 3, calls: 4, failedCalls: 0 });
    expect(summary.skipReasons).toEqual({ interjection: 1 });
    expect(summary.tokens).toEqual({ input: 12, output: 2000, cacheRead: 16000, cacheWrite: 4000 });
    expect(readdirSync(path.join(dir, "cards")).sort()).toEqual(["casa-house.json", "de-of.json", "tener-have.json"]);
    expect(readdirSync(path.join(dir, "words")).sort()).toEqual(["0002.json", "0013.json", "0090.json", "0120.json"]);
    expect(JSON.parse(readFileSync(path.join(dir, "words", "0013.json"), "utf8"))).toMatchObject({
      rank: 13,
      word: "tener",
      cards: ["tener-have"],
      skip: null,
      via: "cli",
      model: "claude-opus-5-5",
    });
    for (const card of store.cards()) expect(validateDraftCard(card).ok).toBe(true);
    expect(store.deckProblems()).toEqual([]);

    expect(calls[0]).toMatchObject({ system: SYSTEM_PROMPT, schema: DRAFT_SCHEMA, model: "claude-opus-5-5", effort: "medium" });
    expect(calls.map((c) => c.prompt)).toContain("Rank 13: tener\nCounted from: tengo, tiene, tener");

    const output = [...printed, ...formatSummary(summary, "cli")].join("\n");
    expect(output).toContain("#13 tener: tener-have");
    expect(output).toContain("#120 oh: skipped (interjection)");
    expect(output).toContain("Cards: 3 (1.00 per drafted word)");
    for (const body of ["to have", "Tengo dos hermanos", "TENNER", "la casa", "Same in English"]) {
      expect(output).not.toContain(body);
    }
    const log = readFileSync(store.logFile, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(log).toHaveLength(4);
    expect(log[0]).toMatchObject({ ok: true, error: null, input: 3, output: 500, cacheRead: 4000, costUsd: 0.05 });
    expect(JSON.stringify(log)).not.toContain("Tengo");
  });

  it("retries a refused answer and keeps it for a person to read", async () => {
    const { dir, printed, options } = setup();
    const bad: CallResult = { ok: true, output: { skip: null, cards: [tenerCard({ pos: "noun" })] }, usage };
    const { runner, calls } = fakeRunner([bad]);
    const summary = await draftWords([tener], { ...options, runner });
    expect(summary).toMatchObject({ drafted: 1, calls: 2, failedCalls: 1 });
    expect(calls).toHaveLength(2);
    expect(existsSync(path.join(dir, ".failed", "0013-1.json"))).toBe(true);
    expect(printed).toEqual(["#13 tener: tener-have"]);
  });

  it("resumes: a rerun drafts only the words that failed", async () => {
    const { options } = setup();
    const down: CallResult = { ok: false, error: "cli-error-success-529", usage: null };
    const first = fakeRunner([undefined, down, down, down]);
    const summary = await draftWords([de, tener], { ...options, runner: first.runner, concurrency: 1 });
    expect(summary).toMatchObject({ drafted: 1, failed: 1, calls: 4, failedCalls: 3 });

    const second = fakeRunner();
    const again = await draftWords([de, tener], { ...options, runner: second.runner });
    expect(again).toMatchObject({ alreadyDrafted: 1, drafted: 1, failed: 0, calls: 1 });
    expect(second.calls[0].prompt).toContain("tener");
  });

  it("stops starting calls after too many failures in a row", async () => {
    const { options } = setup();
    const down: CallResult = { ok: false, error: "timeout", usage: null };
    const { runner, calls } = fakeRunner(Array(10).fill(down));
    const summary = await draftWords([de, tener, casa], { ...options, runner, concurrency: 1, stopAfter: 4 });
    expect(calls).toHaveLength(4);
    expect(summary).toMatchObject({ stopped: true, failed: 2, notRun: 1, drafted: 0 });
    expect(formatSummary(summary, "cli").at(-1)).toMatch(/Stopped early/);
  });

  it("gives an id another word holds this word's rank, and replaces a word's cards on --redo", async () => {
    const { store, options } = setup();
    await draftWords([tener], { ...options, runner: fakeRunner().runner });
    const tenerAgain: WordEntry = { rank: 400, word: "tener", forms: [] };
    await draftWords([tenerAgain], { ...options, runner: fakeRunner().runner });
    expect([...store.index.keys()].sort()).toEqual(["tener-have", "tener-have-400"]);
    expect(store.cards().find((c) => c.id === "tener-have-400")?.image).toBe("/deck/img/tener-have-400.webp");

    const own: CallResult = { ok: true, output: { skip: null, cards: [tenerCard({ id: "tener-own", en: "to own" })] }, usage };
    await draftWords([tener], { ...options, runner: fakeRunner([own]).runner, redo: true });
    expect([...store.index.keys()].sort()).toEqual(["tener-have-400", "tener-own"]);
    expect(new DraftStore(store.dir).index.size).toBe(2);
  });
});

describe("CLI runner", () => {
  const request: DraftRequest = { system: "sys", prompt: "Rank 1: el", schema: { type: "object" }, model: "claude-opus-5-5", effort: "medium" };

  it("passes the agreed flags, and no API key or parent Claude Code variables", () => {
    const args = cliArgs(request);
    expect(args.slice(0, 2)).toEqual(["-p", "Rank 1: el"]);
    expect(args.join(" ")).toContain("--model claude-opus-5-5 --effort medium --system-prompt sys --tools  --json-schema");
    expect(args).toEqual(expect.arrayContaining(["--output-format", "json", "--no-session-persistence"]));
    expect(args).toContain("--safe-mode");
    expect(args).not.toContain("--bare");
    const env = cliEnv({ ANTHROPIC_API_KEY: "k", CLAUDECODE: "1", CLAUDE_CODE_ENTRYPOINT: "cli", HOME: "/h" } as unknown as NodeJS.ProcessEnv);
    expect(env).toEqual({ HOME: "/h" });
  });

  it("reads the structured output and the usage summed over models", () => {
    const result = readCliResult(
      JSON.stringify({
        is_error: false,
        stop_reason: "tool_use",
        structured_output: { skip: null, cards: [] },
        result: "ignored",
        total_cost_usd: 0.06,
        duration_ms: 2400,
        modelUsage: {
          "claude-opus-5-5": { inputTokens: 2, outputTokens: 73, cacheReadInputTokens: 10, cacheCreationInputTokens: 7587 },
        },
      }),
      9,
    );
    expect(result).toEqual({
      ok: true,
      output: { skip: null, cards: [] },
      usage: { input: 2, output: 73, cacheRead: 10, cacheWrite: 7587, costUsd: 0.06, durationMs: 2400, models: ["claude-opus-5-5"] },
    });
    expect(readCliResult("not json", 1)).toEqual({ ok: false, error: "cli-bad-json", usage: null });
    const failed = readCliResult(JSON.stringify({ is_error: true, subtype: "success", api_error_status: 429, result: "secret" }), 1);
    expect(failed).toMatchObject({ ok: false, error: "cli-error-success-429" });
    expect(readCliResult(JSON.stringify({ is_error: false, result: "{}" }), 1)).toMatchObject({ error: "no-structured-output" });
  });

  it("runs the binary from an empty directory outside the repo with stdin closed", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "fake-claude-"));
    const bin = path.join(dir, "claude");
    const record = path.join(dir, "record.json");
    writeFileSync(
      bin,
      `#!/usr/bin/env node
const fs = require("node:fs");
let stdin = "";
try { stdin = fs.readFileSync(0, "utf8"); } catch {}
fs.writeFileSync(process.env.FAKE_RECORD, JSON.stringify({
  cwd: process.cwd(), files: fs.readdirSync(process.cwd()), stdin, args: process.argv.slice(2),
  key: "ANTHROPIC_API_KEY" in process.env, nested: "CLAUDECODE" in process.env,
}));
console.log(JSON.stringify({ is_error: false, structured_output: { ok: 1 }, total_cost_usd: 0.01,
  modelUsage: { m: { inputTokens: 1, outputTokens: 2, cacheReadInputTokens: 3, cacheCreationInputTokens: 4 } } }));
`,
    );
    chmodSync(bin, 0o755);
    const env = { ...process.env, ANTHROPIC_API_KEY: "sk-test", CLAUDECODE: "1", FAKE_RECORD: record };
    const result = await cliRunner({ bin, env })(request);
    expect(result).toMatchObject({ ok: true, output: { ok: 1 }, usage: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 } });
    const seen = JSON.parse(readFileSync(record, "utf8"));
    expect(seen).toMatchObject({ files: [], stdin: "", key: false, nested: false });
    expect(seen.cwd).not.toContain(path.resolve(__dirname, "../.."));
    expect(existsSync(seen.cwd)).toBe(false);
    expect(seen.args).toEqual(cliArgs(request));

    expect(await cliRunner({ bin: path.join(dir, "missing") })(request)).toEqual({ ok: false, error: "cli-spawn", usage: null });
  });
});

describe("API runner", () => {
  const request: DraftRequest = { system: "sys", prompt: "Rank 1: el", schema: DRAFT_SCHEMA, model: "claude-opus-5-5", effort: "high" };

  function fakeClient(reply: Partial<Anthropic.Message> | Error) {
    const sent: Anthropic.MessageCreateParamsNonStreaming[] = [];
    const client: MessagesClient = {
      messages: {
        create: async (params) => {
          sent.push(params);
          if (reply instanceof Error) throw reply;
          return {
            model: "claude-opus-5-5",
            stop_reason: "end_turn",
            content: [],
            usage: { input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
            ...reply,
          } as unknown as Anthropic.Message;
        },
      },
    };
    return { client, sent };
  }

  it("asks for structured output at the given effort and reads the JSON", async () => {
    const { client, sent } = fakeClient({ content: [{ type: "text", text: '{"skip":null,"cards":[]}' }] as unknown as Anthropic.ContentBlock[] });
    const result = await apiRunner({ client })(request);
    expect(result).toMatchObject({ ok: true, output: { skip: null, cards: [] }, usage: { input: 1000, output: 500 } });
    // $4 per million input tokens and $20 per million output tokens.
    expect(result.usage?.costUsd).toBeCloseTo(0.014);
    expect(sent[0]).toMatchObject({
      model: "claude-opus-5-5",
      messages: [{ role: "user", content: "Rank 1: el" }],
      output_config: { effort: "high", format: { type: "json_schema", schema: DRAFT_SCHEMA } },
    });
    expect(sent[0]).not.toHaveProperty("thinking");
  });

  it("turns a refusal, a cut-off answer or an API error into an error kind", async () => {
    const refused = await apiRunner({ client: fakeClient({ stop_reason: "refusal" }).client })(request);
    expect(refused).toMatchObject({ ok: false, error: "stop-refusal" });
    const cut = await apiRunner({ client: fakeClient({ stop_reason: "max_tokens" }).client })(request);
    expect(cut).toMatchObject({ ok: false, error: "stop-max_tokens" });
    const limited = new Anthropic.RateLimitError(429, undefined, "slow down", new Headers());
    expect(await apiRunner({ client: fakeClient(limited).client })(request)).toEqual({ ok: false, error: "api-429", usage: null });
    expect(await apiRunner({ client: fakeClient(new Error("boom")).client })(request)).toEqual({
      ok: false,
      error: "api-error",
      usage: null,
    });
  });
});

// Two ways to ask Claude for one structured answer, behind the same Runner
// type: the Claude Code CLI on Courtney's Max plan (the default), or the API
// through @anthropic-ai/sdk (`--via api`, needs ANTHROPIC_API_KEY).
//
// Neither ever returns or logs Claude's text in an error: an error is a short
// kind such as "timeout" or "api-429". The rules are in docs/design.md under
// "Content pipeline", "Decided in E2".

import Anthropic from "@anthropic-ai/sdk";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const DEFAULT_MODEL = "claude-opus-5-5";
export const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type Effort = (typeof EFFORTS)[number];

export interface DraftRequest {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  model: string;
  effort: Effort;
}

export interface CallUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  /** What the call costs, or would cost, on the API. Null when the price is unknown. */
  costUsd: number | null;
  durationMs: number;
  /** The model ids that answered, as the response names them. */
  models: string[];
}

export type CallResult =
  | { ok: true; output: unknown; usage: CallUsage }
  | { ok: false; error: string; usage: CallUsage | null };

export type Runner = (request: DraftRequest) => Promise<CallResult>;

/** Variables a nested `claude` must not see: an API key would bill the API instead of the plan. */
export const CLI_ENV_REMOVED = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "CLAUDECODE",
  "CLAUDE_CODE_ENTRYPOINT",
];

export function cliArgs(request: DraftRequest): string[] {
  return [
    "-p",
    request.prompt,
    "--model",
    request.model,
    "--effort",
    request.effort,
    "--system-prompt",
    request.system,
    "--tools",
    "",
    "--json-schema",
    JSON.stringify(request.schema),
    "--output-format",
    "json",
    "--no-session-persistence",
    // No CLAUDE.md, plugins, hooks, MCP servers or skills from the user's setup.
    // Plugin hooks alone added about 3,500 uncached tokens to every call.
    "--safe-mode",
    "--strict-mcp-config",
    "--disable-slash-commands",
  ];
}

export function cliEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const clean = { ...env };
  for (const name of CLI_ENV_REMOVED) delete clean[name];
  return clean;
}

type Rec = Record<string, unknown>;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

/** Reads the token counts from the CLI's JSON result, summed over every model it used. */
export function cliUsage(result: Rec): CallUsage {
  const usage: CallUsage = {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    costUsd: typeof result.total_cost_usd === "number" ? result.total_cost_usd : null,
    durationMs: num(result.duration_ms),
    models: [],
  };
  if (isRec(result.modelUsage) && Object.keys(result.modelUsage).length > 0) {
    for (const [model, m] of Object.entries(result.modelUsage)) {
      if (!isRec(m)) continue;
      usage.models.push(model);
      usage.input += num(m.inputTokens);
      usage.output += num(m.outputTokens);
      usage.cacheRead += num(m.cacheReadInputTokens);
      usage.cacheWrite += num(m.cacheCreationInputTokens);
    }
  } else if (isRec(result.usage)) {
    usage.input = num(result.usage.input_tokens);
    usage.output = num(result.usage.output_tokens);
    usage.cacheRead = num(result.usage.cache_read_input_tokens);
    usage.cacheWrite = num(result.usage.cache_creation_input_tokens);
  }
  return usage;
}

/** Turns the CLI's stdout into a result. Exported for tests. */
export function readCliResult(stdout: string, durationMs: number): CallResult {
  let result: unknown;
  try {
    result = JSON.parse(stdout);
  } catch {
    return { ok: false, error: "cli-bad-json", usage: null };
  }
  if (!isRec(result)) return { ok: false, error: "cli-bad-json", usage: null };
  const usage = cliUsage(result);
  usage.durationMs ||= durationMs;
  if (result.is_error === true) {
    const status = typeof result.api_error_status === "number" ? `-${result.api_error_status}` : "";
    const subtype = typeof result.subtype === "string" ? `-${result.subtype}` : "";
    return { ok: false, error: `cli-error${subtype}${status}`, usage };
  }
  if (result.stop_reason === "max_tokens" || result.stop_reason === "refusal") {
    return { ok: false, error: `stop-${result.stop_reason}`, usage };
  }
  if (!("structured_output" in result) || result.structured_output == null) {
    return { ok: false, error: "no-structured-output", usage };
  }
  return { ok: true, output: result.structured_output, usage };
}

export interface CliRunnerOptions {
  bin?: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
}

/**
 * One `claude -p` call per request, run from a new empty directory outside the
 * repo (so no CLAUDE.md is read), with stdin closed, no tools and no saved session.
 */
export function cliRunner({ bin = "claude", timeoutMs = 600_000, env = process.env }: CliRunnerOptions = {}): Runner {
  return (request) =>
    new Promise((resolve) => {
      const cwd = mkdtempSync(path.join(tmpdir(), "learn-spanish-draft-"));
      const started = Date.now();
      const done = (result: CallResult) => {
        clearTimeout(timer);
        rmSync(cwd, { recursive: true, force: true });
        resolve(result);
      };
      const child = spawn(bin, cliArgs(request), {
        cwd,
        env: cliEnv(env),
        stdio: ["ignore", "pipe", "ignore"],
      });
      let stdout = "";
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
      }, timeoutMs);
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => (stdout += chunk));
      child.on("error", () => done({ ok: false, error: "cli-spawn", usage: null }));
      child.on("close", (code) => {
        if (timedOut) return done({ ok: false, error: "timeout", usage: null });
        const result = readCliResult(stdout, Date.now() - started);
        // A non-zero exit with a readable result keeps the result's own error kind.
        if (code !== 0 && result.ok) return done({ ok: false, error: `cli-exit-${code}`, usage: result.usage });
        done(result);
      });
    });
}

/** API prices in dollars per million tokens, for the notional cost of an API call. */
export const API_PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
};

/** The part of the SDK client the API runner uses, so tests can pass a fake. */
export interface MessagesClient {
  messages: {
    create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
  };
}

export interface ApiRunnerOptions {
  /** Defaults to `new Anthropic()`, which reads ANTHROPIC_API_KEY. */
  client?: MessagesClient;
  maxTokens?: number;
}

export function apiRunner({ client, maxTokens = 16_000 }: ApiRunnerOptions = {}): Runner {
  return async (request) => {
    client ??= new Anthropic();
    const started = Date.now();
    let message: Anthropic.Message;
    try {
      // Thinking is always on for Claude Opus 5.5; effort is how it is tuned.
      message = await client.messages.create({
        model: request.model,
        max_tokens: maxTokens,
        system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: request.prompt }],
        output_config: {
          effort: request.effort,
          format: { type: "json_schema", schema: request.schema },
        },
      });
    } catch (error) {
      const kind =
        error instanceof Anthropic.APIConnectionError
          ? "api-connection"
          : error instanceof Anthropic.APIError
            ? `api-${error.status ?? "error"}`
            : "api-error";
      return { ok: false, error: kind, usage: null };
    }

    const u = message.usage;
    const price = API_PRICES[message.model] ?? API_PRICES[request.model];
    const usage: CallUsage = {
      input: u.input_tokens,
      output: u.output_tokens,
      cacheRead: u.cache_read_input_tokens ?? 0,
      cacheWrite: u.cache_creation_input_tokens ?? 0,
      costUsd: null,
      durationMs: Date.now() - started,
      models: [message.model],
    };
    if (price) {
      usage.costUsd =
        (usage.input * price.input +
          usage.output * price.output +
          usage.cacheRead * price.cacheRead +
          usage.cacheWrite * price.cacheWrite) /
        1_000_000;
    }
    if (message.stop_reason !== "end_turn") {
      return { ok: false, error: `stop-${message.stop_reason ?? "none"}`, usage };
    }
    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    try {
      return { ok: true, output: JSON.parse(text), usage };
    } catch {
      return { ok: false, error: "api-bad-json", usage };
    }
  };
}

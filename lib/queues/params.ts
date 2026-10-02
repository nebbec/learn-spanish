// The Practice options as URL parameters: /practice?mode=shuffle&pos=verb&reverse=1.
// See docs/design.md, "Practice".

import { PARTS_OF_SPEECH, type PartOfSpeech } from "@/lib/deck/types";
import { ROUTES } from "@/lib/routes";
import { PRACTICE_MODES, type PracticeMode } from "./queues";

/** What a Practice link asks for. */
export interface PracticeParams {
  mode: PracticeMode;
  /** Undefined means every part of speech. */
  pos: PartOfSpeech | undefined;
  reverse: boolean;
}

/** Anything with `get`, such as `URLSearchParams` or what `useSearchParams` returns. */
export interface ParamSource {
  get(name: string): string | null;
}

/** Reads the Practice options from a query string. A missing or unknown value gives the default. */
export function parsePracticeParams(source: ParamSource): PracticeParams {
  const mode = source.get("mode");
  const pos = source.get("pos");
  return {
    mode: PRACTICE_MODES.find((known) => known === mode) ?? "due",
    pos: PARTS_OF_SPEECH.find((known) => known === pos),
    reverse: source.get("reverse") === "1",
  };
}

/** The link to Practice with these options. Defaults are left out, so plain Practice is `/practice`. */
export function practiceHref(params: Partial<PracticeParams> = {}): string {
  const query = new URLSearchParams();
  if (params.mode && params.mode !== "due") query.set("mode", params.mode);
  if (params.pos) query.set("pos", params.pos);
  if (params.reverse) query.set("reverse", "1");
  const text = query.toString();
  return text ? `${ROUTES.practice}?${text}` : ROUTES.practice;
}

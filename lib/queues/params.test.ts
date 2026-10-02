import { describe, expect, it } from "vitest";
import { parsePracticeParams, practiceHref } from "./params";

const parse = (query: string) => parsePracticeParams(new URLSearchParams(query));

describe("parsePracticeParams", () => {
  it("defaults to due cards, every part of speech, forward", () => {
    expect(parse("")).toEqual({ mode: "due", pos: undefined, reverse: false });
  });

  it("reads each option", () => {
    expect(parse("mode=shuffle").mode).toBe("shuffle");
    expect(parse("mode=in-order").mode).toBe("in-order");
    expect(parse("mode=struggling").mode).toBe("struggling");
    expect(parse("pos=verb").pos).toBe("verb");
    expect(parse("reverse=1").reverse).toBe(true);
    expect(parse("mode=shuffle&pos=noun&reverse=1")).toEqual({ mode: "shuffle", pos: "noun", reverse: true });
  });

  it("falls back to the default for a value it does not know", () => {
    expect(parse("mode=backwards&pos=gerund&reverse=yes")).toEqual({ mode: "due", pos: undefined, reverse: false });
  });
});

describe("practiceHref", () => {
  it("leaves the defaults out", () => {
    expect(practiceHref()).toBe("/practice");
    expect(practiceHref({ mode: "due", reverse: false })).toBe("/practice");
  });

  it("round-trips through the parser", () => {
    const params = { mode: "struggling", pos: "pronoun", reverse: true } as const;
    const href = practiceHref(params);
    expect(href).toBe("/practice?mode=struggling&pos=pronoun&reverse=1");
    expect(parse(href.split("?")[1])).toEqual(params);
  });
});

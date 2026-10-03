// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { fixtureCard, fixtureDeck } from "@/lib/deck/fixture";
import { UnitPayoff } from "./UnitPayoff";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("lists the unit's phrases with their Spanish and English, and plays a phrase's clip on a tap", () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  const played: string[] = [];
  const phrase = fixtureCard("phrase-going-home");
  act(() => root.render(<UnitPayoff unit={fixtureDeck.units[0]} phrases={[phrase]} onPlay={(src) => played.push(src)} />));

  const item = host.querySelector<HTMLElement>('[data-testid="payoff-phrase"]')!;
  expect(item.textContent).toContain(phrase.es);
  expect(item.textContent).toContain(phrase.en);
  act(() => host.querySelector<HTMLElement>('[data-testid="payoff-play-phrase-going-home"]')!.click());
  expect(played).toEqual([phrase.audio.word]);
  act(() => root.unmount());
});

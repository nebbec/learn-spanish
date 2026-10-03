// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TipsScreen } from "@/components/tips";
import { until } from "@/components/testing";
import { fixtureDeck } from "@/lib/deck/fixture";
import type { Review } from "@/lib/store";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

const q = (testId: string) => host.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
const loadTips = async () => fixtureDeck;

function review(cardId: string, rating: Review["rating"] = "good"): Review {
  return {
    id: `r-${cardId}`,
    cardId,
    direction: "forward",
    rating,
    section: "learn",
    timestamp: Date.UTC(2026, 9, 3, 9),
    deviceId: "device-a",
    synced: 0,
  };
}

function show(reviews: Review[], played: string[] = []) {
  act(() =>
    root.render(
      <TipsScreen store={{ getReviews: async () => reviews }} loadTips={loadTips} onPlay={(src) => played.push(src)} />,
    ),
  );
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("the Tips list", () => {
  it("is empty before any card naming a tip is seen", async () => {
    show([review("casa-house")]);
    await until(() => q("tips-empty"), "the empty list");
    expect(host.querySelectorAll('[data-testid="tips-item"]')).toHaveLength(0);
  });

  it("lists a tip once a card naming it is seen, with its examples' clips", async () => {
    const played: string[] = [];
    show([review("ir-form-tu", "known")], played);
    const item = await until(() => q("tips-item"), "the tip");
    expect(item.dataset.tipId).toBe("tip-verb-endings");
    expect(q("tip-title")!.textContent).toBe(fixtureDeck.tips[0].title);
    expect(q("tip-body")!.textContent).toBe(fixtureDeck.tips[0].body);
    act(() => q("tip-play-2")!.click());
    expect(played).toEqual([fixtureDeck.tips[0].examples[1].audio]);
  });
});

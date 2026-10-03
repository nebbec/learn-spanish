import { describe, expect, it } from "vitest";
import { latestResetAt, sinceLatestReset } from "@/lib/store";

describe("sinceLatestReset", () => {
  const reviews = [{ timestamp: 100 }, { timestamp: 200 }, { timestamp: 300 }];

  it("keeps every review when there has been no reset", () => {
    expect(latestResetAt([])).toBeNull();
    expect(sinceLatestReset(reviews, [])).toEqual(reviews);
  });

  it("drops reviews at or before the latest reset, whatever order the resets are in", () => {
    const resets = [{ resetAt: 200 }, { resetAt: 50 }];
    expect(latestResetAt(resets)).toBe(200);
    expect(sinceLatestReset(reviews, resets)).toEqual([{ timestamp: 300 }]);
  });
});

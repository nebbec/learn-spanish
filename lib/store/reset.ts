import type { Reset, Review } from "./types";

/** The time of the latest reset, or null when there has been none. */
export function latestResetAt(resets: readonly Pick<Reset, "resetAt">[]): number | null {
  let latest: number | null = null;
  for (const reset of resets) if (latest === null || reset.resetAt > latest) latest = reset.resetAt;
  return latest;
}

/**
 * The one filter for every place that reads reviews for state (replay, the queues, the
 * wheel, Struggling, media keeping): drops reviews made at or before the latest reset.
 */
export function sinceLatestReset<T extends Pick<Review, "timestamp">>(
  reviews: readonly T[],
  resets: readonly Pick<Reset, "resetAt">[],
): T[] {
  const latest = latestResetAt(resets);
  return latest === null ? [...reviews] : reviews.filter((r) => r.timestamp > latest);
}

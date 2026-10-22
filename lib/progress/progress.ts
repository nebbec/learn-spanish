// Progress counts and the geometry of the wheel. See docs/design.md, "The wheel".
// Pure functions: nothing here reads the clock, the store or the DOM.

import { PARTS_OF_SPEECH, type Card, type PartOfSpeech } from "@/lib/deck";
import { isMemorized, isSeen, type CardState } from "@/lib/scheduler";

const FULL_TURN = 2 * Math.PI;

/** The narrowest a slice may be, so it stays tappable and can carry a label: 20 degrees. */
export const MIN_SLICE_ANGLE = Math.PI / 9;

/** Counts for one group of cards. Memorized cards are a subset of seen cards. */
export interface Counts {
  total: number;
  seen: number;
  memorized: number;
}

export interface PosStats extends Counts {
  pos: PartOfSpeech;
}

export interface ProgressStats extends Counts {
  /** One entry per part of speech, in `PARTS_OF_SPEECH` order, including groups with no cards. */
  byPos: PosStats[];
}

/** Total, seen and memorized counts for the deck and for each part of speech. */
export function progressStats(
  cards: readonly Card[],
  states: ReadonlyMap<string, CardState>,
): ProgressStats {
  const byPos = new Map<PartOfSpeech, PosStats>(
    PARTS_OF_SPEECH.map((pos) => [pos, { pos, total: 0, seen: 0, memorized: 0 }]),
  );
  const all: Counts = { total: 0, seen: 0, memorized: 0 };
  for (const card of cards) {
    const state = states.get(card.id);
    for (const counts of [all, byPos.get(card.pos)!]) {
      counts.total += 1;
      if (isSeen(state)) counts.seen += 1;
      if (isMemorized(state)) counts.memorized += 1;
    }
  }
  return { ...all, byPos: [...byPos.values()] };
}

/**
 * The angle of each slice, in radians, in the order of `totals`. The angles sum
 * to a full turn. Each is proportional to its total, except that a group too
 * small to reach `minAngle` gets `minAngle` and the others share what is left
 * in proportion. A group with no cards gets no slice (0).
 */
export function sliceAngles(totals: readonly number[], minAngle = MIN_SLICE_ANGLE): number[] {
  const present = totals.map((total) => total > 0);
  const count = present.filter(Boolean).length;
  if (count === 0) return totals.map(() => 0);
  // With many groups the minimum cannot exceed an equal share.
  const min = Math.min(minAngle, FULL_TURN / count);

  // Raising one slice to the minimum shrinks the others, which can push another
  // below it, so repeat until no proportional slice is below the minimum.
  const atMin = totals.map(() => false);
  for (;;) {
    const fixed = atMin.filter(Boolean).length;
    const remaining = FULL_TURN - fixed * min;
    const freeTotal = totals.reduce((sum, t, i) => (present[i] && !atMin[i] ? sum + t : sum), 0);
    const angles = totals.map((t, i) => {
      if (!present[i]) return 0;
      return atMin[i] ? min : (remaining * t) / freeTotal;
    });
    const tooSmall = angles.map((a, i) => present[i] && !atMin[i] && a < min);
    if (!tooSmall.some(Boolean)) return angles;
    tooSmall.forEach((small, i) => {
      if (small) atMin[i] = true;
    });
  }
}

/**
 * How far out a fill reaches: the square root of the fraction, times the full
 * radius, so the filled area of the slice matches the fraction. With an inner
 * circle the slice starts at `innerRadius`, and the fill reaches
 * sqrt(r0² + f·(R² − r0²)), which keeps the filled area of the ring true to the
 * fraction. No cards gives 0: nothing to draw.
 */
export function fillRadius(count: number, total: number, radius = 1, innerRadius = 0): number {
  if (total <= 0 || count <= 0) return 0;
  const fraction = Math.min(1, count / total);
  return Math.sqrt(innerRadius ** 2 + fraction * (radius ** 2 - innerRadius ** 2));
}

/**
 * A count as a whole percentage of the total for the wheel's legend. It is 0 only
 * when the count is 0 and 100 only when it is the whole total, so one card seen
 * never reads "0% seen" and one card short never reads "100%".
 */
export function percentOf(count: number, total: number): number {
  if (total <= 0 || count <= 0) return 0;
  if (count >= total) return 100;
  return Math.min(99, Math.max(1, Math.round((count / total) * 100)));
}

/** One slice of the wheel. Angles are radians measured clockwise from the top. */
export interface WheelSlice extends PosStats {
  startAngle: number;
  endAngle: number;
  /** Radius of the light seen layer, or 0 with nothing seen. */
  seenRadius: number;
  /** Radius of the solid memorized layer. Never more than `seenRadius`. */
  memorizedRadius: number;
}

export interface WheelOptions {
  /** Full radius of the wheel. Defaults to 1, so radii come back as fractions. */
  radius?: number;
  /** Radius of the inner circle every slice starts at. Defaults to 0, the centre. */
  innerRadius?: number;
  minAngle?: number;
}

/** The slices to draw, clockwise from the top in `PARTS_OF_SPEECH` order. Groups with no cards are left out. */
export function wheelSlices(stats: ProgressStats, options: WheelOptions = {}): WheelSlice[] {
  const { radius = 1, innerRadius = 0, minAngle = MIN_SLICE_ANGLE } = options;
  const angles = sliceAngles(
    stats.byPos.map((group) => group.total),
    minAngle,
  );
  const slices: WheelSlice[] = [];
  let startAngle = 0;
  stats.byPos.forEach((group, i) => {
    if (group.total === 0) return;
    const endAngle = startAngle + angles[i];
    slices.push({
      ...group,
      startAngle,
      endAngle,
      seenRadius: fillRadius(group.seen, group.total, radius, innerRadius),
      memorizedRadius: fillRadius(group.memorized, group.total, radius, innerRadius),
    });
    startAngle = endAngle;
  });
  // Close the circle exactly, whatever the rounding in the sum.
  if (slices.length > 0) slices[slices.length - 1].endAngle = FULL_TURN;
  return slices;
}

/** The point at `angle` (clockwise from the top) and `radius`, in SVG coordinates with y pointing down. */
export function polarPoint(angle: number, radius: number): { x: number; y: number } {
  return { x: radius * Math.sin(angle), y: -radius * Math.cos(angle) };
}

const round = (n: number) => Number(n.toFixed(3));

/**
 * SVG path for a sector centred on the origin. A sector of a full turn is drawn
 * as a circle, since an arc that ends where it starts draws nothing.
 */
export function sectorPath(startAngle: number, endAngle: number, radius: number): string {
  if (radius <= 0 || endAngle <= startAngle) return "";
  const r = round(radius);
  if (endAngle - startAngle >= FULL_TURN - 1e-9) {
    return `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r} Z`;
  }
  const from = polarPoint(startAngle, radius);
  const to = polarPoint(endAngle, radius);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M 0 0 L ${round(from.x)} ${round(from.y)} A ${r} ${r} 0 ${largeArc} 1 ${round(to.x)} ${round(to.y)} Z`;
}

/** The petal look of the wheel's slices (U1): sizes in the wheel's own units, the gap in radians. */
export interface PetalShape {
  /** Radius of the inner circle every petal starts at, wide or narrow. */
  innerRadius: number;
  /** The angle left empty between neighbouring petals, half on each side, so gaps narrow towards the centre. */
  gap: number;
  /** How far each outer corner is rounded, along the edge and along the rim. */
  outerCorner: number;
  /** The most each inner corner is rounded. A narrow petal's inner arc gets less. */
  innerCorner: number;
}

/**
 * SVG path for one petal: the slice from `startAngle` to `endAngle` drawn out to
 * `radius`, between the inner circle and that radius, with the gap taken off both
 * sides and its four corners rounded. Corners never take more than the edges and
 * arcs have room for, so a fill just past the inner circle is still a closed shape.
 * Empty when there is nothing to draw: a radius at or inside the inner circle.
 */
export function petalPath(startAngle: number, endAngle: number, radius: number, shape: PetalShape): string {
  const { innerRadius: inner, gap, outerCorner, innerCorner } = shape;
  const from = startAngle + gap / 2;
  const to = endAngle - gap / 2;
  if (radius <= inner || to <= from) return "";
  const span = to - from;
  const edge = radius - inner;
  const cutIn = inner > 0 ? Math.min(innerCorner, span * inner * 0.45, edge / 2) : 0;
  const cutOut = Math.min(outerCorner, (span * radius) / 2, edge - cutIn);
  const at = (angle: number, r: number) => {
    const { x, y } = polarPoint(angle, r);
    return `${round(x)} ${round(y)}`;
  };
  const largeArc = (arc: number) => (arc > Math.PI ? 1 : 0);

  const path = [
    `M ${at(from, inner + cutIn)}`,
    `L ${at(from, radius - cutOut)}`,
    `Q ${at(from, radius)} ${at(from + cutOut / radius, radius)}`,
    `A ${round(radius)} ${round(radius)} 0 ${largeArc(span - (2 * cutOut) / radius)} 1 ${at(to - cutOut / radius, radius)}`,
    `Q ${at(to, radius)} ${at(to, radius - cutOut)}`,
    `L ${at(to, inner + cutIn)}`,
  ];
  if (inner > 0) {
    path.push(
      `Q ${at(to, inner)} ${at(to - cutIn / inner, inner)}`,
      `A ${round(inner)} ${round(inner)} 0 ${largeArc(span - (2 * cutIn) / inner)} 0 ${at(from + cutIn / inner, inner)}`,
      `Q ${at(from, inner)} ${at(from, inner + cutIn)}`,
    );
  }
  return [...path, "Z"].join(" ");
}

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(__dirname, "..", "app", "globals.css"), "utf8");

function token(name: string): string | null {
  const match = css.match(new RegExp(`${name}:\\s*([^;]+);`));
  return match ? match[1].trim() : null;
}

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("theme tokens", () => {
  it.each(["good", "nearly", "again"])("defines the %s rating colour set", (name) => {
    expect(token(`--color-${name}`)).toMatch(/^#[0-9a-f]{6}$/);
    expect(token(`--color-${name}-soft`)).toMatch(/^#[0-9a-f]{6}$/);
    expect(token(`--color-on-${name}`)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it.each(["good", "nearly", "again"])("%s label is readable on its button (large text, 3:1)", (name) => {
    expect(contrast(token(`--color-${name}`)!, token(`--color-on-${name}`)!)).toBeGreaterThanOrEqual(3);
  });

  it("body text is readable on the page (4.5:1)", () => {
    expect(contrast(token("--color-ink")!, token("--color-paper")!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("--color-ink-soft")!, token("--color-paper")!)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["--font-display", "--font-body", "--radius-chip", "--radius-button", "--radius-card"])(
    "defines %s",
    (name) => {
      expect(token(name)).not.toBeNull();
    },
  );
});

import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROUTES } from "./routes";

describe("routes", () => {
  it("has a page file for every route", () => {
    for (const href of Object.values(ROUTES)) {
      const page = path.join(__dirname, "..", "app", href, "page.tsx");
      expect(existsSync(page), `${href} -> ${page}`).toBe(true);
    }
  });
});

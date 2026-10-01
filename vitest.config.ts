import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": __dirname },
  },
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", ".next/**"],
  },
});

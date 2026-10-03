import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": __dirname },
  },
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
    // `*.live.test.ts` run against the real Supabase project, only through their npm script.
    exclude: ["node_modules/**", ".next/**", ...(process.env.LIVE_CHECK ? [] : ["**/*.live.test.ts"])],
  },
});

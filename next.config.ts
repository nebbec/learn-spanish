import type { NextConfig } from "next";

// One id per build, given to the page so it can register the service worker as
// /sw.js?v=<id>: a new build installs a new worker with a fresh cache. Kept in
// the environment so the build's worker processes all see the same value.
const buildId = (process.env.LEARN_SPANISH_BUILD_ID ??=
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? Date.now().toString(36));

// The language this build teaches (lang/, docs/german.md): `es` when unset, so
// the Spanish deployment needs no change. Set here so every build inlines a
// value, rather than leaving the browser to read an empty process.env.
const lang = process.env.NEXT_PUBLIC_LANG || "es";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: buildId, NEXT_PUBLIC_LANG: lang },
  async headers() {
    return [
      {
        // The browser must always ask the server for the worker, or an update could be held back.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;

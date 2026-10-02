import type { NextConfig } from "next";

// One id per build, given to the page so it can register the service worker as
// /sw.js?v=<id>: a new build installs a new worker with a fresh cache. Kept in
// the environment so the build's worker processes all see the same value.
const buildId = (process.env.LEARN_SPANISH_BUILD_ID ??=
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? Date.now().toString(36));

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone — a self-contained server with only the needed node_modules, which is
  // what the Cloud Run image runs. Without this the container has to carry the whole dep tree.
  output: "standalone",
  // Daily Prebuilt (createFrame) is a hard singleton; React Strict Mode's dev-only double-invoke
  // of effects races frame creation ("Duplicate DailyIframe instances"). Production never
  // double-invokes, so this only affects dev. LiveRoom is also hardened defensively.
  reactStrictMode: false,
};

export default nextConfig;

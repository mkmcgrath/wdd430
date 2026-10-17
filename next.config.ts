import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off for the prototype: every page is per-user and
  // dynamic (reads the session cookie), so the classic dynamic rendering model
  // is simpler. See docs/claude.md "Decisions" for the trade-off.
  cacheComponents: false,
};

export default nextConfig;

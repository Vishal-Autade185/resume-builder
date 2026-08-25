import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phase 0: server-only API for compile proxy + supabase. No client bundle
  //               tricks needed yet; relax if/when phase 2 AI client streaming.
  reactStrictMode: true,
  typedRoutes: false,
};

export default nextConfig;

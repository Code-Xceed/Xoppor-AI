import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the app local-first and lightweight; no remote image domains needed.
  images: { unoptimized: true },
};

export default nextConfig;

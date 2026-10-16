import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['100.98.85.118', '*.trycloudflare.com'],
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;

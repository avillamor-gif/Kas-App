import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // TypeScript errors surface via `tsc --noEmit` in CI; skip re-check during Vercel build
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.tile.openstreetmap.org" },
      { protocol: "https", hostname: "unpkg.com" },
    ],
  },
};

export default nextConfig;

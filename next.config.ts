import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from OpenStreetMap tiles
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.tile.openstreetmap.org" },
      { protocol: "https", hostname: "unpkg.com" },
    ],
  },
  // Required for Prisma on Vercel Edge-adjacent builds
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;

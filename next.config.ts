import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // WP media URLs are immutable (new upload = new URL), so cache optimized images long-term
    minimumCacheTTL: 2678400, // 31 days
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "http",
        hostname: "memory.emma-kobayashi.com",
      },
      {
        protocol: "https",
        hostname: "memory.emma-kobayashi.com",
      },
      {
        protocol: "http",
        hostname: "www.memory.emma-kobayashi.com",
      },
      {
        protocol: "https",
        hostname: "www.memory.emma-kobayashi.com",
      },
    ],
  },
};

export default nextConfig;

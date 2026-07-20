import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // Next 16 rejects any quality not listed here with a 400. 90 is the media
    // modal's full-size view; without it the lightbox never loads the sharp image.
    qualities: [75, 90],
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

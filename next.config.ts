import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "export",
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
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

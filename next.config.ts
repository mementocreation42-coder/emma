import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// 'unsafe-inline' script/style: Next.js hydration and framer-motion need inline
// snippets; a nonce-based policy is not worth the complexity for a family site.
// unpkg.com: CldVideoPlayer loads the Cloudinary video player JS/CSS from there.
// *.cloudinary.com in connect-src: direct video uploads (api.) and streaming/
// analytics (res., video-analytics-api.).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://unpkg.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://unpkg.com",
  "img-src 'self' data: blob: https://res.cloudinary.com https://memory.emma-kobayashi.com https://www.memory.emma-kobayashi.com",
  "media-src 'self' blob: https://res.cloudinary.com https://memory.emma-kobayashi.com https://www.memory.emma-kobayashi.com",
  "font-src 'self' data: https://unpkg.com",
  // holidays-jp: the calendar fetches Japanese public holidays client-side
  `connect-src 'self' blob: https://*.cloudinary.com https://holidays-jp.github.io${isDev ? " ws:" : ""}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Ignored over plain http, so safe to send in dev too
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Private family archive: keep every page out of search engines
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
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

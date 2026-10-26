import { readFileSync } from "node:fs";
const legacyPaths = JSON.parse(
  readFileSync(new URL("./src/cms/legacy-paths.json", import.meta.url), "utf8"),
);
/** @type {import('next').NextConfig} */
const mediaHost = process.env.SUPABASE_URL
  ? new URL(process.env.SUPABASE_URL).hostname
  : "";
const nextConfig = {
  env: {
    NEXT_PUBLIC_MEDIA_HOST: mediaHost,
    NEXT_PUBLIC_IMAGE_SERVICE: process.env.NETLIFY ? "netlify" : "next",
  },
  // Runtime CMS files belong on the persistent server disk, outside the bundle.
  outputFileTracingExcludes: {
    "/*": ["./.cms/**/*", "./public/docs/**/*", "./public/images/source/**/*"],
  },
  images: {
    // Route each local source directly through Netlify's native image service.
    ...(process.env.NETLIFY
      ? { loader: "custom", loaderFile: "./src/lib/netlify-image-loader.ts" }
      : {}),
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "kivancgroup.com" },
      ...(mediaHost
        ? [
            {
              protocol: "https",
              hostname: mediaHost,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
  async redirects() {
    return legacyPaths.map((entry) => ({ ...entry, permanent: true }));
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

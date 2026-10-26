/** @type {import('next').NextConfig} */
const mediaHost = process.env.SUPABASE_URL
  ? new URL(process.env.SUPABASE_URL).hostname
  : "";
const nextConfig = {
  env: { NEXT_PUBLIC_MEDIA_HOST: mediaHost },
  // Runtime CMS files belong on the persistent server disk, outside the bundle.
  outputFileTracingExcludes: { "/*": ["./.cms/**/*"] },
  images: {
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

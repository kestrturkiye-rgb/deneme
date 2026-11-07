// Cloudflare build: product photo list -> OpenNext build -> asset size check.
// Usage: npm run cf:build   (then `npm run cf:preview` or `npm run cf:deploy`)
import { execSync } from "node:child_process";

const env = {
  ...process.env,
  CLOUDFLARE_BUILD: "1",
  // The public Supabase project URL decides the allowed image host at build time.
  SUPABASE_URL: process.env.SUPABASE_URL || "https://lptosaejlowasrbcyqnu.supabase.co",
};
const run = (cmd) => execSync(cmd, { stdio: "inherit", env });

run("node scripts/product-media-manifest.mjs");
run("npx opennextjs-cloudflare build");
run("node scripts/cloudflare-postbuild.mjs");

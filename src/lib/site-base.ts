export function siteBase(fallback: string) {
  if (process.env.SITE_ORIGIN)
    return process.env.SITE_ORIGIN.replace(/\/$/, "");
  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return host ? "https://" + host : fallback.replace(/\/$/, "");
}

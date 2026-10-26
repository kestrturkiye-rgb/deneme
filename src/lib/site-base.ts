export function siteBase(fallback: string) {
  if (process.env.SITE_ORIGIN)
    return process.env.SITE_ORIGIN.replace(/\/$/, "");
  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (host) return "https://" + host;
  const deployedUrl =
    process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL;
  if (deployedUrl && /^https?:\/\//.test(deployedUrl))
    return deployedUrl.replace(/\/$/, "");
  return fallback.replace(/\/$/, "");
}

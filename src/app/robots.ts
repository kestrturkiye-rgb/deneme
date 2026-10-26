import type { MetadataRoute } from "next";
import { getSection } from "@/cms/server";
import { siteBase } from "@/lib/site-base";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = siteBase((await getSection("app-layout")).metadata.metadataBase);
  if (process.env.VERCEL_ENV === "preview")
    return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/teklif-sepeti", "/arama"],
    },
    sitemap: base + "/sitemap.xml",
  };
}

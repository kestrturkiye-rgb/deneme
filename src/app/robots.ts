import { locales, localizedHref } from "@/i18n/locales";
import { isPreviewDeployment } from "@/lib/deployment";
import type { MetadataRoute } from "next";
import { getSection } from "@/cms/server";
import { siteBase } from "@/lib/site-base";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = siteBase((await getSection("app-layout")).metadata.metadataBase);
  if (isPreviewDeployment())
    return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        ...locales.flatMap((locale) => [
          localizedHref("/teklif-sepeti", locale),
          localizedHref("/arama", locale),
        ]),
      ],
    },
    sitemap: base + "/sitemap.xml",
  };
}

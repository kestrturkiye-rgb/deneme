import { locales, localizedHref } from "@/i18n/locales";
import type { MetadataRoute } from "next";
import { productHref, getProducts } from "@/data/catalog";
import { getDivisions } from "@/data/divisions";
import { getSection } from "@/cms/server";
import { getCustomPages } from "@/cms/pages";
import { getNews, newsHref } from "@/data/news";
import { siteBase } from "@/lib/site-base";

const staticPaths = [
  "",
  "/kurumsal",
  "/urunler",
  "/tarihce",
  "/ar-ge",
  "/haberler",
  "/mevzuat",
  "/dokumanlar",
  "/satis-kanallari",
  "/kariyer",
  "/iletisim",
  "/gizlilik-ve-guvenlik",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE = siteBase((await getSection("app-layout")).metadata.metadataBase);
  const paths = [
    ...staticPaths,
    "/teklif-al",
    ...(await getNews()).map(newsHref),
    ...(await getCustomPages())
      .filter((p) => p.visible)
      .map((p) => "/" + p.slug),
    ...(await getDivisions()).map((d) => `/${d.slug}`),
    ...(await getProducts()).map((p) => productHref(p)),
  ];

  return [...new Set(paths)].flatMap((path) =>
    locales.map((locale) => ({
      url: BASE + localizedHref(path || "/", locale),
      alternates: {
        languages: Object.fromEntries(
          locales.map((language) => [
            language,
            BASE + localizedHref(path || "/", language),
          ]),
        ),
      },
    })),
  );
}

import { getLocale } from "@/i18n/server";
import { locales, localizedHref, intlLocales } from "@/i18n/locales";
import "server-only";
import type { Metadata } from "next";
import { getSection } from "@/cms/server";
export async function pageMetadata(
  path: string,
  metadata: Metadata,
  image?: string,
): Promise<Metadata> {
  const locale = await getLocale();
  const localizedPath = localizedHref(path, locale);
  const root = (await getSection("app-layout")).metadata;
  const title =
    typeof metadata.title === "string" ? metadata.title : root.title.default;
  const description = metadata.description || root.description;
  const images = [
    image || "/paylasim?path=" + encodeURIComponent(localizedPath),
  ];
  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      canonical: localizedPath,
      languages: Object.fromEntries([
        ...locales.map((language) => [language, localizedHref(path, language)]),
        ["x-default", path],
      ]),
    },
    openGraph: {
      type: "website",
      locale: locale === "ar" ? "ar_AR" : intlLocales[locale].replace("-", "_"),
      siteName: root.openGraph.siteName,
      title,
      description,
      url: localizedPath,
      images,
    },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

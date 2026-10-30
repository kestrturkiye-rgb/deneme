"use client";
import { usePathname } from "next/navigation";
import { useLocale } from "@/i18n/context";
import { splitLocale } from "@/i18n/locales";
import { pageEntries } from "@/cms/workspace";
import type { Content } from "@/cms/store";
const labels = {
  en: [
    "Some detailed or archived text is available in its original Turkish.",
    "View the Turkish page",
  ],
  es: [
    "Algunos textos técnicos o de archivo se muestran en su versión original en turco.",
    "Ver la página en turco",
  ],
  ar: [
    "تُعرض بعض النصوص الفنية أو الأرشيفية بلغتها التركية الأصلية.",
    "عرض الصفحة باللغة التركية",
  ],
  de: [
    "Einige ausführliche Fach- oder Archivtexte werden im türkischen Original angezeigt.",
    "Türkische Seite ansehen",
  ],
};
function containsOriginal(value: unknown): boolean {
  if (typeof value === "string")
    return (
      value.length > 120 &&
      (
        value.match(
          /(?:^|\s)(?:ve|için|ile|olan|olarak|bir|tarafından|göre|karşı|sayesinde|ürünler|koruyucu)(?=\s|[.,;])/gi,
        ) || []
      ).length >= 4
    );
  if (Array.isArray(value)) return value.some(containsOriginal);
  if (value && typeof value === "object")
    return Object.entries(value).some(
      ([key, v]) =>
        !["localization", "href", "src", "image", "video"].includes(key) &&
        containsOriginal(v),
    );
  return false;
}
export default function OriginalLanguageNote({
  content,
}: {
  content: Content;
}) {
  const locale = useLocale(),
    path = splitLocale(usePathname()).path;
  if (locale === "tr") return null;
  const parts = path.split("/").filter(Boolean),
    entries = pageEntries(content),
    entry = entries.find((e) => e.path === path);
  let values: unknown[] = [];
  if (entry?.productSlug)
    values = [
      (content["data-details"].details as Record<string, unknown>)[
        entry.productSlug
      ],
    ];
  else if (entry?.group === "Haber detayları")
    values = [content["data-news"].news.find((n) => n.slug === parts[1])];
  else if (entry?.group === "Özel sayfalar")
    values = [content.customPages.pages.find((p) => p.slug === parts[0])];
  else
    values = entry?.sections.map((key) => content[key as keyof Content]) || [];
  if (!values.some(containsOriginal)) return null;
  return (
    <aside className="kg-original-note container-site">
      <p>{labels[locale][0]}</p>
      <a href={path} hrefLang="tr" lang={locale}>
        {labels[locale][1]} ↗
      </a>
    </aside>
  );
}

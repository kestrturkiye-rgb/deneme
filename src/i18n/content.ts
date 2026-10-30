import { textId } from "./keys";
export { textId } from "./keys";
import type { Content } from "@/cms/store";
import { slugify } from "@/cms/schema";
import en from "./dictionaries/en.json";
import es from "./dictionaries/es.json";
import ar from "./dictionaries/ar.json";
import de from "./dictionaries/de.json";
import type { Locale, ForeignLocale } from "./locales";
export type Translation = { source: string; text: string };
export type TranslationOverrides = Record<string, Translation>;
export type Localization = {
  translations: Partial<Record<ForeignLocale, TranslationOverrides>>;
};
export const dictionaries: Record<ForeignLocale, Record<string, string>> = {
  en,
  es,
  ar,
  de,
};
const protectedKeys = new Set([
  "slug",
  "id",
  "parentSlug",
  "href",
  "src",
  "url",
  "image",
  "heroImage",
  "heroVideo",
  "video",
  "logo",
  "metadataBase",
  "email",
  "phone",
  "phoneHref",
  "site",
  "swatch",
  "date",
  "year",
  "foundingDate",
  "type",
  "@type",
  "@context",
  "locale",
  "card",
  "layout",
  "kind",
  "anchor",
  "compositionCode",
  "articleNumber",
  "sizeRange",
]);
export function isText(value: unknown, path: string[]): value is string {
  if (
    typeof value !== "string" ||
    !/[\p{L}]/u.test(value) ||
    protectedKeys.has(path.at(-1) || "")
  )
    return false;
  if (
    ["design", "home", "localization"].includes(path[0]) ||
    path.includes("organizationJsonLd") ||
    path.includes("relatedFamilies") ||
    path.includes("featuredSlugs") ||
    path.includes("frames") ||
    path.includes("angles")
  )
    return false;
  return (
    !/^(?:https?:|mailto:|tel:|\/|#|[\w.-]+@[\w.-]+\.[a-z]+$)/i.test(value) &&
    !value.includes("{n}") &&
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  );
}
export function translateText(
  source: string,
  locale: Locale,
  overrides?: TranslationOverrides,
): string {
  if (locale === "tr") return source;
  const override = overrides?.[textId(source)];
  if (override?.source === source) return override.text;
  return Object.hasOwn(dictionaries[locale], source)
    ? dictionaries[locale][source]
    : source;
}
export function textEntries(content: Content) {
  const result = new Map<
    string,
    { id: string; source: string; paths: string[] }
  >();
  function walk(value: unknown, path: string[]) {
    if (isText(value, path)) {
      const entry = result.get(value) || {
        id: textId(value),
        source: value,
        paths: [],
      };
      entry.paths.push(path.join("."));
      result.set(value, entry);
    } else if (Array.isArray(value))
      value.forEach((v, i) => walk(v, [...path, String(i)]));
    else if (value && typeof value === "object" && path[0] !== "localization")
      for (const [k, v] of Object.entries(value)) walk(v, [...path, k]);
  }
  walk(content, []);
  return [...result.values()];
}
export function localizeContent(content: Content, locale: Locale): Content {
  if (locale === "tr") return content;
  const result = structuredClone(content),
    config = result.localization as unknown as Localization | undefined,
    overrides = config?.translations[locale];
  // Keep identifiers stable when a record originally relied on a Turkish title.
  for (const item of result["data-news"].news)
    if (!item.slug) item.slug = slugify(item.title);
  for (const division of result["data-divisions"].divisions)
    for (const group of division.groups)
      (group as unknown as { anchor: string }).anchor = slugify(group.title);
  function walk(value: unknown, path: string[]): unknown {
    if (isText(value, path)) return translateText(value, locale, overrides);
    if (Array.isArray(value))
      return value.map((v, i) => walk(v, [...path, String(i)]));
    if (value && typeof value === "object" && path[0] !== "localization")
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, walk(v, [...path, k])]),
      );
    return value;
  }
  return walk(result, []) as Content;
}

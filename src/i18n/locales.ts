export const locales = ["tr", "en", "es", "ar", "de"] as const;
export type Locale = (typeof locales)[number];
export type ForeignLocale = Exclude<Locale, "tr">;
export const languageNames: Record<Locale, string> = {
  tr: "Türkçe",
  en: "English",
  es: "Español",
  ar: "العربية",
  de: "Deutsch",
};
export const intlLocales: Record<Locale, string> = {
  tr: "tr-TR",
  en: "en-GB",
  es: "es-ES",
  ar: "ar",
  de: "de-DE",
};
export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
export function splitLocale(path: string): { locale: Locale; path: string } {
  const match = path.match(/^\/(tr|en|es|ar|de)(?=\/|$)/);
  return match
    ? { locale: match[1] as Locale, path: path.slice(match[0].length) || "/" }
    : { locale: "tr", path };
}
export function localizedHref(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const separator = href.search(/[?#]/);
  const pathname = separator < 0 ? href : href.slice(0, separator);
  const suffix = separator < 0 ? "" : href.slice(separator);
  const plain = splitLocale(pathname).path;
  if (
    /^\/(?:admin|api|_next|\.netlify|images|fonts|docs|media|paylasim)(?:\/|$)/.test(
      plain,
    ) ||
    /\.[a-z0-9]+$/i.test(plain)
  )
    return plain + suffix;
  return (
    (locale === "tr" ? plain : "/" + locale + (plain === "/" ? "" : plain)) +
    suffix
  );
}

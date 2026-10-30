import type { Content } from "@/cms/store";
import { dictionaries, textEntries, type Localization } from "./content";
import { locales, type ForeignLocale } from "./locales";

export type SyncScope = "changes" | "all";
export type TranslationTask = {
  id: string;
  source: string;
  locale: ForeignLocale;
};
export const foreignLocales = locales.filter(
  (locale): locale is ForeignLocale => locale !== "tr",
);

/** Turkish content is the only page/product tree. Languages store text only. */
export function translationPlan(
  draft: Content,
  published: Content,
  scope: SyncScope = "changes",
): TranslationTask[] {
  const previous = new Map(
      textEntries(published, true).flatMap((entry) =>
        entry.paths.map((path) => [path, entry.source] as const),
      ),
    ),
    config = draft.localization as unknown as Localization | undefined,
    previousConfig = published.localization as unknown as
      | Localization
      | undefined;
  return textEntries(draft, true).flatMap((entry) => {
    const sourceChanged = !entry.paths.every(
      (path) => previous.get(path) === entry.source,
    );
    return foreignLocales
      .filter((locale) => {
        const own = config?.translations[locale]?.[entry.id];
        return (
          (scope === "all" ||
            sourceChanged ||
            previousConfig?.translations[locale]?.[entry.id]?.source ===
              entry.source) &&
          own?.source !== entry.source &&
          !Object.hasOwn(dictionaries[locale], entry.source)
        );
      })
      .map((locale) => ({ id: entry.id, source: entry.source, locale }));
  });
}

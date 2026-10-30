import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { readState, type Content } from "./store";
import { getLocale } from "@/i18n/server";
import { localizeContent } from "@/i18n/content";
import { authenticated } from "./auth";
export const getClientContent = cache(async (): Promise<Content> => {
  const jar = await cookies();
  const state = await readState();
  const source =
    jar.get("cms_preview")?.value === "1" && (await authenticated())
      ? state.draft
      : state.published;
  const localized = localizeContent(source, await getLocale());
  // Public rendering needs the selected text, not every editor override.
  return {
    ...localized,
    localization: { translations: { en: {}, es: {}, ar: {}, de: {} } },
  };
});
export async function getSection<K extends keyof Content>(
  key: K,
): Promise<Content[K]> {
  return (await getClientContent())[key];
}

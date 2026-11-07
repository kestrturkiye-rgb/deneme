import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { readPublished, readState, type Content } from "./store";
import { getLocale } from "@/i18n/server";
import { localizeContent } from "@/i18n/content";
import { authenticated } from "./auth";
import type { Locale } from "@/i18n/locales";

/**
 * Published content is kept in memory for a short time per server instance, so a
 * warm instance does not download and localize the whole CMS on every request.
 * After "Yayınla", visitors see the new version within PUBLISHED_TTL_MS.
 */
const PUBLISHED_TTL_MS = 30_000;
type Entry = { at: number; value: Promise<Content> };
const localizedCache = new Map<Locale, Entry>();
let publishedEntry: Entry | null = null;

function published(now: number): Promise<Content> {
  if (!publishedEntry || now - publishedEntry.at > PUBLISHED_TTL_MS) {
    const value = readPublished();
    publishedEntry = { at: now, value };
    // A failed read must not stay cached.
    value.catch(() => {
      if (publishedEntry?.value === value) publishedEntry = null;
    });
  }
  return publishedEntry.value;
}

/** Development guard: cached content is shared between requests and must never be mutated. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

function forVisitors(source: Content, locale: Locale): Content {
  const localized = localizeContent(source, locale);
  // Public rendering needs the selected text, not every editor override.
  const result = {
    ...localized,
    localization: { translations: { en: {}, es: {}, ar: {}, de: {} } },
  };
  return process.env.NODE_ENV === "production" ? result : deepFreeze(result);
}

function publishedFor(locale: Locale): Promise<Content> {
  const now = Date.now();
  const hit = localizedCache.get(locale);
  if (hit && now - hit.at <= PUBLISHED_TTL_MS) return hit.value;
  const value = published(now).then((source) => forVisitors(source, locale));
  localizedCache.set(locale, { at: now, value });
  value.catch(() => {
    if (localizedCache.get(locale)?.value === value) localizedCache.delete(locale);
  });
  return value;
}

export const getClientContent = cache(async (): Promise<Content> => {
  const jar = await cookies();
  const locale = await getLocale();
  // Draft preview (editors only) always reads the live record.
  if (jar.get("cms_preview")?.value === "1" && (await authenticated()))
    return forVisitors((await readState()).draft, locale);
  return publishedFor(locale);
});

export async function getSection<K extends keyof Content>(
  key: K,
): Promise<Content[K]> {
  return (await getClientContent())[key];
}

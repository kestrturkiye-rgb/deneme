import "server-only";
import { cache } from "react";
import { lang } from "next/root-params";
import { isLocale, type Locale } from "./locales";
export const getLocale = cache(async (): Promise<Locale> => {
  // Public pages have a locale root. Admin and metadata handlers default to Turkish.
  let value: string | undefined;
  try {
    value = await lang();
  } catch {
    return "tr";
  }
  return value && isLocale(value) ? value : "tr";
});

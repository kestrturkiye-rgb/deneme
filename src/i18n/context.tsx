"use client";
import { createContext, useContext } from "react";
import type { Locale } from "./locales";
export const LocaleContext = createContext<Locale>("tr");
export const useLocale = () => useContext(LocaleContext);
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

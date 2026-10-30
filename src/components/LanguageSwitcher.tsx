"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/i18n/context";
import { locales, languageNames, localizedHref } from "@/i18n/locales";
const labels = {
  tr: "Site dili",
  en: "Website language",
  es: "Idioma del sitio",
  ar: "لغة الموقع",
  de: "Sprache der Website",
};
export default function LanguageSwitcher() {
  const locale = useLocale(),
    path = usePathname(),
    ref = useRef<HTMLDetailsElement>(null),
    [suffix, setSuffix] = useState("");
  useEffect(() => {
    setSuffix(window.location.search + window.location.hash);
    if (ref.current) ref.current.open = false;
  }, [path]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node))
        ref.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <details
      ref={ref}
      className="kg-language"
      onKeyDown={(e) => {
        if (e.key === "Escape" && ref.current) {
          ref.current.open = false;
          ref.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary aria-label={labels[locale]} title={languageNames[locale]}>
        <svg
          viewBox="0 0 24 24"
          width="19"
          height="19"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <ellipse cx="12" cy="12" rx="4" ry="9" />
          <path d="M3 12h18M5 7h14M5 17h14" />
        </svg>
        <span>{locale.toUpperCase()}</span>
        <span aria-hidden="true">⌄</span>
      </summary>
      <nav aria-label={labels[locale]}>
        {locales.map((lang) => (
          <a
            key={lang}
            href={localizedHref(path, lang) + suffix}
            lang={lang}
            hrefLang={lang}
            aria-current={locale === lang ? "true" : undefined}
            dir="auto"
          >
            <span>{languageNames[lang]}</span>
            <small>{lang.toUpperCase()}</small>
          </a>
        ))}
      </nav>
    </details>
  );
}

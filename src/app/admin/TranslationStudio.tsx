"use client";
import { useMemo, useState } from "react";
import type { Content } from "@/cms/store";
import {
  dictionaries,
  textEntries,
  translateText,
  type Localization,
} from "@/i18n/content";
import {
  languageNames,
  localizedHref,
  type ForeignLocale,
} from "@/i18n/locales";
import type { UpdateContent } from "./ProductStudio";
import manifest from "@/cms/manifest.json";
import { translationPlan } from "@/i18n/sync";
export default function TranslationStudio({
  content,
  published,
  update,
  onPreview,
  onSynchronize,
}: {
  content: Content;
  published: Content;
  update: UpdateContent;
  onPreview: (path: string) => void;
  onSynchronize: () => void;
}) {
  const [locale, setLocale] = useState<ForeignLocale>("en"),
    [query, setQuery] = useState(""),
    [section, setSection] = useState("components-Hero"),
    [onlyMissing, setOnlyMissing] = useState(false),
    [limit, setLimit] = useState(40),
    [previewPath, setPreviewPath] = useState("/");
  const entries = useMemo(() => textEntries(content), [content]);
  const pending = useMemo(
    () => translationPlan(content, published).length,
    [content, published],
  );
  const allPending = useMemo(
    () => translationPlan(content, published, "all").length,
    [content, published],
  );
  const translations =
      (content.localization as unknown as Localization)?.translations || {},
    overrides = translations[locale] || {};
  const filtered = entries.filter(
    (entry) =>
      (!section ||
        entry.paths.some((path) => path.startsWith(section + "."))) &&
      (!query ||
        (
          entry.source +
          " " +
          entry.paths.join(" ") +
          " " +
          translateText(entry.source, locale, overrides)
        )
          .toLocaleLowerCase("tr")
          .includes(query.toLocaleLowerCase("tr"))) &&
      (!onlyMissing ||
        (!Object.hasOwn(dictionaries[locale], entry.source) &&
          !overrides[entry.id])),
  );
  const labels = manifest as Record<string, { title: string }>;
  function change(id: string, source: string, text?: string) {
    update((previous) => {
      const localization =
          (previous.localization as unknown as Localization) || {
            translations: {},
          },
        next = { ...localization.translations[locale] };
      if (text === undefined) delete next[id];
      else next[id] = { source, text };
      return {
        ...previous,
        localization: {
          translations: { ...localization.translations, [locale]: next },
        } as unknown as Content["localization"],
      };
    });
  }
  return (
    <section className="adm-translation-studio adm-padded">
      <h2>Diller ve çeviriler</h2>
      <p className="adm-muted">
        Sitenin tek kaynağı Türkçedir. Ürün ekleme/silme, fotoğraflar, 360°,
        bannerlar, sayfa düzeni ve görünürlük bütün dillerde ortaktır. Yayınla
        düğmesi yeni veya değişen Türkçe metinleri İngilizce, İspanyolca, Arapça
        ve Almancaya otomatik çevirir, ardından beş dili birlikte yayınlar.
      </p>
      <div className="adm-language-sync">
        <strong>Türkçeden otomatik güncelleme etkin</strong>
        <p>
          {pending
            ? `${pending} dil karşılığı yayınlama sırasında hazırlanacak.`
            : "Yeni Türkçe değişiklikler için bekleyen çeviri yok."}
        </p>
        <p>
          Eski içeriklerde {allPending} eksik dil karşılığı var. İsterseniz
          bunları da tek işlemle taslağa hazırlayabilirsiniz.
        </p>
        <button
          className="adm-btn"
          disabled={!allPending}
          onClick={onSynchronize}
        >
          Eksik çevirileri tamamla
        </button>
        <small>
          Metinler ücretsiz Google çeviri bağlantısıyla işlenip saklanır;
          ziyaretçiler için çeviri isteği yapılmaz. Hizmet sınırı veya bağlantı
          hatasında taslak korunur; yeniden denenebilir. PDF ve görsellerin
          içindeki yazılar özgün dilinde kalır.
        </small>
      </div>
      <div className="adm-translation-controls">
        <label>
          Düzenlenecek dil
          <select
            aria-label="Çeviri dili"
            value={locale}
            onChange={(e) => {
              setLocale(e.target.value as ForeignLocale);
              setLimit(40);
            }}
          >
            {(["en", "es", "ar", "de"] as const).map((lang) => (
              <option key={lang} value={lang}>
                {languageNames[lang]}
              </option>
            ))}
          </select>
        </label>
        <label>
          İçerik bölümü
          <select
            aria-label="Çeviri bölümü"
            value={section}
            onChange={(e) => {
              setSection(e.target.value);
              setLimit(40);
            }}
          >
            <option value="">Tüm içerikler</option>
            {Object.keys(content)
              .filter(
                (key) => !["localization", "design", "home"].includes(key),
              )
              .map((key) => (
                <option key={key} value={key}>
                  {labels[key]?.title || key}
                </option>
              ))}
          </select>
        </label>
        <label>
          Metin veya ürün ara
          <input
            aria-label="Çevirilerde ara"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(40);
            }}
            placeholder="Örn. Maximus, iletişim…"
          />
        </label>
      </div>
      <label className="adm-toggle">
        <input
          type="checkbox"
          checked={onlyMissing}
          onChange={(e) => {
            setOnlyMissing(e.target.checked);
            setLimit(40);
          }}
        />
        <span>Yalnızca çeviri eklenmemiş metinler</span>
      </label>
      <div className="adm-translation-preview">
        <input
          aria-label="Çeviri önizleme sayfası"
          value={previewPath}
          onChange={(e) => setPreviewPath(e.target.value)}
          placeholder="/is-guvenligi/maximus-2-0-832551"
        />
        <button
          className="adm-btn"
          disabled={
            !previewPath.startsWith("/") || previewPath.startsWith("//")
          }
          onClick={() => onPreview(localizedHref(previewPath, locale))}
        >
          Bu dilde taslağı önizle ↗
        </button>
      </div>
      <p className="adm-muted">
        {filtered.length} farklı metin · Aşağıdaki alanlar isteğe bağlı çeviri
        düzeltmeleri içindir. Her dili ayrı ayrı düzenlemeniz gerekmez. Türkçe
        kaynak değişirse yeni metin otomatik çevrilir.
      </p>
      <div className="adm-translation-list">
        {filtered.slice(0, limit).map((entry) => {
          const own = overrides[entry.id]?.source === entry.source,
            translated = translateText(entry.source, locale, overrides);
          return (
            <article className="adm-translation-row" key={entry.id}>
              <div>
                <span className="adm-eyebrow">TÜRKÇE KAYNAK</span>
                <p dir="auto">{entry.source}</p>
                <small>
                  {entry.paths[0]}
                  {entry.paths.length > 1
                    ? " · " + entry.paths.length + " alanda kullanılır"
                    : ""}
                </small>
              </div>
              <div>
                <label>
                  <span>
                    {languageNames[locale]} ·{" "}
                    {own
                      ? overrides[entry.id].automatic
                        ? "Otomatik çeviri"
                        : "Özel çeviri"
                      : Object.hasOwn(dictionaries[locale], entry.source)
                        ? "Hazır çeviri"
                        : "Çeviri bekliyor"}
                  </span>
                  <textarea
                    aria-label={entry.source + " çevirisi"}
                    dir={locale === "ar" ? "rtl" : "ltr"}
                    lang={locale}
                    rows={entry.source.length > 150 ? 5 : 2}
                    value={translated}
                    onChange={(e) =>
                      change(entry.id, entry.source, e.target.value)
                    }
                  />
                </label>
                <button
                  className="adm-small"
                  disabled={!own}
                  onClick={() => change(entry.id, entry.source)}
                >
                  Varsayılana dön
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {filtered.length > limit && (
        <button className="adm-btn" onClick={() => setLimit((n) => n + 40)}>
          Daha fazla metin göster
        </button>
      )}
    </section>
  );
}

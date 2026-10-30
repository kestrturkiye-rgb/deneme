"use client";
import { useState } from "react";
import type { Content } from "@/cms/store";
import type { CustomBlock } from "@/cms/pages";
import { changeLayout, layoutFor, pageEntries } from "@/cms/workspace";
import { schemas, fieldLabels } from "@/cms/schema";
import manifest from "@/cms/manifest.json";
import { Editor } from "./FormEditor";
import { MediaField, useUploads, type Picker } from "./MediaEditor";
import type { UpdateContent } from "./ProductStudio";

type Path = (string | number)[];
type ImageRef = {
  path: Path;
  value: string;
  label: string;
  kind: "image" | "video";
};
function imagesIn(
  value: unknown,
  path: Path,
  label: string,
  labels?: Record<string, string>,
): ImageRef[] {
  if (typeof value === "string") {
    const key = String(path.at(-1));
    const video =
      /^(heroVideo|video)$/.test(key) || /\.(mp4|webm)(?:[?#]|$)/i.test(value);
    return video ||
      /^(image|heroImage|logo|src)$/.test(key) ||
      /\.(?:png|jpe?g|webp|avif|gif|svg)(?:[?#]|$)/i.test(value)
      ? [{ path, value, label, kind: video ? "video" : "image" }]
      : [];
  }
  if (Array.isArray(value))
    return value.flatMap((v, i) =>
      imagesIn(v, [...path, i], label + " · " + (i + 1)),
    );
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([key, v]) =>
      imagesIn(
        v,
        [...path, key],
        label + " / " + (labels?.[key] || fieldLabels[key] || key),
      ),
    );
  return [];
}
function setAt(value: unknown, path: Path, next: unknown): unknown {
  if (!path.length) return next;
  const [key, ...rest] = path;
  if (Array.isArray(value))
    return value.map((v, i) => (i === key ? setAt(v, rest, next) : v));
  const record = value as Record<string, unknown>;
  return { ...record, [key]: setAt(record?.[key], rest, next) };
}
const meta = manifest as Record<
  string,
  { title: string; labels: Record<string, string> }
>;
export default function PageWorkspace({
  content,
  update,
  pick,
  selectedPath,
  onSelect,
  onProduct,
  onPreview,
  homeOrder,
}: {
  content: Content;
  update: UpdateContent;
  pick: Picker;
  selectedPath: string;
  onSelect: (path: string) => void;
  onProduct: (slug: string, path: string) => void;
  onPreview: (path: string) => void;
  homeOrder: React.ReactNode;
}) {
  const [query, setQuery] = useState(""),
    [group, setGroup] = useState("Sayfalar"),
    [tab, setTab] = useState("images");
  const { pending } = useUploads();
  const entries = pageEntries(content),
    entry = entries.find((e) => e.path === selectedPath) || entries[0];
  const layout = layoutFor(content, entry.path);
  const raw = content[
    entry.sections.find((key) => key.startsWith("app-")) as keyof Content
  ] as unknown as Record<string, unknown> | undefined;
  const bannerTitle = String(raw?.metin01 || raw?.title || entry.title),
    bannerIntro = String(raw?.metin02 || raw?.intro || entry.intro || "");
  const bannerAvailable =
    entry.path !== "/" &&
    entry.path !== "/teklif-al" &&
    entry.group !== "Haber detayları";
  const references = entry.sections.flatMap((key) => {
    if (entry.group === "Haber detayları" && key === "data-news") {
      const index = entries
        .filter((e) => e.group === "Haber detayları")
        .findIndex((e) => e.path === entry.path);
      return imagesIn(
        content["data-news"].news[index],
        [key, "news", index],
        entry.title,
      );
    }
    if (entry.group === "Özel sayfalar" && key === "customPages") {
      const index = content.customPages.pages.findIndex(
        (p) => "/" + p.slug === entry.path,
      );
      return imagesIn(
        content.customPages.pages[index],
        [key, "pages", index],
        entry.title,
      );
    }
    return imagesIn(
      content[key as keyof Content],
      [key],
      meta[key]?.title || key,
      meta[key]?.labels,
    );
  });
  function change(change: (value: typeof layout) => typeof layout) {
    update((previous) =>
      changeLayout(
        previous,
        entry.path,
        change(layoutFor(previous, entry.path)),
      ),
    );
  }
  function changeBlock(index: number, patch: Partial<CustomBlock>) {
    change((l) => ({
      ...l,
      blocks: (l.blocks || []).map((b, i) =>
        i === index ? { ...b, ...patch } : b,
      ),
    }));
  }
  function moveBlock(index: number, to: number) {
    change((l) => {
      const blocks = [...(l.blocks || [])],
        [block] = blocks.splice(index, 1);
      blocks.splice(to, 0, block);
      return { ...l, blocks };
    });
  }
  function renderSection(key: string) {
    if (key === "home")
      return (
        <div className="adm-page-section" key={key}>
          <h3>Ana sayfa sırası ve görünürlük</h3>
          {homeOrder}
        </div>
      );
    let value = content[key as keyof Content],
      schema = schemas[key],
      path: Path = [key];
    if (entry.group === "Özel sayfalar" && key === "customPages") {
      const index = content.customPages.pages.findIndex(
        (p) => "/" + p.slug === entry.path,
      );
      path = [key, "pages", index];
      value = content.customPages.pages[index] as never;
      schema = schemas.customPages.fields!.pages.item!;
    }
    if (entry.group === "Haber detayları" && key === "data-news") {
      const index = entries
        .filter((e) => e.group === "Haber detayları")
        .findIndex((e) => e.path === entry.path);
      path = [key, "news", index];
      value = content["data-news"].news[index] as never;
      schema = schemas[key].fields!.news.item!;
    }
    if (entry.group === "Bölümler" && key === "data-divisions") {
      const index = content["data-divisions"].divisions.findIndex(
        (d) => "/" + d.slug === entry.path,
      );
      path = [key, "divisions", index];
      value = content["data-divisions"].divisions[index] as never;
      schema = schemas[key].fields!.divisions.item!;
    }
    return (
      <details
        className="adm-page-section"
        key={key}
        open={entry.sections.length === 1}
      >
        <summary>
          {meta[key]?.title || key}
          <small>
            {entry.sections.length > 1 && key !== entry.sections[0]
              ? "Ortak içerik"
              : "Bu sayfanın içeriği"}
          </small>
        </summary>
        <div className="adm-section-fields">
          <Editor
            labels={meta[key]?.labels}
            value={value}
            schema={schema}
            label={meta[key]?.title || key}
            path={path.join(".")}
            pick={pick}
            onChange={(next) =>
              update((previous) => setAt(previous, path, next) as Content)
            }
          />
        </div>
      </details>
    );
  }
  return (
    <div className="adm-pages-workspace">
      <aside className="adm-pages-index">
        <input
          aria-label="Sayfa ara"
          placeholder="Sayfa adı veya adresi ara…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Sayfa grubu"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        >
          {[
            "Sayfalar",
            "Bölümler",
            "Haber detayları",
            "Özel sayfalar",
            "Ürünler ve kategoriler",
            "Tümü",
          ].map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <div className="adm-page-links">
          {entries
            .filter(
              (e) =>
                (group === "Tümü" || e.group === group) &&
                (e.title + " " + e.path)
                  .toLocaleLowerCase("tr")
                  .includes(query.toLocaleLowerCase("tr")),
            )
            .map((e) => (
              <button
                type="button"
                key={e.path}
                disabled={pending > 0}
                className={entry.path === e.path ? "active" : ""}
                onClick={() => {
                  if (e.productSlug) onProduct(e.productSlug, e.path);
                  else {
                    onSelect(e.path);
                    setTab("images");
                  }
                }}
              >
                <strong>{e.title}</strong>
                <small>{e.path}</small>
              </button>
            ))}
        </div>
      </aside>
      <section className="adm-page-workspace" key={entry.path}>
        <header className="adm-product-header">
          <div>
            <span className="adm-eyebrow">SAYFA DÜZENLEYİCİ</span>
            <h2>{entry.title}</h2>
            <p className="adm-muted">{entry.path}</p>
          </div>
          <button
            type="button"
            className="adm-btn"
            disabled={pending > 0}
            onClick={() => onPreview(entry.path)}
          >
            Bu sayfayı önizle ↗
          </button>
        </header>
        <nav className="adm-editor-tabs" aria-label="Sayfa düzenleme bölümleri">
          {[
            ["images", "Görseller ve banner"],
            ["content", "İçerik ve ayarlar"],
            ["blocks", "Fotoğraflı bloklar"],
          ].map(([id, label]) => (
            <button
              type="button"
              key={id}
              aria-pressed={tab === id}
              className={tab === id ? "active" : ""}
              disabled={pending > 0}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        {tab === "images" && (
          <>
            {bannerAvailable && (
              <section className="adm-page-banner-editor">
                <div className="adm-editor-heading">
                  <div>
                    <h3>Sayfa bannerı</h3>
                    <p>
                      Bu değişiklikler yalnızca {entry.title} sayfasına
                      uygulanır.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="adm-small"
                    onClick={() =>
                      change((l) => {
                        const next = { ...l };
                        delete next.banner;
                        return next;
                      })
                    }
                  >
                    Varsayılan bannera dön
                  </button>
                </div>
                <label className="adm-toggle">
                  <input
                    type="checkbox"
                    checked={!layout.banner?.hidden}
                    onChange={(e) =>
                      change((l) => ({
                        ...l,
                        banner: { ...l.banner, hidden: !e.target.checked },
                      }))
                    }
                  />
                  <span>Bannerı göster</span>
                </label>
                <MediaField
                  value={layout.banner?.image ?? entry.image ?? ""}
                  label="Banner görseli"
                  pick={pick}
                  onChange={(image) =>
                    change((l) => ({ ...l, banner: { ...l.banner, image } }))
                  }
                />
                <label className="adm-field">
                  <span>Banner görsel açıklaması</span>
                  <input
                    value={layout.banner?.alt || ""}
                    onChange={(e) =>
                      change((l) => ({
                        ...l,
                        banner: { ...l.banner, alt: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className="adm-field">
                  <span>Banner başlığı</span>
                  <input
                    value={layout.banner?.title ?? bannerTitle}
                    onChange={(e) =>
                      change((l) => ({
                        ...l,
                        banner: { ...l.banner, title: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className="adm-field">
                  <span>Banner açıklaması</span>
                  <textarea
                    value={layout.banner?.intro ?? bannerIntro}
                    onChange={(e) =>
                      change((l) => ({
                        ...l,
                        banner: { ...l.banner, intro: e.target.value },
                      }))
                    }
                  />
                </label>
              </section>
            )}
            <h3 className="adm-section-title">Sayfada kullanılan görseller</h3>
            <p className="adm-muted">
              Ortak bileşenlerdeki görseller, aynı bileşeni kullanan diğer
              sayfalarda da güncellenir.
            </p>
            <div className="adm-page-media-grid">
              {references.map((ref) => (
                <MediaField
                  key={ref.path.join(".")}
                  value={ref.value}
                  label={ref.label}
                  kind={ref.kind}
                  pick={pick}
                  onChange={(value) =>
                    update(
                      (previous) => setAt(previous, ref.path, value) as Content,
                    )
                  }
                />
              ))}
            </div>
            {!references.length && (
              <p className="adm-muted">
                Bu sayfaya banner veya fotoğraflı blok ekleyebilirsiniz. Mevcut
                metinleri İçerik ve ayarlar sekmesinden düzenleyin.
              </p>
            )}
          </>
        )}
        {tab === "content" && (
          <div className="adm-page-sections">
            {entry.sections.map(renderSection)}
          </div>
        )}
        {tab === "blocks" && (
          <section className="adm-page-block-editor">
            <div className="adm-editor-heading">
              <div>
                <h3>Fotoğraflı içerik blokları</h3>
                <p>
                  Sayfaya görsel, metin ve bağlantı ekleyin. Blokları sıralayın
                  veya görünürlüklerini kapatın.
                </p>
              </div>
              <button
                type="button"
                className="adm-btn adm-primary"
                disabled={pending > 0}
                onClick={() =>
                  change((l) => ({
                    ...l,
                    blocks: [
                      ...(l.blocks || []),
                      {
                        title: "Yeni bölüm",
                        text: "",
                        image: "",
                        alt: "",
                        buttonLabel: "",
                        buttonHref: "",
                        visible: true,
                        layout: "image-right",
                      },
                    ],
                  }))
                }
              >
                + Blok ekle
              </button>
            </div>
            {entry.path !== "/" && (
              <details className="adm-layout-mode">
                <summary>Sayfa yerleşimi</summary>
                <label className="adm-toggle">
                  <input
                    type="checkbox"
                    checked={!!layout.replaceContent}
                    onChange={(e) =>
                      change((l) => ({
                        ...l,
                        replaceContent: e.target.checked,
                        banner: {
                          title: bannerTitle,
                          intro: bannerIntro,
                          ...l.banner,
                        },
                      }))
                    }
                  />
                  <span>Sayfayı yalnızca bu bloklarla oluştur</span>
                </label>
                <p className="adm-muted">
                  Bu modda mevcut sayfanın form ve listeleri gizlenir. İşareti
                  kaldırarak mevcut düzene dönebilirsiniz.
                </p>
              </details>
            )}
            {(layout.blocks || []).map((block, i) => (
              <article className="adm-block-card" key={i}>
                <header>
                  <strong>
                    {i + 1}. {block.title || "İçerik bloğu"}
                  </strong>
                  <div className="adm-item-actions">
                    <button
                      type="button"
                      aria-label={`Blok ${i + 1} yukarı`}
                      disabled={pending > 0 || i === 0}
                      onClick={() => moveBlock(i, i - 1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Blok ${i + 1} aşağı`}
                      disabled={
                        pending > 0 || i === (layout.blocks?.length || 0) - 1
                      }
                      onClick={() => moveBlock(i, i + 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="adm-danger"
                      disabled={pending > 0}
                      onClick={() =>
                        change((l) => ({
                          ...l,
                          blocks: l.blocks?.filter((_, j) => j !== i),
                        }))
                      }
                    >
                      Bloğu sil
                    </button>
                  </div>
                </header>
                <label className="adm-toggle">
                  <input
                    type="checkbox"
                    checked={block.visible !== false}
                    onChange={(e) =>
                      changeBlock(i, { visible: e.target.checked })
                    }
                  />
                  <span>Bloğu göster</span>
                </label>
                <label className="adm-field">
                  <span>Başlık</span>
                  <input
                    value={block.title}
                    onChange={(e) => changeBlock(i, { title: e.target.value })}
                  />
                </label>
                <label className="adm-field">
                  <span>Metin</span>
                  <textarea
                    rows={4}
                    value={block.text}
                    onChange={(e) => changeBlock(i, { text: e.target.value })}
                  />
                </label>
                <MediaField
                  value={block.image}
                  label={`${i + 1}. blok görseli`}
                  pick={pick}
                  onChange={(image) => changeBlock(i, { image })}
                />
                <label className="adm-field">
                  <span>Görsel açıklaması</span>
                  <input
                    value={block.alt}
                    onChange={(e) => changeBlock(i, { alt: e.target.value })}
                  />
                </label>
                <label className="adm-field">
                  <span>Görsel yerleşimi</span>
                  <select
                    aria-label="Görsel yerleşimi"
                    value={block.layout || "image-right"}
                    onChange={(e) => changeBlock(i, { layout: e.target.value })}
                  >
                    <option value="image-right">Görsel sağda</option>
                    <option value="image-left">Görsel solda</option>
                    <option value="full">Tam genişlik görsel</option>
                  </select>
                </label>
                <div className="adm-two-fields">
                  <label className="adm-field">
                    <span>Düğme metni</span>
                    <input
                      value={block.buttonLabel}
                      onChange={(e) =>
                        changeBlock(i, { buttonLabel: e.target.value })
                      }
                    />
                  </label>
                  <label className="adm-field">
                    <span>Düğme bağlantısı</span>
                    <input
                      value={block.buttonHref}
                      onChange={(e) =>
                        changeBlock(i, { buttonHref: e.target.value })
                      }
                    />
                  </label>
                </div>
              </article>
            ))}
            {!layout.blocks?.length && (
              <p className="adm-muted">
                Henüz ek blok yok. Mevcut sayfa içeriği korunuyor.
              </p>
            )}
          </section>
        )}
      </section>
    </div>
  );
}

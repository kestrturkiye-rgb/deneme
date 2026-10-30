"use client";
import { useEffect, useState } from "react";
import type { Content } from "@/cms/store";
import { ContentProvider } from "@/cms/context";
import { schemas, slugify } from "@/cms/schema";
import type { Detail, ProductColor, ProductVariant } from "@/data/details";
import { productView, type MediaScope } from "@/lib/product-view";
import { Editor } from "./FormEditor";
import {
  GalleryEditor,
  SpinEditor,
  useUploads,
  type Picker,
} from "./MediaEditor";

export type UpdateContent = (change: (previous: Content) => Content) => void;
type ProductRow = {
  name: string;
  slug: string;
  division: string;
  divisionTitle: string;
  group: string;
  parentSlug?: string;
  relatedFamilies?: string[];
};
function rows(content: Content): ProductRow[] {
  return content["data-divisions"].divisions.flatMap((d) =>
    d.groups.flatMap((g) =>
      g.items.map((p) => ({
        ...p,
        division: d.slug,
        divisionTitle: d.title,
        group: g.title,
      })),
    ),
  );
}
function uniqueId(base: string, ids: string[]) {
  let id = base || "yeni",
    i = 2;
  while (ids.includes(id)) id = base + "-" + i++;
  return id;
}
type Scope = MediaScope & { colors?: ProductColor[] };
function getScope(detail: Detail, key: string): Scope {
  const [v, c] = key.split(":");
  if (v === "base") return c ? detail.colors?.[Number(c)] || {} : detail;
  const variant = detail.variants?.[Number(v)];
  return c ? variant?.colors?.[Number(c)] || {} : variant || {};
}
function putScope(detail: Detail, key: string, next: Scope): Detail {
  const [v, c] = key.split(":");
  if (v === "base")
    return c
      ? {
          ...detail,
          colors: detail.colors?.map((p, i) =>
            i === Number(c) ? (next as ProductColor) : p,
          ),
        }
      : next;
  return {
    ...detail,
    variants: detail.variants?.map((variant, i) =>
      i !== Number(v)
        ? variant
        : c
          ? {
              ...variant,
              colors: variant.colors?.map((color, j) =>
                j === Number(c) ? (next as ProductColor) : color,
              ),
            }
          : (next as ProductVariant),
    ),
  };
}
export default function ProductStudio({
  content,
  update,
  pick,
  selectedSlug,
  onSelect,
  onPreview,
}: {
  content: Content;
  update: UpdateContent;
  pick: Picker;
  selectedSlug: string;
  onSelect: (slug: string, path: string) => void;
  onPreview: (path: string) => void;
}) {
  const products = rows(content),
    selected: ProductRow = products.find((p) => p.slug === selectedSlug) ||
      products[0] || {
        name: "",
        slug: "",
        division: "",
        divisionTitle: "",
        group: "",
      };
  const details = content["data-details"].details as Record<string, Detail>,
    detail = details[selected?.slug] || {};
  const [query, setQuery] = useState(""),
    [division, setDivision] = useState(""),
    [tab, setTab] = useState("images"),
    [scopeKey, setScopeKey] = useState("base"),
    [create, setCreate] = useState(false),
    [newName, setNewName] = useState(""),
    [newDivision, setNewDivision] = useState(
      content["data-divisions"].divisions[0]?.slug || "",
    ),
    [newGroup, setNewGroup] = useState(0),
    [newParent, setNewParent] = useState(""),
    [partName, setPartName] = useState("");
  const { pending } = useUploads();
  useEffect(() => {
    setTab("images");
    if (selected.slug)
      onSelect(selected.slug, `/${selected.division}/${selected.slug}`);
    const v = detail.variants?.[0];
    setScopeKey(
      v
        ? v.colors?.length
          ? "0:0"
          : "0"
        : detail.colors?.length
          ? "base:0"
          : "base",
    );
  }, [selected?.slug]);
  const scopes = [
    { key: "base", label: "Genel ürün" },
    ...(detail.colors || []).map((c, i) => ({
      key: "base:" + i,
      label: "Genel ürün / " + c.label,
    })),
    ...(detail.variants || []).flatMap((v, i) => [
      { key: String(i), label: v.label },
      ...(v.colors || []).map((c, j) => ({
        key: i + ":" + j,
        label: v.label + " / " + c.label,
      })),
    ]),
  ];
  const currentScope = scopes.find((v) => v.key === scopeKey) || scopes[0];
  const activeScopeKey = currentScope.key,
    scope = getScope(detail, activeScopeKey);
  const href = selected ? `/${selected.division}/${selected.slug}` : "/";
  function changeDetail(change: (d: Detail) => Detail) {
    const slug = selected.slug;
    update((previous) => ({
      ...previous,
      "data-details": {
        details: {
          ...previous["data-details"].details,
          [slug]: change(
            (previous["data-details"].details as Record<string, Detail>)[
              slug
            ] || {},
          ),
        },
      },
    }));
  }
  function changeScope(change: (s: Scope) => Scope) {
    changeDetail((previous) =>
      putScope(
        previous,
        activeScopeKey,
        change(getScope(previous, activeScopeKey)),
      ),
    );
  }
  function catalogPatch(
    patch: { name?: string; parentSlug?: string; relatedFamilies?: string[] },
    group?: string,
  ) {
    update((previous) => {
      const divisions = previous["data-divisions"].divisions.map((d) => {
        if (d.slug !== selected.division) return d;
        const item = d.groups
          .flatMap((g) => g.items)
          .find((p) => p.slug === selected.slug)!;
        return {
          ...d,
          groups: d.groups.map((g) => ({
            ...g,
            items: group
              ? g.title === group
                ? [
                    ...g.items.filter((p) => p.slug !== selected.slug),
                    { ...item, ...patch },
                  ]
                : g.items.filter((p) => p.slug !== selected.slug)
              : g.items.map((p) =>
                  p.slug === selected.slug ? { ...p, ...patch } : p,
                ),
          })),
        };
      });
      return { ...previous, "data-divisions": { divisions } };
    });
  }
  function addProduct() {
    const name = newName.trim();
    if (!name) return;
    const slug = uniqueId(
      slugify(name),
      products.map((p) => p.slug),
    );
    const d = content["data-divisions"].divisions.find(
      (d) => d.slug === newDivision,
    );
    if (!d?.groups[newGroup]) return;
    update((previous) => ({
      ...previous,
      "data-divisions": {
        divisions: previous["data-divisions"].divisions.map((d) =>
          d.slug !== newDivision
            ? d
            : {
                ...d,
                groups: d.groups.map((g, i) =>
                  i !== newGroup
                    ? g
                    : {
                        ...g,
                        items: [
                          ...g.items,
                          {
                            name,
                            slug,
                            parentSlug: newParent,
                            relatedFamilies: [],
                          },
                        ],
                      },
                ),
              },
        ),
      },
      "data-details": {
        details: {
          ...previous["data-details"].details,
          [slug]: { description: [], images: [], features: [], documents: [] },
        },
      },
    }));
    onSelect(slug, `/${newDivision}/${slug}`);
    setCreate(false);
    setNewName("");
    setQuery("");
    setDivision("");
  }
  const children = products.filter(
    (p) =>
      p.parentSlug === selected.slug ||
      p.relatedFamilies?.includes(selected.slug),
  );
  const parents = products.filter(
    (p) =>
      p.division === selected.division &&
      !p.parentSlug &&
      p.slug !== selected.slug,
  );
  const contentSchema = {
    ...schemas["data-details"].fields!.details.item!,
    fields: Object.fromEntries(
      Object.entries(
        schemas["data-details"].fields!.details.item!.fields!,
      ).filter(
        ([key]) =>
          !["images", "spin", "spinDisabled", "variants", "colors"].includes(
            key,
          ),
      ),
    ),
  };
  function addPart(label: string) {
    const id = uniqueId(
      slugify(label),
      detail.variants?.map((v) => v.id) || [],
    );
    changeDetail((d) => ({
      ...d,
      variants: [...(d.variants || []), { id, label, images: [] }],
    }));
    setScopeKey(String(detail.variants?.length || 0));
    setTab("images");
    setPartName("");
  }
  function addColor(variant?: number) {
    changeDetail((d) => {
      const target = variant === undefined ? d : d.variants![variant],
        colors = target.colors || [],
        next = {
          ...target,
          colors: [
            ...colors,
            {
              id: uniqueId(
                "renk",
                colors.map((c) => c.id),
              ),
              label: "Yeni renk",
              swatch: "#263b50",
              images: [],
            },
          ],
        };
      return variant === undefined
        ? (next as Detail)
        : {
            ...d,
            variants: d.variants?.map((v, i) =>
              i === variant ? (next as ProductVariant) : v,
            ),
          };
    });
  }
  function colorFields(colors: ProductColor[], variant?: number) {
    return colors.map((color, i) => (
      <div className="adm-option-row" key={color.id}>
        <label>
          Renk adı
          <input
            aria-label={`${variant === undefined ? "Genel" : detail.variants?.[variant]?.label} ${i + 1}. renk adı`}
            value={color.label}
            onChange={(e) =>
              changeDetail((d) => {
                const k = variant === undefined ? "base" : String(variant),
                  target = getScope(d, k);
                return putScope(d, k, {
                  ...target,
                  colors: target.colors?.map((c, j) =>
                    j === i ? { ...c, label: e.target.value } : c,
                  ),
                });
              })
            }
          />
        </label>
        <label>
          Renk örneği
          <input
            type="color"
            value={color.swatch}
            onChange={(e) =>
              changeDetail((d) => {
                const k = variant === undefined ? "base" : String(variant),
                  target = getScope(d, k);
                return putScope(d, k, {
                  ...target,
                  colors: target.colors?.map((c, j) =>
                    j === i ? { ...c, swatch: e.target.value } : c,
                  ),
                });
              })
            }
          />
        </label>
        <button
          type="button"
          className="adm-small"
          onClick={() => {
            setScopeKey((variant === undefined ? "base" : variant) + ":" + i);
            setTab("images");
          }}
        >
          Görseller / 360°
        </button>
        <button
          type="button"
          className="adm-small adm-danger"
          onClick={() => {
            if (confirm("Bu renk seçeneği taslaktan kaldırılsın mı?"))
              changeDetail((d) => {
                const k = variant === undefined ? "base" : String(variant),
                  target = getScope(d, k);
                return putScope(d, k, {
                  ...target,
                  colors: target.colors?.filter((_, j) => j !== i),
                });
              });
          }}
        >
          Rengi sil
        </button>
      </div>
    ));
  }
  return (
    <ContentProvider content={content}>
      <div className="adm-product-studio">
        <div className="adm-studio-toolbar">
          <p>
            <strong>{products.length}</strong> ürün ve kategori · Her ürünün
            görselleri ve dönüş serisi ayrıdır.
          </p>
          <button
            type="button"
            className="adm-btn adm-primary"
            disabled={pending > 0}
            onClick={() => setCreate(!create)}
          >
            + Yeni ürün
          </button>
        </div>
        {create && (
          <section className="adm-create-product">
            <h3>Yeni ürün ekle</h3>
            <label>
              Ürün adı
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </label>
            <label>
              Faaliyet alanı
              <select
                aria-label="Faaliyet alanı"
                value={newDivision}
                onChange={(e) => {
                  setNewDivision(e.target.value);
                  setNewGroup(0);
                  setNewParent("");
                }}
              >
                {content["data-divisions"].divisions.map((d) => (
                  <option key={d.slug} value={d.slug}>
                    {d.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ürün grubu
              <select
                aria-label="Ürün grubu"
                value={newGroup}
                onChange={(e) => setNewGroup(Number(e.target.value))}
              >
                {content["data-divisions"].divisions
                  .find((d) => d.slug === newDivision)
                  ?.groups.map((g, i) => (
                    <option key={g.title} value={i}>
                      {g.title}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Ana ürün ailesi
              <select
                aria-label="Ana ürün ailesi"
                value={newParent}
                onChange={(e) => setNewParent(e.target.value)}
              >
                <option value="">Bağımsız ürün</option>
                {products
                  .filter((p) => p.division === newDivision && !p.parentSlug)
                  .map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              className="adm-btn adm-primary"
              disabled={!newName.trim()}
              onClick={addProduct}
            >
              Ürünü oluştur
            </button>
          </section>
        )}
        <div className="adm-product-layout">
          <aside className="adm-product-list">
            <input
              placeholder="Ürün adı veya kodu ara…"
              aria-label="Ürün ara"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Ürünleri faaliyet alanına göre süz"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
            >
              <option value="">Tüm faaliyet alanları</option>
              {content["data-divisions"].divisions.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.title}
                </option>
              ))}
            </select>
            <div className="adm-product-scroll">
              {products
                .filter(
                  (p) =>
                    (!division || p.division === division) &&
                    (p.name + " " + p.slug)
                      .toLocaleLowerCase("tr")
                      .includes(query.toLocaleLowerCase("tr")),
                )
                .map((p) => {
                  const view = productView(details[p.slug]);
                  return (
                    <button
                      type="button"
                      key={p.slug}
                      disabled={pending > 0}
                      className={selected.slug === p.slug ? "active" : ""}
                      onClick={() =>
                        onSelect(p.slug, `/${p.division}/${p.slug}`)
                      }
                    >
                      {view.image ? (
                        <img src={view.image} alt="" loading="lazy" />
                      ) : (
                        <span className="adm-product-placeholder">◇</span>
                      )}
                      <span>
                        {p.name}
                        <small>
                          {p.divisionTitle} ·{" "}
                          {p.parentSlug ? "Model" : "Ürün / kategori"}
                        </small>
                      </span>
                      {view.frames.length >= 2 && <b>360°</b>}
                    </button>
                  );
                })}
            </div>
          </aside>
          <div className="adm-product-form" key={selected.slug}>
            {!selected.slug ? (
              <p className="adm-muted">
                Henüz ürün yok. Yeni ürün düğmesiyle başlayın; önce bir faaliyet
                alanı ve ürün grubu oluşturulmuş olmalı.
              </p>
            ) : (
              <>
                <header className="adm-product-header">
                  <div>
                    <p className="adm-eyebrow">{selected.group}</p>
                    <h2>{selected.name}</h2>
                    <p className="adm-muted">{href}</p>
                  </div>
                  <button
                    type="button"
                    className="adm-btn"
                    disabled={pending > 0}
                    onClick={() => onPreview(href)}
                  >
                    Bu ürünü önizle ↗
                  </button>
                </header>
                {!!children.length && (
                  <details className="adm-family-note">
                    <summary>
                      Bu bir ürün ailesi · {children.length} model
                    </summary>
                    <p>
                      Kategori kapağını burada, kıyafet fotoğraflarını ilgili
                      modelin içinde düzenleyin.
                    </p>
                    <div className="adm-actions">
                      {children.map((p) => (
                        <button
                          type="button"
                          className="adm-small"
                          key={p.slug}
                          disabled={pending > 0}
                          onClick={() =>
                            onSelect(p.slug, `/${p.division}/${p.slug}`)
                          }
                        >
                          {p.name} →
                        </button>
                      ))}
                    </div>
                  </details>
                )}
                <nav
                  className="adm-editor-tabs"
                  aria-label="Ürün düzenleme bölümleri"
                >
                  {[
                    ["images", "Görseller"],
                    ["spin", "360°"],
                    ["content", "İçerik ve belgeler"],
                    ["variants", "Parçalar ve renkler"],
                    ["settings", "Ürün bilgileri"],
                  ].map(([key, label]) => (
                    <button
                      type="button"
                      key={key}
                      className={tab === key ? "active" : ""}
                      aria-pressed={tab === key}
                      disabled={pending > 0}
                      onClick={() => setTab(key)}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
                {(tab === "images" || tab === "spin") && (
                  <>
                    <label className="adm-scope-select">
                      Düzenlenen görünüm
                      <select
                        aria-label="Düzenlenen ürün görünümü"
                        value={currentScope.key}
                        disabled={pending > 0}
                        onChange={(e) => setScopeKey(e.target.value)}
                      >
                        {scopes.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {scopes.length > 1 && (
                      <p className="adm-muted">
                        Sayfa ilk parça ve ilk renkle açılır. Her parçanın ve
                        rengin fotoğraflarını kendi görünümünde düzenleyin.
                      </p>
                    )}
                  </>
                )}
                {tab === "images" && (
                  <GalleryEditor
                    key={activeScopeKey}
                    value={
                      scope.images ??
                      (!activeScopeKey.includes(":")
                        ? detail.images
                        : undefined) ??
                      []
                    }
                    onChange={(images) =>
                      changeScope((s) => ({ ...s, images }))
                    }
                    pick={pick}
                  />
                )}
                {tab === "spin" && (
                  <SpinEditor
                    key={activeScopeKey}
                    name={selected.name + " · " + currentScope.label}
                    value={scope}
                    onChange={(next) => changeScope(() => next)}
                    pick={pick}
                  />
                )}
                {tab === "content" && (
                  <Editor
                    value={detail}
                    schema={contentSchema}
                    label="Ürün içeriği"
                    path={"data-details.details." + selected.slug}
                    pick={pick}
                    onChange={(v) => changeDetail(() => v as Detail)}
                  />
                )}
                {tab === "variants" && (
                  <section className="adm-variant-editor">
                    <h3>Genel ürün renkleri</h3>
                    {colorFields(detail.colors || [])}
                    <button
                      type="button"
                      className="adm-btn"
                      onClick={() => addColor()}
                    >
                      + Renk ekle
                    </button>
                    <h3>Ceket, pantolon ve diğer parçalar</h3>
                    <p className="adm-muted">
                      Her parçaya ayrı fotoğraf, renk ve 360° serisi
                      ekleyebilirsiniz.
                    </p>
                    <div className="adm-actions">
                      <button
                        type="button"
                        className="adm-btn"
                        onClick={() => addPart("Ceket")}
                      >
                        + Ceket
                      </button>
                      <button
                        type="button"
                        className="adm-btn"
                        onClick={() => addPart("Pantolon")}
                      >
                        + Pantolon
                      </button>
                      <input
                        aria-label="Yeni parça adı"
                        placeholder="Diğer parça adı"
                        value={partName}
                        onChange={(e) => setPartName(e.target.value)}
                      />
                      <button
                        type="button"
                        className="adm-btn"
                        disabled={!partName.trim()}
                        onClick={() => addPart(partName.trim())}
                      >
                        Parça ekle
                      </button>
                    </div>
                    {detail.variants?.map((variant, i) => (
                      <article className="adm-variant-card" key={variant.id}>
                        <label>
                          Parça adı
                          <input
                            value={variant.label}
                            onChange={(e) =>
                              changeDetail((d) => ({
                                ...d,
                                variants: d.variants?.map((v, j) =>
                                  j === i ? { ...v, label: e.target.value } : v,
                                ),
                              }))
                            }
                          />
                        </label>
                        <div className="adm-actions">
                          <button
                            type="button"
                            className="adm-btn"
                            onClick={() => {
                              setScopeKey(String(i));
                              setTab("images");
                            }}
                          >
                            Fotoğraf / 360° düzenle
                          </button>
                          <button
                            type="button"
                            className="adm-small"
                            onClick={() => addColor(i)}
                          >
                            + Parçaya renk ekle
                          </button>
                          <button
                            type="button"
                            className="adm-small adm-danger"
                            onClick={() => {
                              if (
                                confirm(
                                  "Bu parça ve ona ait görsel bağlantıları taslaktan kaldırılsın mı?",
                                )
                              )
                                changeDetail((d) => ({
                                  ...d,
                                  variants: d.variants?.filter(
                                    (_, j) => j !== i,
                                  ),
                                }));
                            }}
                          >
                            Parçayı kaldır
                          </button>
                        </div>
                        {colorFields(variant.colors || [], i)}
                      </article>
                    ))}
                  </section>
                )}
                {tab === "settings" && (
                  <section className="adm-product-settings">
                    <label className="adm-field">
                      <span>Ürün adı</span>
                      <input
                        value={selected.name}
                        onChange={(e) => catalogPatch({ name: e.target.value })}
                      />
                    </label>
                    <label className="adm-field">
                      <span>Ürün grubu</span>
                      <select
                        aria-label="Ürün grubu"
                        value={selected.group}
                        onChange={(e) => catalogPatch({}, e.target.value)}
                      >
                        {content["data-divisions"].divisions
                          .find((d) => d.slug === selected.division)
                          ?.groups.map((g) => (
                            <option key={g.title}>{g.title}</option>
                          ))}
                      </select>
                    </label>
                    <label className="adm-field">
                      <span>Ana ürün ailesi</span>
                      <select
                        aria-label="Ana ürün ailesi"
                        value={selected.parentSlug || ""}
                        disabled={children.length > 0}
                        onChange={(e) =>
                          catalogPatch({ parentSlug: e.target.value })
                        }
                      >
                        <option value="">Bağımsız ürün / kategori</option>
                        {parents.map((p) => (
                          <option value={p.slug} key={p.slug}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <fieldset>
                      <legend>Diğer ürün ailelerinde de göster</legend>
                      {parents.map((p) => (
                        <label className="adm-toggle" key={p.slug}>
                          <input
                            type="checkbox"
                            checked={
                              selected.relatedFamilies?.includes(p.slug) ||
                              false
                            }
                            disabled={children.length > 0}
                            onChange={(e) =>
                              catalogPatch({
                                relatedFamilies: e.target.checked
                                  ? [
                                      ...(selected.relatedFamilies || []),
                                      p.slug,
                                    ]
                                  : (selected.relatedFamilies || []).filter(
                                      (v) => v !== p.slug,
                                    ),
                              })
                            }
                          />
                          <span>{p.name}</span>
                        </label>
                      ))}
                    </fieldset>
                    <p className="adm-muted">
                      Ürün adı değişse de mevcut web adresi korunur.
                    </p>
                    <label className="adm-field">
                      <span>Mevcut bir üründen içerik kopyala</span>
                      <select
                        aria-label="Mevcut bir üründen içerik kopyala"
                        value=""
                        onChange={(e) => {
                          const source = e.target.value;
                          if (
                            source &&
                            confirm(
                              "Bu ürünün taslak açıklamaları ve görsel bağlantıları kaynak ürünle değiştirilsin mi?",
                            )
                          )
                            changeDetail(() =>
                              structuredClone(details[source]),
                            );
                        }}
                      >
                        <option value="">Kaynak ürün seçin…</option>
                        {products
                          .filter(
                            (p) => p.slug !== selected.slug && details[p.slug],
                          )
                          .map((p) => (
                            <option key={p.slug} value={p.slug}>
                              {p.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </ContentProvider>
  );
}

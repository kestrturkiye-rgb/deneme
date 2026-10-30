"use client";
import { useRef, useState } from "react";
import { emptyValue, fieldLabels, type Schema } from "@/cms/schema";
import { uploadMedia } from "@/lib/upload-media";
import {
  MediaField,
  GalleryEditor,
  useUploads,
  type Picker,
} from "./MediaEditor";
function titleFor(value: unknown, index: number) {
  if (typeof value === "string")
    return value.slice(0, 95) || `Öğe ${index + 1}`;
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    return String(
      v.title || v.label || v.name || v.id || v.src || `Öğe ${index + 1}`,
    ).slice(0, 95);
  }
  return `Öğe ${index + 1}`;
}
export function Expand({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={"adm-expand" + (open ? " is-open" : "")}>
      <div className="adm-expand-head">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span>{open ? "⌄" : "›"}</span>
          {title}
        </button>
        {actions}
      </div>
      {open && <div className="adm-expand-body">{children}</div>}
    </div>
  );
}
function BulkFrames({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (v: unknown) => void;
}) {
  const { start } = useUploads();
  const [progress, setProgress] = useState(""),
    [uploadError, setUploadError] = useState("");
  const latest = useRef(value);
  latest.current = value;
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    if (Array.isArray(latest.current.angles) && latest.current.angles.length) {
      setUploadError(
        "Bu seride özel açı bilgileri var. Açıları koruyarak kare eklemek için Ürün detayları → 360° bölümünü kullanın.",
      );
      return;
    }
    const sorted = Array.from(files).sort((a, b) =>
      a.name.localeCompare(b.name, "tr", { numeric: true }),
    );
    if (sorted.length < 2 || sorted.length > 500) {
      setUploadError(
        "Bir dönüş için 2–500 kare seçin. Akıcı görüntü için 24–72 kare önerilir.",
      );
      return;
    }
    if (
      ((latest.current.frames as unknown[]) || []).length + sorted.length >
      500
    ) {
      setUploadError(
        "Toplam kare sayısı 500’ü aşamaz. Önce mevcut kareleri temizleyin.",
      );
      return;
    }
    setUploadError("");
    const finish = start();
    const urls: string[] = [];
    try {
      for (const [index, file] of sorted.entries()) {
        if (!file.type.startsWith("image/"))
          throw new Error("Yalnızca görüntü dosyaları seçin.");
        setProgress(`Kareler yükleniyor: ${index + 1} / ${sorted.length}`);
        const item = await uploadMedia(file);
        urls.push(item.url);
      }
      const next = {
        ...latest.current,
        frames: [...((latest.current.frames as string[]) || []), ...urls],
      };
      for (const key of ["pattern", "count", "start", "pad"])
        delete (next as Record<string, unknown>)[key];
      onChange(next);
    } catch (e) {
      setUploadError(
        (e as Error).message +
          " Tamamlanan dosyalar medya kütüphanesinde bulunur; kare listesi değiştirilmedi.",
      );
    } finally {
      setProgress("");
      finish();
    }
  }
  return (
    <div className="adm-spin-upload">
      <strong>360° karelerini topluca yükleyin</strong>
      <p>
        Ürünün etrafındaki fotoğrafları birlikte seçin. Dosya adları 1, 2, 3…
        sırasına göre yüklenir. Ceket ve pantolon için ayrı kare dizileri
        kullanın.
      </p>
      <label className="adm-upload">
        <span>{progress || "↑ 360° karelerini seç"}</span>
        <small>
          Öneri: 24–72 kare, aynı ölçü ve arka plan. Tek fotoğraf 360°
          oluşturmaz.
        </small>
        <input
          multiple
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          disabled={Boolean(progress)}
          onChange={(e) => {
            upload(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {Array.isArray(value.frames) && (
        <div className="adm-spin-count">
          <span>{value.frames.length} kare</span>
          <button
            type="button"
            disabled={Boolean(progress)}
            className="adm-small"
            onClick={() => {
              if (
                confirm(
                  "Bu ürünün kare listesi temizlensin mi? Dosyalar medya kütüphanesinde kalır.",
                )
              ) {
                const next = { ...value, frames: [] };
                for (const key of [
                  "angles",
                  "pattern",
                  "count",
                  "start",
                  "pad",
                ])
                  delete (next as Record<string, unknown>)[key];
                onChange(next);
              }
            }}
          >
            Kare listesini temizle
          </button>
        </div>
      )}
      {uploadError && (
        <p className="adm-alert" role="alert">
          {uploadError}
        </p>
      )}
    </div>
  );
}
export function Editor({
  value,
  schema,
  onChange,
  label,
  path = "",
  pick,
  labels,
}: {
  value: unknown;
  schema: Schema;
  onChange: (v: unknown) => void;
  label: string;
  path?: string;
  pick: Picker;
  labels?: Record<string, string>;
}) {
  const mediaPath =
    /\.(image|heroImage|logo|src)$/.test(path) ||
    path === "components-Header.metin09";
  const videoPath = /\.(heroVideo|video)$/.test(path);
  if (
    value === undefined &&
    schema.type === "string" &&
    (mediaPath || videoPath)
  )
    return (
      <MediaField
        value=""
        onChange={onChange}
        pick={pick}
        label={label}
        kind={videoPath ? "video" : "image"}
      />
    );
  if (value === undefined)
    return (
      <div className="adm-optional">
        <span>{label}</span>
        <button
          className="adm-small"
          type="button"
          onClick={() => onChange(emptyValue(schema))}
        >
          + Alanı ekle
        </button>
      </div>
    );
  if (schema.type === "object") {
    const object = value as Record<string, unknown>;
    return (
      <div className="adm-fields">
        {path.endsWith(".spin") && (
          <BulkFrames value={object} onChange={onChange} />
        )}
        {schema.optional && (
          <button
            type="button"
            className="adm-remove-field"
            onClick={() => onChange(undefined)}
          >
            Bu alanı kaldır
          </button>
        )}
        {Object.entries(schema.fields!).map(([key, s]) => (
          <Editor
            key={key}
            label={labels?.[key] || fieldLabels[key] || key}
            value={object[key]}
            schema={s}
            path={path + "." + key}
            pick={pick}
            onChange={(v) => {
              const next = { ...object };
              if (v === undefined) delete next[key];
              else next[key] = v;
              onChange(next);
            }}
          />
        ))}
      </div>
    );
  }
  if (schema.type === "array") {
    const items = value as unknown[];
    if (schema.item?.fields?.src && schema.item?.fields?.alt)
      return (
        <GalleryEditor
          value={items as { src: string; alt: string }[]}
          onChange={onChange}
          pick={pick}
          label={label}
        />
      );
    return (
      <div className="adm-list">
        <div className="adm-field-title">
          <label>
            {label} <span className="adm-count">{items.length}</span>
          </label>
          {schema.optional && (
            <button
              type="button"
              className="adm-remove-field"
              onClick={() => onChange(undefined)}
            >
              Alanı kaldır
            </button>
          )}
          <button
            type="button"
            className="adm-small"
            onClick={() => onChange([...items, emptyValue(schema.item!)])}
          >
            + Öğe ekle
          </button>
        </div>
        {items.length === 0 && (
          <p className="adm-muted">
            Henüz öğe yok. Yeni bir öğe ekleyebilirsiniz.
          </p>
        )}
        {items.map((item, i) => {
          const change = (v: unknown) =>
            onChange(items.map((x, j) => (j === i ? v : x)));
          const actions = (
            <div className="adm-item-actions">
              <button
                type="button"
                title="Yukarı taşı"
                aria-label="Yukarı taşı"
                disabled={i === 0}
                onClick={() => {
                  const a = [...items];
                  [a[i - 1], a[i]] = [a[i], a[i - 1]];
                  onChange(a);
                }}
              >
                ↑
              </button>
              <button
                type="button"
                title="Aşağı taşı"
                aria-label="Aşağı taşı"
                disabled={i === items.length - 1}
                onClick={() => {
                  const a = [...items];
                  [a[i], a[i + 1]] = [a[i + 1], a[i]];
                  onChange(a);
                }}
              >
                ↓
              </button>
              <button
                type="button"
                title="Kopyala"
                aria-label="Öğeyi kopyala"
                onClick={() => {
                  const a = [...items];
                  a.splice(i + 1, 0, structuredClone(item));
                  onChange(a);
                }}
              >
                ⧉
              </button>
              <button
                type="button"
                title="Sil"
                aria-label="Öğeyi sil"
                onClick={() => {
                  if (confirm("Bu öğe taslaktan silinsin mi?"))
                    onChange(items.filter((_, j) => j !== i));
                }}
              >
                ×
              </button>
            </div>
          );
          return (
            <Expand key={i} title={titleFor(item, i)} actions={actions}>
              <Editor
                value={item}
                schema={schema.item!}
                label={label + " · " + (i + 1)}
                path={path + "." + i}
                onChange={change}
                pick={pick}
              />
            </Expand>
          );
        })}
      </div>
    );
  }
  if (schema.type === "record")
    return (
      <div>
        {Object.entries(value as Record<string, unknown>).map(
          ([key, item], i) => (
            <Expand key={key} title={key}>
              <Editor
                value={item}
                schema={schema.item!}
                onChange={(v) => onChange({ ...(value as object), [key]: v })}
                label={titleFor(item, i)}
                path={path + "." + key}
                pick={pick}
              />
            </Expand>
          ),
        )}
      </div>
    );
  const optional = schema.optional ? (
    <button
      type="button"
      className="adm-remove-field"
      onClick={() => onChange(undefined)}
    >
      Alanı kaldır
    </button>
  ) : null;
  if (schema.type === "boolean")
    return (
      <label className="adm-toggle">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{label}</span>
        {optional}
      </label>
    );
  if (schema.type === "number")
    return (
      <label className="adm-field">
        <span>{label}</span>
        <input
          type="number"
          value={Number(value)}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {optional}
      </label>
    );
  const text = String(value);
  if (schema.options)
    return (
      <label className="adm-field">
        <span>{label}</span>
        <select value={text} onChange={(e) => onChange(e.target.value)}>
          {schema.options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        {optional}
      </label>
    );
  const imageField =
    mediaPath || /\.(png|jpe?g|webp|avif|gif|svg)(?:[?#]|$)/i.test(text);
  const videoField = videoPath;
  if (imageField || videoField)
    return (
      <MediaField
        value={text}
        onChange={onChange}
        pick={pick}
        label={label}
        kind={videoField ? "video" : "image"}
      />
    );
  const isColor = /^#[0-9a-f]{6}$/i.test(text);
  const isUrl =
    /\.(src|href|heroImage|heroVideo|video|logo|pattern|image|buttonHref)$/.test(
      path,
    ) ||
    /^(\/|https?:\/\/|mailto:|tel:)/.test(text) ||
    /frames\.\d+$/.test(path);
  const isImage =
    /(?:\.(png|jpe?g|webp|avif|gif)(\?|$))/i.test(text) &&
    !text.includes("{n}");
  const isVideo = /\.(mp4|webm)(?:[?#]|$)/i.test(text);
  const isLong =
    text.length > 110 ||
    /description|summary|customCss|intro|\.text/.test(path);
  return (
    <label className={"adm-field" + (isLong ? " adm-field-wide" : "")}>
      <span>{label}</span>
      <div className="adm-input-row">
        {isColor && (
          <input
            className="adm-color"
            aria-label={label + " renk seçici"}
            type="color"
            value={text}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
        {isLong ? (
          <textarea
            rows={path.endsWith("customCss") ? 8 : 3}
            value={text}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
          />
        ) : (
          <input
            type={path.endsWith(".date") ? "date" : "text"}
            value={text}
            disabled={path.startsWith("home.") && path.endsWith(".id")}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
          />
        )}
      </div>
      {isUrl && (
        <button
          type="button"
          className="adm-small"
          onClick={() => pick(onChange)}
        >
          Medya kütüphanesinden seç
        </button>
      )}
      {isImage && (
        <img
          className="adm-image-preview"
          src={text}
          alt="Seçili görsel"
          loading="lazy"
        />
      )}
      {isVideo && (
        <video
          className="adm-video-preview"
          src={text}
          controls
          playsInline
          preload="metadata"
          aria-label="Seçili banner videosu"
        />
      )}
      {optional}
    </label>
  );
}

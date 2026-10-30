"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { uploadMedia } from "@/lib/upload-media";
import { frameAngles, frameUrls, type SpinConfig } from "@/lib/spin";
import type { MediaScope, Pictures } from "@/lib/product-view";
import Product360 from "@/components/Product360";

export type Picker = (
  done: (url: string) => void,
  kind?: "image" | "video" | "file",
) => void;
const imageAccept = "image/jpeg,image/png,image/webp,image/avif,image/gif";
const Uploads = createContext({ pending: 0, start: () => () => {} });
export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState(0);
  const start = useCallback(() => {
    setPending((n) => n + 1);
    let done = false;
    return () => {
      if (!done) {
        done = true;
        setPending((n) => Math.max(0, n - 1));
      }
    };
  }, []);
  return (
    <Uploads.Provider value={{ pending, start }}>{children}</Uploads.Provider>
  );
}
export const useUploads = () => useContext(Uploads);

function useFileUpload(onDone: (urls: string[]) => void, kind = "image") {
  const [progress, setProgress] = useState(""),
    [error, setError] = useState("");
  const latest = useRef(onDone);
  latest.current = onDone;
  const { start } = useUploads();
  async function upload(files: FileList | File[] | null) {
    if (!files?.length) return;
    const chosen = Array.from(files).sort((a, b) =>
      a.name.localeCompare(b.name, "tr", { numeric: true }),
    );
    if (chosen.length > 500) {
      setError("Bir defada en fazla 500 dosya seçin.");
      return;
    }
    const finish = start();
    setError("");
    try {
      const urls = [];
      for (const [index, file] of chosen.entries()) {
        if (kind === "image" && !file.type.startsWith("image/"))
          throw Error("Yalnızca fotoğraf seçin.");
        setProgress(`Yükleniyor: ${index + 1} / ${chosen.length}`);
        urls.push((await uploadMedia(file)).url);
      }
      latest.current(urls);
    } catch (e) {
      setError(
        (e as Error).message +
          " Tamamlanan dosyalar medya kütüphanesinde saklanır.",
      );
    } finally {
      setProgress("");
      finish();
    }
  }
  return { upload, progress, error };
}

export function MediaField({
  value,
  onChange,
  label,
  pick,
  kind = "image",
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  pick: Picker;
  kind?: "image" | "video" | "file";
}) {
  const id = useId(),
    { upload, progress, error } = useFileUpload(
      (urls) => onChange(urls[0]),
      kind,
    );
  return (
    <div className="adm-media-field">
      <label className="adm-field-title" htmlFor={id}>
        {label}
      </label>
      {value ? (
        kind === "image" ? (
          <div className="adm-media-stage">
            <img src={value} alt={label} loading="lazy" />
          </div>
        ) : kind === "video" ? (
          <video
            className="adm-video-preview"
            src={value}
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <a href={value} target="_blank" rel="noopener noreferrer">
            Dosyayı aç ↗
          </a>
        )
      ) : (
        <div className="adm-media-empty">
          {kind === "image"
            ? "Henüz görsel seçilmedi"
            : "Henüz dosya seçilmedi"}
        </div>
      )}
      <div className="adm-actions">
        <label className="adm-btn adm-file-button">
          {progress || "↑ Dosya yükle"}
          <input
            aria-label={label + " yükle"}
            type="file"
            disabled={!!progress}
            accept={
              kind === "image"
                ? imageAccept
                : kind === "video"
                  ? "video/mp4,video/webm"
                  : undefined
            }
            onChange={(e) => {
              upload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          className="adm-btn"
          disabled={!!progress}
          onClick={() => pick(onChange, kind)}
        >
          Kütüphaneden seç
        </button>
        {value && (
          <button
            type="button"
            className="adm-small adm-danger"
            disabled={!!progress}
            onClick={() => onChange("")}
          >
            Görseli kaldır
          </button>
        )}
      </div>
      <details className="adm-url-details">
        <summary>Dosya adresi</summary>
        <input
          id={id}
          aria-label={label + " adresi"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/images/… veya https://…"
        />
      </details>
      {error && (
        <p className="adm-alert" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function GalleryEditor({
  value,
  onChange,
  pick,
  label = "Ürün fotoğrafları",
}: {
  value: Pictures;
  onChange: (images: Pictures) => void;
  pick: Picker;
  label?: string;
}) {
  const latest = useRef(value);
  latest.current = value;
  const { upload, progress, error } = useFileUpload((urls) =>
    onChange([...latest.current, ...urls.map((src) => ({ src, alt: "" }))]),
  );
  const [drag, setDrag] = useState<number | null>(null),
    [address, setAddress] = useState("");
  function move(from: number, to: number) {
    if (from === to) return;
    const next = [...value],
      item = next.splice(from, 1)[0];
    next.splice(to, 0, item);
    onChange(next);
  }
  return (
    <section className="adm-gallery-editor" aria-label={label}>
      <div className="adm-editor-heading">
        <div>
          <h3>{label}</h3>
          <p>
            İlk fotoğraf kapak görselidir. Sürükleyerek veya oklarla sıralayın.
            Silinen fotoğraf yalnızca bu üründen kaldırılır.
          </p>
        </div>
        <span className="adm-count">{value.length} görsel</span>
      </div>
      <div
        className="adm-media-drop"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) e.preventDefault();
        }}
        onDrop={(e) => {
          if (e.dataTransfer.files.length) {
            e.preventDefault();
            upload(Array.from(e.dataTransfer.files));
          }
        }}
      >
        <label className="adm-upload">
          <span>
            {progress || "Fotoğrafları buraya bırakın veya birlikte seçin"}
          </span>
          <small>JPG, PNG, WebP, AVIF, GIF · Dosya başına en fazla 10 MB</small>
          <input
            type="file"
            multiple
            aria-label={label + " yükle"}
            accept={imageAccept}
            disabled={!!progress}
            onChange={(e) => {
              upload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          className="adm-btn"
          disabled={!!progress}
          onClick={() =>
            pick(
              (url) => onChange([...latest.current, { src: url, alt: "" }]),
              "image",
            )
          }
        >
          + Medya kütüphanesinden ekle
        </button>
      </div>
      {error && (
        <p className="adm-alert" role="alert">
          {error}
        </p>
      )}
      <div className="adm-gallery-grid">
        {value.map((im, i) => (
          <article
            className="adm-gallery-card"
            key={i}
            draggable={!progress}
            onDragStart={() => setDrag(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (drag !== null) move(drag, i);
              setDrag(null);
            }}
            onDragEnd={() => setDrag(null)}
          >
            <div className="adm-gallery-image">
              <img
                src={im.src}
                alt={im.alt || `Fotoğraf ${i + 1}`}
                loading="lazy"
              />
              {i === 0 && <span>Kapak</span>}
            </div>
            <label>
              Görsel açıklaması
              <input
                aria-label={`Fotoğraf ${i + 1} açıklaması`}
                value={im.alt}
                onChange={(e) =>
                  onChange(
                    value.map((v, j) =>
                      j === i ? { ...v, alt: e.target.value } : v,
                    ),
                  )
                }
              />
            </label>
            <div className="adm-item-actions">
              <button
                type="button"
                aria-label={`Fotoğraf ${i + 1} yukarı`}
                disabled={!!progress || i === 0}
                onClick={() => move(i, i - 1)}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Fotoğraf ${i + 1} aşağı`}
                disabled={!!progress || i === value.length - 1}
                onClick={() => move(i, i + 1)}
              >
                ↓
              </button>
              <button
                type="button"
                disabled={!!progress || i === 0}
                onClick={() => move(i, 0)}
              >
                Kapak yap
              </button>
              <button
                type="button"
                className="adm-danger"
                disabled={!!progress}
                aria-label={`Fotoğraf ${i + 1} sil`}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                Sil
              </button>
            </div>
          </article>
        ))}
      </div>
      {!value.length && (
        <p className="adm-muted">
          Fotoğraf eklediğinizde önizlemeleri burada göreceksiniz.
        </p>
      )}
      <details className="adm-url-details">
        <summary>Bağlantıyla fotoğraf ekle</summary>
        <div className="adm-input-row">
          <input
            aria-label="Yeni fotoğraf adresi"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="https://…"
          />
          <button
            type="button"
            className="adm-btn"
            disabled={!/^(https?:\/\/|\/(?!\/))/.test(address)}
            onClick={() => {
              onChange([...value, { src: address, alt: "" }]);
              setAddress("");
            }}
          >
            Ekle
          </button>
        </div>
      </details>
    </section>
  );
}

export function SpinEditor({
  value,
  onChange,
  pick,
  name,
}: {
  value: MediaScope;
  onChange: (scope: MediaScope) => void;
  pick: Picker;
  name: string;
}) {
  const [replace, setReplace] = useState(true),
    [preview, setPreview] = useState(false),
    [manual, setManual] = useState(!!value.spin?.angles),
    [message, setMessage] = useState("");
  const [staged, setStaged] = useState<string[]>([]),
    [stagedAngles, setStagedAngles] = useState<string[]>([]);
  const { start } = useUploads(),
    stagedFinish = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      stagedFinish.current?.();
    },
    [],
  );
  function clearStaged() {
    setStaged([]);
    setStagedAngles([]);
    stagedFinish.current?.();
    stagedFinish.current = null;
  }
  const latest = useRef(value);
  latest.current = value;
  let frames: string[] = [];
  try {
    frames = value.spin ? frameUrls(value.spin) : [];
  } catch {}
  const angles = value.spin?.angles;
  const { upload, progress, error } = useFileUpload((urls) => {
    let old: string[] = [];
    try {
      old = latest.current.spin ? frameUrls(latest.current.spin) : [];
    } catch {}
    const next = replace ? urls : [...old, ...urls];
    if (next.length < 2 || next.length > 500) {
      setMessage(
        "Bir seri 2–500 kare içermeli. Yükledikleriniz kütüphanede saklandı.",
      );
      return;
    }
    if (!replace && latest.current.spin?.angles?.length === old.length) {
      setStaged(urls);
      setStagedAngles(urls.map(() => ""));
      stagedFinish.current = start();
      setMessage("");
      return;
    }
    onChange({
      ...latest.current,
      spinDisabled: false,
      spin: { alt: name, frames: next },
    });
    setManual(false);
    setMessage("");
  });
  function setFrames(next: string[], nextAngles?: number[]) {
    onChange({
      ...value,
      spin: {
        alt: value.spin?.alt || name,
        frames: next,
        ...(nextAngles ? { angles: nextAngles } : {}),
      },
    });
  }
  function move(from: number, to: number) {
    const next = [...frames],
      [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    const a = angles ? [...angles] : undefined;
    if (a) {
      const [v] = a.splice(from, 1);
      a.splice(to, 0, v);
    }
    setFrames(next, a);
  }
  const enabled = !value.spinDisabled;
  const appendAngles = [...(angles || []), ...stagedAngles.map(Number)];
  const canAppend =
    staged.length > 0 &&
    !!angles &&
    stagedAngles.every(
      (a) =>
        a.trim() !== "" &&
        Number.isFinite(Number(a)) &&
        Number(a) >= 0 &&
        Number(a) < 360,
    ) &&
    new Set(appendAngles).size === appendAngles.length;
  return (
    <section className="adm-spin-editor" aria-label="360° ürün yönetimi">
      <div className="adm-editor-heading">
        <div>
          <h3>360° ürün görünümü</h3>
          <p>
            Bu ürüne ait gerçek dönüş fotoğraflarını yükleyin. Dosyalar 1, 2, 3…
            sırasına göre dizilir. Akıcı dönüş için 24–72 kare önerilir.
          </p>
        </div>
        <span className="adm-count">{frames.length} kare</span>
      </div>
      <label className="adm-toggle">
        <input
          type="checkbox"
          disabled={!!progress || staged.length > 0}
          checked={enabled}
          onChange={(e) =>
            onChange({ ...value, spinDisabled: !e.target.checked })
          }
        />
        <span>Bu görünümde 360° kullan</span>
      </label>
      {!enabled && (
        <p className="adm-muted">
          360° kapalı. Mevcut kareler korunur; ziyaretçi fotoğraf galerisini
          görür.
        </p>
      )}
      <label className="adm-field">
        <span>Yükleme yöntemi</span>
        <select
          aria-label="Yükleme yöntemi"
          value={replace ? "replace" : "append"}
          onChange={(e) => setReplace(e.target.value === "replace")}
          disabled={!!progress || staged.length > 0}
        >
          <option value="replace">Mevcut seriyi yeni karelerle değiştir</option>
          <option value="append">Mevcut serinin sonuna ekle</option>
        </select>
      </label>
      <label className="adm-upload">
        <span>{progress || "↑ 360° karelerini birlikte seç"}</span>
        <small>En az 2, en fazla 500 kare. Tek fotoğraf 360° oluşturmaz.</small>
        <input
          type="file"
          multiple
          aria-label="360° karelerini yükle"
          accept={imageAccept}
          disabled={!!progress || staged.length > 0}
          onChange={(e) => {
            upload(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {(error || message) && (
        <p className="adm-alert" role="alert">
          {error || message}
        </p>
      )}
      {staged.length > 0 && (
        <section className="adm-angle-staging">
          <h3>Yeni karelerin gerçek açılarını girin</h3>
          <p>
            Mevcut karelerin açıları korunur. Yeni kareleri aşağıdaki açıları
            tamamladıktan sonra seriye ekleyin.
          </p>
          <div className="adm-frame-grid">
            {staged.map((src, i) => (
              <div className="adm-frame" key={src}>
                <img src={src} alt={`Yeni kare ${i + 1}`} />
                <label>
                  {frames.length + i + 1}. kare açısı
                  <input
                    type="number"
                    min={0}
                    max={359.99}
                    step="any"
                    aria-label={`Yeni ${frames.length + i + 1}. kare açısı`}
                    value={stagedAngles[i]}
                    onChange={(e) =>
                      setStagedAngles((a) =>
                        a.map((v, j) => (j === i ? e.target.value : v)),
                      )
                    }
                  />
                </label>
              </div>
            ))}
          </div>
          <div className="adm-actions">
            <button
              type="button"
              className="adm-btn adm-primary"
              disabled={!canAppend}
              onClick={() => {
                onChange({
                  ...latest.current,
                  spinDisabled: false,
                  spin: {
                    alt: latest.current.spin?.alt || name,
                    frames: [...frames, ...staged],
                    angles: appendAngles,
                  },
                });
                setManual(true);
                clearStaged();
              }}
            >
              Kareleri seriye ekle
            </button>
            <button type="button" className="adm-btn" onClick={clearStaged}>
              Vazgeç
            </button>
          </div>
        </section>
      )}
      {frames.length >= 2 && (
        <>
          <label className="adm-field">
            <span>360° görsel açıklaması</span>
            <input
              disabled={!!progress || staged.length > 0}
              value={value.spin?.alt || ""}
              onChange={(e) => {
                if (value.spin)
                  onChange({
                    ...value,
                    spin: { ...value.spin, alt: e.target.value },
                  });
              }}
            />
          </label>
          <div className="adm-actions">
            <button
              type="button"
              className="adm-btn"
              onClick={() => setPreview(!preview)}
            >
              {preview ? "Önizlemeyi kapat" : "360° önizle"}
            </button>
            <button
              type="button"
              className="adm-btn adm-danger"
              disabled={!!progress || staged.length > 0}
              onClick={() => {
                if (
                  confirm(
                    "Bu görünümdeki dönüş serisi kaldırılsın mı? Dosyalar kütüphanede kalır.",
                  )
                ) {
                  const next = { ...value, spinDisabled: true };
                  delete next.spin;
                  onChange(next);
                }
              }}
            >
              Seriyi kaldır
            </button>
          </div>
          {preview && value.spin && (
            <div className="adm-spin-preview">
              <Product360 spin={value.spin} fallback={value.images?.[0]?.src} />
            </div>
          )}
          <label className="adm-toggle">
            <input
              type="checkbox"
              checked={manual}
              disabled={!!progress || staged.length > 0}
              onChange={(e) => {
                setManual(e.target.checked);
                if (e.target.checked) {
                  const a = value.spin ? frameAngles(value.spin) : [];
                  setFrames(frames, a);
                } else setFrames(frames);
              }}
            />
            <span>Her karenin gerçek açısını düzenle</span>
          </label>
          <div className="adm-frame-grid">
            {frames.map((src, i) => (
              <article className="adm-frame" key={i}>
                <img src={src} alt={`360° kare ${i + 1}`} loading="lazy" />
                <strong>{i + 1}. kare</strong>
                {manual && (
                  <label>
                    Açı (°)
                    <input
                      type="number"
                      aria-label={`${i + 1}. kare açısı`}
                      min={0}
                      max={359.99}
                      value={angles?.[i] ?? 0}
                      onChange={(e) =>
                        setFrames(
                          frames,
                          (
                            angles ||
                            frames.map((_, j) => (j * 360) / frames.length)
                          ).map((a, j) =>
                            j === i ? Number(e.target.value) : a,
                          ),
                        )
                      }
                    />
                  </label>
                )}
                <div className="adm-item-actions">
                  <button
                    type="button"
                    aria-label={`${i + 1}. kare yukarı`}
                    disabled={!!progress || staged.length > 0 || i === 0}
                    onClick={() => move(i, i - 1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`${i + 1}. kare aşağı`}
                    disabled={
                      !!progress || staged.length > 0 || i === frames.length - 1
                    }
                    onClick={() => move(i, i + 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label={`${i + 1}. kareyi değiştir`}
                    disabled={!!progress || staged.length > 0}
                    onClick={() =>
                      pick(
                        (url) =>
                          setFrames(
                            frames.map((v, j) => (j === i ? url : v)),
                            angles,
                          ),
                        "image",
                      )
                    }
                  >
                    Değiştir
                  </button>
                  <button
                    type="button"
                    aria-label={`${i + 1}. kareyi sil`}
                    disabled={
                      !!progress || staged.length > 0 || frames.length <= 2
                    }
                    title={
                      frames.length <= 2
                        ? "Dönüş için en az iki kare gerekir; seriyi tamamen kaldırabilirsiniz."
                        : "Kareyi sil"
                    }
                    onClick={() =>
                      setFrames(
                        frames.filter((_, j) => j !== i),
                        angles?.filter((_, j) => j !== i),
                      )
                    }
                  >
                    Sil
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

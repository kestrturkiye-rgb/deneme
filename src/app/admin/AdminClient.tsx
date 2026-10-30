"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import manifest from "@/cms/manifest.json";
import defaults from "@/cms/defaults.json";
import { fieldLabels, schemas } from "@/cms/schema";
import { Editor } from "./FormEditor";
import { UploadProvider, useUploads, type Picker } from "./MediaEditor";
import type { Content, State } from "@/cms/store";
import "./admin.css";
import "./studio.css";
import { uploadMedia } from "@/lib/upload-media";
import Inbox from "./Inbox";
import ProductStudio, { type UpdateContent } from "./ProductStudio";
import PageWorkspace from "./PageWorkspace";
import TranslationStudio from "./TranslationStudio";

type Media = {
  name: string;
  url: string;
  size: number;
  date: string;
  label?: string;
};
function siteImages(content: Content): Media[] {
  const result = new Map<string, Media>();
  function visit(value: unknown, label: string) {
    if (
      typeof value === "string" &&
      /^(https?:\/\/|\/(?!\/))/.test(value) &&
      /\.(png|jpe?g|webp|avif|gif|svg)(?:[?#]|$)/i.test(value) &&
      !value.includes("{n}")
    ) {
      if (!result.has(value))
        result.set(value, {
          name: value.split("/").pop() || "görsel",
          url: value,
          size: 0,
          date: "",
          label: label.replaceAll("data-details / details / ", ""),
        });
    } else if (Array.isArray(value))
      value.forEach((v, i) => visit(v, label + " · " + (i + 1)));
    else if (value && typeof value === "object") {
      const object = value as Record<string, unknown>,
        title = String(object.alt || object.name || object.title || label);
      Object.entries(object).forEach(([key, v]) =>
        visit(v, title + " / " + (fieldLabels[key] || key)),
      );
    }
  }
  visit(content, "");
  return [...result.values()];
}
const meta = manifest as Record<
  string,
  { title: string; group: string; labels: Record<string, string> }
>;
const formatDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })
    : "Henüz yayınlanmadı";
async function api(url: string, options?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "İşlem tamamlanamadı.");
  return data;
}
const post = (url: string, body: unknown) =>
  api(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
function HomeOrder({
  value,
  onChange,
}: {
  value: Content["home"];
  onChange: (value: Content["home"]) => void;
}) {
  return (
    <div className="adm-padded">
      <p className="adm-muted">
        Bölümleri oklarla sıralayın; görünürlük anahtarını kapatarak gizleyin.
      </p>
      {value.sections.map((section, index) => (
        <div className="adm-home-row" key={section.id}>
          <span>
            {index + 1}. {section.title}
          </span>
          <div className="adm-item-actions">
            {[-1, 1].map((step) => (
              <button
                key={step}
                aria-label={step === -1 ? "Yukarı taşı" : "Aşağı taşı"}
                disabled={
                  index + step < 0 || index + step >= value.sections.length
                }
                onClick={() => {
                  const sections = [...value.sections];
                  [sections[index], sections[index + step]] = [
                    sections[index + step],
                    sections[index],
                  ];
                  onChange({ sections });
                }}
              >
                {step === -1 ? "↑" : "↓"}
              </button>
            ))}
          </div>
          <label>
            <input
              type="checkbox"
              checked={section.visible}
              onChange={(event) =>
                onChange({
                  sections: value.sections.map((s, i) =>
                    i === index ? { ...s, visible: event.target.checked } : s,
                  ),
                })
              }
            />{" "}
            Görünür
          </label>
        </div>
      ))}
      {defaults.home.sections
        .filter(
          (section) =>
            !value.sections.some((current) => current.id === section.id),
        )
        .map((section) => (
          <div className="adm-optional" key={section.id}>
            <span>{section.title}</span>
            <button
              type="button"
              className="adm-small"
              onClick={() =>
                onChange({
                  sections: [...value.sections, { ...section, visible: true }],
                })
              }
            >
              + Ana sayfaya ekle
            </button>
          </div>
        ))}
    </div>
  );
}
function PasswordForm({
  username,
  onChanged,
}: {
  username: string;
  onChanged: () => void | Promise<void>;
}) {
  const { pending: pendingUploads } = useUploads();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setError("");
    if (values.get("newPassword") !== values.get("repeatPassword")) {
      setError("Yeni parolalar eşleşmiyor.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/admin/auth", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.get("currentPassword"),
          newPassword: values.get("newPassword"),
        }),
      });
      form.reset();
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="adm-password-form" onSubmit={submit}>
      <input
        type="hidden"
        name="username"
        autoComplete="username"
        value={username}
      />
      <label>
        Mevcut parola
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
        />
      </label>
      <label>
        Yeni parola
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={256}
          aria-describedby="password-guidance"
        />
      </label>
      <p className="adm-muted" id="password-guidance">
        En az 12 karakter kullanın. Yeni parolanız mevcut parolanızdan farklı
        olmalı.
      </p>
      <label>
        Yeni parola tekrar
        <input
          name="repeatPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={256}
        />
      </label>
      {error && (
        <p className="adm-alert" role="alert">
          {error}
        </p>
      )}
      <button
        className="adm-btn adm-primary"
        disabled={busy || pendingUploads > 0}
      >
        {busy ? "Parola değiştiriliyor…" : "Parolayı değiştir"}
      </button>
    </form>
  );
}
function AdminClientInner() {
  const { pending: pendingUploads } = useUploads();
  const [selectedProduct, setSelectedProduct] = useState("maximus-2-0-832551"),
    [selectedPage, setSelectedPage] = useState("/"),
    [previewPath, setPreviewPath] = useState("/"),
    [pickerKind, setPickerKind] = useState<"image" | "video" | "file">("file");
  const [mediaSource, setMediaSource] = useState("uploads"),
    [mediaSearch, setMediaSearch] = useState("");
  const [auth, setAuth] = useState<boolean | null>(null),
    [configured, setConfigured] = useState(true),
    [storageBackend, setStorageBackend] = useState("file"),
    [passwordChangeRequired, setPasswordChangeRequired] = useState(false),
    [username, setUsername] = useState(""),
    [loginError, setLoginError] = useState("");
  const [state, setState] = useState<State | null>(null),
    [content, setContent] = useState<Content | null>(null),
    [saved, setSaved] = useState("");
  const [active, setActive] = useState("overview"),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [sidebar, setSidebar] = useState(false);
  const [media, setMedia] = useState<Media[]>([]),
    [mediaPage, setMediaPage] = useState(0),
    [mediaHasMore, setMediaHasMore] = useState(false),
    [picker, setPicker] = useState(false),
    [uploading, setUploading] = useState(false);
  const selection = useRef<((url: string) => void) | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const dirty = content !== null && JSON.stringify(content) !== saved;
  const acceptState = useCallback((data: State) => {
    setState(data);
    setContent(data.draft);
    setSaved(JSON.stringify(data.draft));
  }, []);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const product = query.get("product"),
      page = query.get("page");
    if (product) {
      setSelectedProduct(product);
      setActive("data-details");
    } else if (page?.startsWith("/") && !page.startsWith("//")) {
      setSelectedPage(page);
      setPreviewPath(page);
      setActive("pages");
    }
    api("/api/admin/auth")
      .then(async (data) => {
        setConfigured(data.configured);
        setStorageBackend(data.backend || "file");
        setAuth(data.authenticated);
        setUsername(data.username || "");
        setPasswordChangeRequired(Boolean(data.passwordChangeRequired));
        if (data.authenticated && !data.passwordChangeRequired)
          acceptState(await api("/api/admin/content"));
      })
      .catch((e) => {
        setAuth(false);
        setLoginError(e.message);
      });
  }, [acceptState]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty || pendingUploads) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, pendingUploads]);
  useEffect(() => {
    if (!auth || (active !== "media" && !picker)) return;
    const controller = new AbortController();
    api("/api/admin/media?page=" + mediaPage, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setMedia(data.items);
          setMediaHasMore(data.hasMore);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [auth, active, picker, mediaPage]);
  useEffect(() => {
    if (!picker) return;
    const previous = document.activeElement as HTMLElement | null;
    const modal = document.querySelector<HTMLElement>(".adm-modal");
    const first = modal?.querySelector<HTMLElement>(
      "button:not([disabled]),input:not([disabled])",
    );
    first?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPicker(false);
      if (e.key === "Tab" && modal) {
        const elements = Array.from(
          modal.querySelectorAll<HTMLElement>(
            "button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])",
          ),
        ).filter((el) => el.getClientRects().length);
        const last = elements.at(-1),
          first = elements[0];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [picker]);
  const pick: Picker = (done, kind = "file") => {
    setPickerKind(kind);
    setMediaSource(kind === "image" ? "site" : "uploads");
    setMediaSearch("");
    selection.current = done;
    setMediaPage(0);
    setPicker(true);
  };
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setLoginError("");
    const f = new FormData(event.currentTarget);
    try {
      const data = await post("/api/admin/auth", {
        username: f.get("username"),
        password: f.get("password"),
      });
      setUsername(data.username);
      setPasswordChangeRequired(Boolean(data.passwordChangeRequired));
      if (!data.passwordChangeRequired)
        acceptState(await api("/api/admin/content"));
      setAuth(true);
    } catch (e) {
      setLoginError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function action(kind: string, extra: Record<string, unknown> = {}) {
    if (!state || !content) return false;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const data = await post("/api/admin/content", {
        action: kind,
        content,
        version: state.version,
        ...extra,
      });
      acceptState(data);
      setNotice(
        kind === "publish" ? "Değişiklikler yayınlandı." : "Taslak kaydedildi.",
      );
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function preview(targetPath = previewPath) {
    if (await action("save")) {
      setBusy(true);
      try {
        await post("/api/admin/content", { action: "preview", enabled: true });
        window.location.assign(targetPath);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    }
  }
  async function logout() {
    if (pendingUploads) {
      setError("Dosya yüklemesinin tamamlanmasını bekleyin.");
      return;
    }
    if (
      dirty &&
      !confirm("Kaydedilmemiş değişiklikler var. Çıkış yapılsın mı?")
    )
      return;
    try {
      await api("/api/admin/auth", { method: "DELETE" });
      setAuth(false);
      setContent(null);
      setState(null);
      setSaved("");
      setUsername("");
      setPasswordChangeRequired(false);
      setPicker(false);
      setMedia([]);
      setNotice("");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const item = await uploadMedia(file);
      setMedia((prev) => [item, ...prev].slice(0, 48));
      if (media.length >= 48) setMediaHasMore(true);
      setMediaPage(0);
      setMediaSource("uploads");
      setNotice(
        "Dosya yüklendi. Kullanmak istediğiniz alanda bu dosyayı seçin.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  function download() {
    if (!content) return;
    const url = URL.createObjectURL(
      new Blob(
        [JSON.stringify({ format: "kivanc-cms-v1", content }, null, 2)],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download =
      "kivanc-icerik-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000)
        throw new Error("Yedek en fazla 2 MB olabilir.");
      const data = JSON.parse(await file.text());
      if (data.format !== "kivanc-cms-v1" || !data.content)
        throw new Error("Geçerli bir Kıvanç içerik yedeği seçin.");
      if (
        !confirm(
          "Bu yedek mevcut düzenleme taslağınızın yerini alacak. Devam edilsin mi?",
        )
      )
        return;
      setContent(data.content);
      setNotice(
        "Yedek düzenlemeye alındı. Kaydettiğinizde sunucu doğrulaması yapılacak; yayınlayana kadar ziyaretçiler etkilenmez.",
      );
    } catch (e) {
      setError((e as Error).message);
    }
    if (importInput.current) importInput.current.value = "";
  }
  if (auth === null)
    return <div className="adm-loading">Yönetim paneli hazırlanıyor…</div>;
  if (!auth)
    return (
      <div className="adm-login">
        <div className="adm-login-brand">
          <span className="adm-logo-mark">K</span>
          <span>
            KIVANÇ<span className="adm-brand-light">GROUP</span>
          </span>
        </div>
        <div className="adm-login-card">
          <span className="adm-eyebrow">İÇERİK YÖNETİM SİSTEMİ</span>
          <h1>
            Tek panel.
            <br />
            Tüm kontrol sizde.
          </h1>
          <p>Sitenizin içeriğini, ürünlerini ve görünümünü yönetin.</p>
          {!configured ? (
            <div className="adm-alert">
              {storageBackend === "unconfigured" ? (
                "Kalıcı veri deposu henüz bağlanmamış. Yayın projesindeki Supabase bağlantısını tamamlayın."
              ) : (
                <>
                  Henüz yönetici hesabı yok. Kurulum kılavuzundaki hesap aktarma
                  adımını veya <code>npm run admin:setup</code> komutunu
                  kullanın. Varsayılan parola bulunmaz.
                </>
              )}
            </div>
          ) : (
            <form onSubmit={login}>
              <label>
                Kullanıcı adı
                <input
                  name="username"
                  autoComplete="username"
                  required
                  maxLength={80}
                />
              </label>
              <label>
                Parola
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={256}
                />
              </label>
              <button
                className="adm-btn adm-primary"
                disabled={busy || pendingUploads > 0}
              >
                {busy ? "Giriş yapılıyor…" : "Güvenli giriş →"}
              </button>
            </form>
          )}
          {loginError && (
            <p className="adm-alert" role="alert">
              {loginError}
            </p>
          )}
          <a href="/">← Web sitesine dön</a>
        </div>
        <p className="adm-login-foot">Kıvanç Group · Yönetici erişimi</p>
      </div>
    );
  if (passwordChangeRequired)
    return (
      <div className="adm-login">
        <div className="adm-login-card">
          <span className="adm-eyebrow">İLK GİRİŞ · {username}</span>
          <h1>Kendi parolanızı belirleyin.</h1>
          <p>Geçici parolanızı değiştirerek yönetim panelini açın.</p>
          <PasswordForm
            username={username}
            onChanged={async () => {
              setPasswordChangeRequired(false);
              acceptState(await api("/api/admin/content"));
              setNotice("Parolanız değiştirildi. Yönetim paneliniz hazır.");
            }}
          />
          <button className="adm-btn" onClick={logout}>
            Çıkış yap
          </button>
          {error && (
            <p className="adm-alert" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  if (!state || !content)
    return (
      <div className="adm-loading">
        İçerik yükleniyor… {error}
        <button onClick={() => window.location.reload()}>Yenile</button>
      </div>
    );
  const entries = Object.entries(meta).filter(([key, m]) => {
    const q = search.toLocaleLowerCase("tr");
    return (
      !q ||
      (
        m.title +
        " " +
        m.group +
        " " +
        JSON.stringify(content[key as keyof Content])
      )
        .toLocaleLowerCase("tr")
        .includes(q)
    );
  });
  const current = meta[active];
  const productCount = content["data-divisions"].divisions.reduce(
    (n, d) => n + d.groups.reduce((a, g) => a + g.items.length, 0),
    0,
  );
  const updateContent: UpdateContent = (change) =>
    setContent((previous) => (previous ? change(previous) : previous));
  const selectProduct = (slug: string, path: string) => {
    if (pendingUploads) return;
    setSelectedProduct(slug);
    setPreviewPath(path);
    setActive("data-details");
    setSidebar(false);
    window.history.replaceState(
      null,
      "",
      "/admin?product=" + encodeURIComponent(slug),
    );
  };
  const navigate = (key: string) => {
    if (pendingUploads) {
      setError("Dosya yüklemesinin tamamlanmasını bekleyin.");
      return;
    }
    setActive(key);
    setSidebar(false);
    window.history.replaceState(
      null,
      "",
      key === "pages"
        ? "/admin?page=" + encodeURIComponent(selectedPage)
        : key === "data-details"
          ? "/admin?product=" + encodeURIComponent(selectedProduct)
          : "/admin",
    );
    if (key === "pages") setPreviewPath(selectedPage);
    else if (key === "data-details") {
      const division = content["data-divisions"].divisions.find((d) =>
        d.groups.some((g) => g.items.some((p) => p.slug === selectedProduct)),
      );
      setPreviewPath(division ? `/${division.slug}/${selectedProduct}` : "/");
    } else setPreviewPath("/");
  };
  const changeSection = (key: string, v: unknown) =>
    setContent((prev) => ({ ...prev!, [key]: v }));
  const mediaGrid = (
    <>
      <div className="adm-editor-tabs" aria-label="Medya kaynağı">
        <button
          type="button"
          className={mediaSource === "uploads" ? "active" : ""}
          onClick={() => {
            setMediaSource("uploads");
            setMediaSearch("");
          }}
        >
          Yüklediklerim
        </button>
        <button
          type="button"
          className={mediaSource === "site" ? "active" : ""}
          onClick={() => {
            setMediaSource("site");
            setMediaSearch("");
          }}
        >
          Site görselleri
        </button>
      </div>
      <input
        aria-label="Medya ara"
        placeholder="Görsel adı veya ürün ile ara…"
        value={mediaSearch}
        onChange={(e) => setMediaSearch(e.target.value)}
      />
      <label className="adm-upload">
        <span>
          {uploading ? "Dosya yükleniyor…" : "↑ Dosya yükleyin veya seçin"}
        </span>
        <small>
          JPG, PNG, WebP, AVIF, GIF, PDF, MP4 veya WebM · En fazla 10 MB
        </small>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif,application/pdf,video/mp4,video/webm"
          disabled={uploading}
          onChange={(e) => {
            upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <div className="adm-media-grid">
        {(mediaSource === "site" ? siteImages(content) : media)
          .filter((item) =>
            (item.label + " " + item.name)
              .toLocaleLowerCase("tr")
              .includes(mediaSearch.toLocaleLowerCase("tr")),
          )
          .filter(
            (item) =>
              pickerKind === "file" ||
              !picker ||
              (pickerKind === "image"
                ? /\.(png|jpe?g|webp|avif|gif|svg)(?:[?#]|$)/i
                : /\.(mp4|webm)(?:[?#]|$)/i
              ).test(item.url),
          )
          .map((item) => (
            <button
              type="button"
              className="adm-media-card"
              key={item.url}
              onClick={async () => {
                if (picker) {
                  selection.current?.(item.url);
                  setPicker(false);
                } else {
                  try {
                    await navigator.clipboard.writeText(item.url);
                    setNotice("Dosya adresi kopyalandı.");
                  } catch {
                    setNotice("Dosya adresi: " + item.url);
                  }
                }
              }}
            >
              {item.name.endsWith(".pdf") ? (
                <div className="adm-pdf">PDF</div>
              ) : /\.(mp4|webm)$/i.test(item.name) ? (
                <div className="adm-pdf">
                  ▶ {item.name.split(".").pop()?.toUpperCase()}
                </div>
              ) : (
                <img src={item.url} alt="Yüklenen görsel" loading="lazy" />
              )}
              <span>
                {item.label ||
                  item.name.slice(0, 8) + "…" + item.name.slice(-5)}
              </span>
              <small>
                {item.size
                  ? (item.size / 1024).toFixed(0) + " KB"
                  : "Site görseli"}{" "}
                · {picker ? "Seç" : "Adresi kopyala"}
              </small>
            </button>
          ))}
      </div>
      {mediaSource === "uploads" && (mediaPage > 0 || mediaHasMore) && (
        <div className="adm-actions">
          <button
            className="adm-btn"
            disabled={!mediaPage || uploading}
            onClick={() => setMediaPage(mediaPage - 1)}
          >
            Önceki dosyalar
          </button>
          <span>Sayfa {mediaPage + 1}</span>
          <button
            className="adm-btn"
            disabled={!mediaHasMore || uploading}
            onClick={() => setMediaPage(mediaPage + 1)}
          >
            Sonraki dosyalar
          </button>
        </div>
      )}
      {media.length === 0 && (
        <p className="adm-muted">
          Kütüphaneniz boş. İlk görselinizi veya belgenizi yükleyin.
        </p>
      )}
    </>
  );
  return (
    <div className="adm-app">
      <aside className={"adm-sidebar" + (sidebar ? " is-visible" : "")}>
        <a className="adm-brand" href="/admin">
          <span className="adm-logo-mark">K</span>
          <span>
            KIVANÇ<small>YÖNETİM PANELİ</small>
          </span>
        </a>
        <input
          className="adm-nav-search"
          placeholder="İçerik veya bölüm ara…"
          aria-label="Panelde ara"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <nav>
          <button
            className={active === "overview" ? "active" : ""}
            onClick={() => {
              navigate("overview");
              setSidebar(false);
            }}
          >
            ▦ <span>Genel bakış</span>
          </button>
          {[
            ["pages", "Sayfalar ve görseller"],
            ["data-details", "Ürün detayları"],
            ["data-divisions", "Ürünler ve kategoriler"],
            ["components-Header", "Menü ve logo"],
            ["design", "Renkler ve görünüm"],
            ["translations", "Diller ve çeviriler"],
          ].map(([key, title]) => (
            <button
              key={key}
              className={active === key ? "active" : ""}
              disabled={pendingUploads > 0}
              onClick={() => navigate(key)}
            >
              <span>{title}</span>
              <span aria-hidden="true" className="adm-nav-arrow">
                ›
              </span>
            </button>
          ))}
          <details className="adm-advanced-nav">
            <summary>Gelişmiş içerik alanları</summary>
            {["İçerik", "Bileşenler", "Sayfalar", "Tasarım"].map((group) => (
              <div key={group}>
                <div className="adm-nav-group">{group}</div>
                {entries
                  .filter(
                    ([key, m]) =>
                      m.group === group &&
                      ![
                        "data-details",
                        "data-divisions",
                        "components-Header",
                        "design",
                      ].includes(key),
                  )
                  .map(([key, m]) => (
                    <button
                      key={key}
                      className={active === key ? "active" : ""}
                      onClick={() => {
                        navigate(key);
                        setSidebar(false);
                      }}
                    >
                      <span>{m.title}</span>
                      <span aria-hidden="true" className="adm-nav-arrow">
                        ›
                      </span>
                    </button>
                  ))}
              </div>
            ))}
          </details>
          <div className="adm-nav-group">ARAÇLAR</div>
          {[
            ["inbox", "Gelen talepler"],
            ["media", "Medya kütüphanesi"],
            ["history", "Sürüm geçmişi ve yedek"],
            ["account", "Hesap ve parola"],
          ].map(([key, title]) => (
            <button
              key={key}
              className={active === key ? "active" : ""}
              onClick={() => {
                navigate(key);
                setSidebar(false);
              }}
            >
              {title}
            </button>
          ))}
        </nav>
        <div className="adm-sidebar-foot">
          <span className="adm-live-dot" /> İçerikleriniz sunucuda saklanır
          <button onClick={logout}>Çıkış yap →</button>
        </div>
      </aside>
      {sidebar && (
        <button
          className="adm-backdrop"
          aria-label="Menüyü kapat"
          onClick={() => setSidebar(false)}
        />
      )}
      <div className="adm-workspace">
        <header className="adm-topbar">
          <div className="adm-topbar-title">
            <button
              className="adm-menu-btn"
              aria-label="Menüyü aç"
              onClick={() => setSidebar(!sidebar)}
            >
              ☰
            </button>
            <span>
              Çalışma alanı <span className="adm-separator">/</span>{" "}
              <strong>
                {current?.title ||
                  (
                    {
                      overview: "Genel bakış",
                      pages: "Sayfalar ve görseller",
                      translations: "Diller ve çeviriler",
                      inbox: "Gelen talepler",
                      media: "Medya kütüphanesi",
                      history: "Sürüm geçmişi",
                      account: "Hesap ve parola",
                    } as Record<string, string>
                  )[active]}
              </strong>
            </span>
          </div>
          <a
            href="/"
            onClick={async (e) => {
              e.preventDefault();
              if (
                dirty &&
                !confirm(
                  "Kaydedilmemiş değişiklikler var. Sitede devam edilsin mi?",
                )
              )
                return;
              try {
                await post("/api/admin/content", {
                  action: "preview",
                  enabled: false,
                });
                window.location.assign("/");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Siteye git →
          </a>
        </header>
        <main
          className="adm-main"
          inert={busy ? true : undefined}
          aria-busy={busy}
        >
          <div className="adm-page-heading">
            <div>
              <span className="adm-eyebrow">
                KIVANÇ GROUP / İÇERİK STÜDYOSU
              </span>
              <h1>
                {current?.title ||
                  (
                    {
                      overview: "Hoş geldiniz.",
                      pages: "Sayfalar ve görseller",
                      translations: "Diller ve çeviriler",
                      inbox: "Gelen talepler",
                      media: "Medya kütüphanesi",
                      history: "Sürüm geçmişi ve yedek",
                      account: "Hesap ve parola",
                    } as Record<string, string>
                  )[active]}
              </h1>
              <p>
                {active === "overview"
                  ? "Web sitenizin her ayrıntısını tek bir yerden yönetin."
                  : active === "media"
                    ? "Görsellerinizi ve belgelerinizi yükleyin, içeriklerinizde kullanın."
                    : active === "history"
                      ? "İçeriği yedekleyin veya önceki bir yayını taslağa geri alın."
                      : active === "account"
                        ? "Yönetici hesabınızın parolasını buradan değiştirin."
                        : "Düzenleyin, taslağı kontrol edin ve hazır olduğunuzda yayınlayın."}
              </p>
            </div>
            <span className={"adm-status " + (dirty ? "is-dirty" : "")}>
              <i />
              {dirty ? "Kaydedilmemiş değişiklikler" : "Taslak güncel"}
            </span>
          </div>
          {(notice || error) && (
            <div
              className={"adm-notice" + (error ? " is-error" : "")}
              role={error ? "alert" : "status"}
            >
              <span>{error || notice}</span>
              <button
                aria-label="Bildirimi kapat"
                onClick={() => {
                  setError("");
                  setNotice("");
                }}
              >
                ×
              </button>
            </div>
          )}
          {active === "overview" && (
            <>
              <div className="adm-stats">
                {[
                  [
                    "İÇERİK BÖLÜMÜ",
                    Object.keys(meta).length,
                    "Tüm sayfalar ve ortak alanlar",
                  ],
                  [
                    "ÜRÜN / BİLGİ SAYFASI",
                    productCount,
                    "Kategoriler ve detaylı ürün içerikleri",
                  ],
                  [
                    "HABER",
                    content["data-news"].news.length,
                    "Duyurular ve şirket gelişmeleri",
                  ],
                  [
                    "SON YAYIN",
                    state.publishedAt
                      ? new Date(state.publishedAt).toLocaleDateString(
                          "tr-TR",
                          { timeZone: "Europe/Istanbul" },
                        )
                      : "—",
                    state.publishedAt
                      ? formatDate(state.publishedAt)
                      : "Henüz bir değişiklik yayınlanmadı",
                  ],
                ].map(([label, value, sub]) => (
                  <div className="adm-stat" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <small>{sub}</small>
                  </div>
                ))}
              </div>
              <div className="adm-welcome">
                <div>
                  <span className="adm-eyebrow">SİTENİZİN KONTROLÜ SİZDE</span>
                  <h2>Bir değişiklikle başlayın.</h2>
                  <p>
                    Başlıklar, ürünler, görseller, menüler ve renkler.
                    <br />
                    Kod yazmadan içeriğinizi güncel tutun.
                  </p>
                  <button
                    className="adm-btn adm-primary"
                    onClick={() => navigate("pages")}
                  >
                    Ana sayfayı düzenle →
                  </button>
                </div>
                <div className="adm-welcome-art">
                  <span>K</span>
                  <i />
                  <i />
                </div>
              </div>
              <h2 className="adm-section-title">Hızlı erişim</h2>
              <div className="adm-shortcuts">
                {[
                  [
                    "data-divisions",
                    "01",
                    "Ürünler ve kategoriler",
                    "Ürün ekleyin, grupları düzenleyin.",
                  ],
                  [
                    "data-details",
                    "02",
                    "Ürün detayları",
                    "Fotoğraf, teknik veri ve kataloglar.",
                  ],
                  [
                    "components-Header",
                    "03",
                    "Menü ve duyurular",
                    "Bağlantılarınızı ve logonuzu yönetin.",
                  ],
                  [
                    "design",
                    "04",
                    "Görünüm ve renkler",
                    "Markanızın görünümünü özelleştirin.",
                  ],
                  [
                    "app-iletisim",
                    "05",
                    "İletişim bilgileri",
                    "Adresler, telefonlar ve e-postalar.",
                  ],
                  [
                    "home",
                    "06",
                    "Ana sayfa düzeni",
                    "Bölümleri sıralayın veya gizleyin.",
                  ],
                ].map(([key, no, title, sub]) => (
                  <button key={key} onClick={() => navigate(key)}>
                    <span>{no}</span>
                    <h3>{title}</h3>
                    <p>{sub}</p>
                    <b>→</b>
                  </button>
                ))}
              </div>
              <div className="adm-tip">
                <strong>Nasıl çalışır?</strong>
                <p>
                  1. İçeriği düzenleyin. &nbsp; 2. Taslağı kaydedip önizleyin.
                  &nbsp; 3. “Yayınla” ile ziyaretçilere açın. Yüklenen dosyalar
                  bağlantıyı bilenler tarafından erişilebilir; gizli belge
                  yüklemeyin.
                </p>
              </div>
            </>
          )}
          {current && (
            <div className="adm-editor-card">
              <div className="adm-card-head">
                <div>
                  <span className="adm-live-dot" /> {current.group} /{" "}
                  {current.title}
                </div>
                <span>Yayınlamadan önce önizleyin</span>
              </div>
              {active === "data-details" ? (
                <ProductStudio
                  content={content}
                  update={updateContent}
                  pick={pick}
                  selectedSlug={selectedProduct}
                  onSelect={selectProduct}
                  onPreview={preview}
                />
              ) : active === "home" ? (
                <HomeOrder
                  value={content.home}
                  onChange={(value) => changeSection("home", value)}
                />
              ) : (
                <div className="adm-section-fields">
                  {Object.entries(schemas[active].fields!).map(
                    ([key, schema]) => (
                      <div key={key} className="adm-field-block">
                        <Editor
                          value={
                            (
                              content[active as keyof Content] as Record<
                                string,
                                unknown
                              >
                            )[key]
                          }
                          schema={schema}
                          label={
                            (current.labels[key] !== key
                              ? current.labels[key]
                              : fieldLabels[key]) ||
                            fieldLabels[key] ||
                            key
                          }
                          path={active + "." + key}
                          pick={pick}
                          onChange={(v) =>
                            changeSection(active, {
                              ...content[active as keyof Content],
                              [key]: v,
                            })
                          }
                        />
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          )}
          {active === "pages" && (
            <div className="adm-editor-card">
              <PageWorkspace
                content={content}
                update={updateContent}
                pick={pick}
                selectedPath={selectedPage}
                onSelect={(path) => {
                  setSelectedPage(path);
                  setPreviewPath(path);
                  window.history.replaceState(
                    null,
                    "",
                    "/admin?page=" + encodeURIComponent(path),
                  );
                }}
                onProduct={selectProduct}
                onPreview={preview}
                homeOrder={
                  <HomeOrder
                    value={content.home}
                    onChange={(value) => changeSection("home", value)}
                  />
                }
              />
            </div>
          )}
          {active === "translations" && (
            <div className="adm-editor-card">
              <TranslationStudio
                content={content}
                update={updateContent}
                onPreview={preview}
              />
            </div>
          )}
          {active === "inbox" && <Inbox />}
          {active === "media" && (
            <div className="adm-editor-card adm-padded">{mediaGrid}</div>
          )}
          {active === "account" && (
            <div className="adm-editor-card adm-padded">
              <h2>{username}</h2>
              <p className="adm-muted">
                Parola değiştiğinde diğer açık oturumlar kapatılır. Bu oturumda
                çalışmaya devam edebilirsiniz.
              </p>
              <PasswordForm
                username={username}
                onChanged={() => {
                  setError("");
                  setNotice(
                    "Parolanız değiştirildi. Diğer oturumlar kapatıldı.",
                  );
                }}
              />
            </div>
          )}
          {active === "history" && (
            <>
              <div className="adm-editor-card adm-padded">
                <h2>İçerik yedeği</h2>
                <p className="adm-muted">
                  JSON yedeği metinleri ve ayarları içerir. Görsel dosyaları
                  ayrıca sunucudaki CMS veri klasörüyle birlikte yedekleyin. İçe
                  aktarma taslağı değiştirir; canlı site yayınlayana kadar aynı
                  kalır.
                </p>
                <div className="adm-actions">
                  <button className="adm-btn" onClick={download}>
                    ↓ İçeriği dışa aktar
                  </button>
                  <button
                    className="adm-btn"
                    onClick={() => importInput.current?.click()}
                  >
                    ↑ Yedekten içe aktar
                  </button>
                  <input
                    hidden
                    type="file"
                    accept="application/json,.json"
                    ref={importInput}
                    onChange={(e) => importFile(e.target.files?.[0])}
                  />
                  <button
                    className="adm-btn"
                    onClick={async () => {
                      if (
                        !dirty ||
                        confirm(
                          "Kaydedilmemiş değişiklikler silinecek. Sunucudaki taslak yüklensin mi?",
                        )
                      ) {
                        try {
                          acceptState(await api("/api/admin/content"));
                          setNotice("Güncel taslak yüklendi.");
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }
                    }}
                  >
                    Sunucudaki taslağı yükle
                  </button>
                </div>
              </div>
              <div className="adm-editor-card adm-padded">
                <h2>Son 10 yayın</h2>
                <p className="adm-muted">
                  Geri aldığınız içerik önce taslağa yüklenir. Canlıya almak
                  için ayrıca yayınlayın.
                </p>
                {state.history.length === 0 ? (
                  <p className="adm-muted">
                    İlk yayından sonra önceki sürümler burada görünür.
                  </p>
                ) : (
                  state.history.map((revision, i) => (
                    <div className="adm-history-row" key={revision.id}>
                      <div>
                        <strong>Önceki sürüm {state.history.length - i}</strong>
                        <small>{formatDate(revision.date)}</small>
                      </div>
                      <button
                        className="adm-btn"
                        disabled={busy || pendingUploads > 0}
                        onClick={() => {
                          if (
                            confirm("Bu sürüm mevcut taslağın yerini alsın mı?")
                          )
                            action("restore", { id: revision.id });
                        }}
                      >
                        Taslağa geri al
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </main>
        {pendingUploads > 0 && (
          <div className="adm-upload-status" role="status">
            Yükleme veya kare ekleme işlemini tamamlayın. Ardından kaydedebilir
            veya yayınlayabilirsiniz.
          </div>
        )}
        <footer className="adm-savebar">
          <div>
            <span className={"adm-live-dot " + (dirty ? "is-orange" : "")} />
            <strong>
              {dirty ? "Değişiklikler yayınlanmadı" : "Yayınlamaya hazır"}
            </strong>
            <small>
              Son kayıt:{" "}
              {state.updatedAt ? formatDate(state.updatedAt) : "Henüz yok"}
            </small>
          </div>
          <div className="adm-actions">
            <button
              className="adm-btn adm-preview"
              disabled={busy || pendingUploads > 0}
              onClick={() => preview()}
            >
              ◉ Taslağı önizle
            </button>
            <button
              className="adm-btn"
              disabled={busy || pendingUploads > 0}
              onClick={() => action("save")}
            >
              Taslağı kaydet
            </button>
            <button
              className="adm-btn adm-primary"
              disabled={busy || pendingUploads > 0}
              onClick={() => {
                if (confirm("Bu içerik tüm ziyaretçilere yayınlansın mı?"))
                  action("publish");
              }}
            >
              {busy ? "İşleniyor…" : "Yayınla →"}
            </button>
          </div>
        </footer>
      </div>
      {picker && (
        <div className="adm-modal-backdrop" onClick={() => setPicker(false)}>
          <section
            className="adm-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Medya seç"
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <h2>Medya seçin</h2>
              <button aria-label="Kapat" onClick={() => setPicker(false)}>
                ×
              </button>
            </header>
            {mediaGrid}
          </section>
        </div>
      )}
    </div>
  );
}

export default function AdminClient() {
  return (
    <UploadProvider>
      <AdminClientInner />
    </UploadProvider>
  );
}

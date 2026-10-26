import defaults from "./defaults.json";
export type Schema = {
  type: "string" | "number" | "boolean" | "array" | "object" | "record";
  fields?: Record<string, Schema>;
  item?: Schema;
  optional?: boolean;
  initial?: unknown;
  options?: string[];
};
const string: Schema = { type: "string" };
const strings: Schema = { type: "array", item: string };
const object = (fields: Record<string, Schema>): Schema => ({
  type: "object",
  fields,
});
const list = (fields: Record<string, Schema>): Schema => ({
  type: "array",
  item: object(fields),
});
export function infer(value: unknown): Schema {
  if (Array.isArray(value)) {
    const shapes = value.map(infer);
    return {
      type: "array",
      item: shapes.length ? shapes.reduce(merge) : string,
    };
  }
  if (value && typeof value === "object")
    return object(
      Object.fromEntries(
        Object.entries(value).map(([key, v]) => [key, infer(v)]),
      ),
    );
  return { type: typeof value as "string" | "number" | "boolean" };
}
function merge(a: Schema, b: Schema): Schema {
  if (a.type !== b.type) return a;
  if (a.type === "array")
    return { type: "array", item: merge(a.item!, b.item!) };
  if (a.type === "object") {
    const fields: Record<string, Schema> = {};
    for (const key of new Set([
      ...Object.keys(a.fields!),
      ...Object.keys(b.fields!),
    ])) {
      fields[key] =
        a.fields![key] && b.fields![key]
          ? merge(a.fields![key], b.fields![key])
          : { ...(a.fields![key] || b.fields![key]), optional: true };
    }
    return object(fields);
  }
  return a;
}
export const schemas: Record<string, Schema> = Object.fromEntries(
  Object.entries(defaults).map(([key, value]) => [key, infer(value)]),
);
for (const key of ["image", "imageAlt"])
  schemas["components-Divisions"].fields!.divisions.item!.fields![
    key
  ].optional = true;
for (const key of ["slug", "image", "imageAlt", "imageCaption"])
  schemas["data-news"].fields!.news.item!.fields![key] = {
    ...string,
    optional: true,
  };
schemas["data-news"].fields!.news.item!.fields!.body = {
  ...strings,
  optional: true,
};
schemas.customPages = object({
  pages: list({
    slug: string,
    title: string,
    intro: string,
    seoTitle: string,
    seoDescription: string,
    visible: { type: "boolean" },
    blocks: list({
      title: string,
      text: string,
      image: string,
      alt: string,
      buttonLabel: string,
      buttonHref: string,
    }),
  }),
});
const detail = object({
  description: strings,
  features: strings,
  sections: list({ title: string, text: strings, items: strings }),
  models: strings,
  specs: list({ label: string, value: string }),
  images: list({ src: string, alt: string }),
  documents: list({ title: string, href: string }),
  spin: object({ alt: string, frames: strings }),
});
for (const field of Object.values(detail.fields!)) field.optional = true;
// Existing product fields are optional; missing fields can be added from the form.
for (const field of Object.values(detail.fields!.sections.item!.fields!))
  if (field !== string) field.optional = true;
// Support both explicit frame lists and frame patterns for existing/imported content.
detail.fields!.spin = {
  type: "object",
  optional: true,
  fields: {
    alt: string,
    frames: { ...strings, optional: true },
    pattern: { ...string, optional: true },
    count: { type: "number", optional: true },
    start: { type: "number", optional: true },
    pad: { type: "number", optional: true },
  },
};
schemas["data-details"] = object({ details: { type: "record", item: detail } });
detail.fields!.variants = {
  ...list({
    id: string,
    label: string,
    description: { ...string, optional: true },
    images: { ...detail.fields!.images },
    spin: { ...detail.fields!.spin },
  }),
  optional: true,
};
const colors = {
  ...list({
    id: string,
    label: string,
    swatch: string,
    images: { ...detail.fields!.images },
    spin: { ...detail.fields!.spin },
  }),
  optional: true,
};
detail.fields!.colors = colors;
detail.fields!.variants.item!.fields!.colors = colors;
detail.fields!.line = { ...string, optional: true };
detail.fields!.configurations = {
  ...list({
    id: string,
    composition: string,
    outerLayer: string,
    sizes: string,
    compositionCode: string,
    articleNumber: string,
  }),
  optional: true,
};
detail.fields!.variants.item!.fields!.configurations =
  detail.fields!.configurations;
export function emptyValue(schema: Schema): unknown {
  if (schema.initial !== undefined) return structuredClone(schema.initial);
  if (schema.type === "array") return [];
  if (schema.type === "record") return {};
  if (schema.type === "object")
    return Object.fromEntries(
      Object.entries(schema.fields!)
        .filter(([, s]) => !s.optional)
        .map(([k, s]) => [k, emptyValue(s)]),
    );
  return schema.type === "boolean" ? true : schema.type === "number" ? 0 : "";
}
function validate(
  value: unknown,
  schema: Schema,
  path: string,
  errors: string[],
  depth = 0,
) {
  if (errors.length > 15) return;
  if (depth > 15) {
    errors.push(path + ": çok fazla iç içe alan.");
    return;
  }
  if (value === undefined && schema.optional) return;
  if (schema.type === "array") {
    if (!Array.isArray(value) || value.length > 500) {
      errors.push(path + ": geçersiz liste (en fazla 500 kayıt).");
      return;
    }
    value.forEach((v, i) =>
      validate(v, schema.item!, path + "." + i, errors, depth + 1),
    );
    return;
  }
  if (schema.type === "object" || schema.type === "record") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      errors.push(path + ": geçersiz kayıt.");
      return;
    }
    const obj = value as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (["__proto__", "constructor", "prototype"].includes(key)) {
        errors.push(path + ": geçersiz anahtar.");
        continue;
      }
      if (schema.type === "record") {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key))
          errors.push(
            path + ": ürün adresi küçük harf, sayı ve tire içermeli.",
          );
        validate(obj[key], schema.item!, path + "." + key, errors, depth + 1);
      } else if (!(key in schema.fields!))
        errors.push(path + "." + key + ": bilinmeyen alan.");
    }
    if (schema.type === "object")
      for (const [key, s] of Object.entries(schema.fields!))
        validate(obj[key], s, path + "." + key, errors, depth + 1);
    return;
  }
  if (
    typeof value !== schema.type ||
    (typeof value === "number" && !Number.isFinite(value))
  ) {
    errors.push(path + ": alan türü yanlış.");
    return;
  }
  if (typeof value === "string") {
    if (value.length > 40000) errors.push(path + ": metin çok uzun.");
    if (
      /(?:href|src|heroImage|frames|pattern|metadataBase|url|logo|metin)/i.test(
        path,
      ) &&
      /^\s*(?:javascript|data|vbscript):/i.test(value)
    )
      errors.push(path + ": güvenli olmayan adres.");
    if (
      /\.(?:href|src|heroImage|url|logo|metadataBase|pattern|image|buttonHref)$/.test(
        path,
      ) &&
      value &&
      !/^(?:https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(value)
    )
      errors.push(
        path +
          ": adres /, #, https://, http://, mailto: veya tel: ile başlamalı.",
      );
    if (
      path.endsWith(".date") &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(value + "T12:00:00Z")) ||
        new Date(value + "T12:00:00Z").toISOString().slice(0, 10) !== value)
    )
      errors.push(path + ": tarih YYYY-AA-GG biçiminde olmalı.");
  }
}
export function validateContent(value: unknown): string[] {
  const errors: string[] = [];
  validate(value, { type: "object", fields: schemas }, "İçerik", errors);
  if (errors.length) return errors;
  const c = value as typeof defaults;
  try {
    const url = new URL(c["app-layout"].metadata.metadataBase);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
  } catch {
    errors.push(
      "SEO site adresi geçerli bir http:// veya https:// adresi olmalı.",
    );
  }
  for (const key of [
    "productBackground",
    "productText",
    "productAccent",
    "productGlow",
  ] as const)
    if (!/^#[0-9a-f]{6}$/i.test(c["components-ProductExperience"][key]))
      errors.push("Ürün sayfası renkleri #rrggbb biçiminde olmalı.");
  const discoveryLimit = c["components-ProductDiscovery"].limit;
  if (
    !Number.isInteger(discoveryLimit) ||
    discoveryLimit < 1 ||
    discoveryLimit > 12
  )
    errors.push(
      "Ürün vitrini ilk gösterim sayısı 1–12 arasında bir tam sayı olmalı.",
    );
  const stories = c["components-Hero"].extraStories;
  if (
    stories.length > 5 ||
    new Set(stories.map((s) => s.id)).size !== stories.length ||
    stories.some(
      (s) =>
        s.id === "protection" ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.id) ||
        !s.label.trim(),
    )
  )
    errors.push(
      "Açılış hikâyeleri en fazla 5 kayıt, benzersiz kimlik ve dolu etiket içermeli.",
    );
  const design = c.design;
  for (const key of [
    "brand",
    "brandDark",
    "brandLight",
    "paper",
    "ink",
    "mist",
    "muted",
    "brick",
  ] as const)
    if (!/^#[0-9a-f]{6}$/i.test(design[key]))
      errors.push("Renkler #rrggbb biçiminde olmalı.");
  if (
    design.baseFontSize < 12 ||
    design.baseFontSize > 24 ||
    design.containerWidth < 800 ||
    design.containerWidth > 2000 ||
    design.buttonRadius < 0 ||
    design.buttonRadius > 60
  )
    errors.push(
      "Tasarım ölçüleri: yazı 12–24, genişlik 800–2000, köşe 0–60 olmalı.",
    );
  if (
    /[{};<>]/.test(design.bodyFont + design.headingFont) ||
    /[<>]|@import|url\s*\(/i.test(design.customCss)
  )
    errors.push(
      "Yazı tiplerinde CSS komutu; özel CSS içinde HTML, @import veya url() kullanılamaz.",
    );
  const seen = new Set<string>();
  const newsSlugs = new Set<string>();
  for (const item of c["data-news"].news as Array<{
    title: string;
    slug?: string;
  }>) {
    const slug = item.slug || slugify(item.title);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || newsSlugs.has(slug))
      errors.push(
        "Haber adresleri boş olamaz ve benzersiz küçük harf/rakam/tire içermeli.",
      );
    newsSlugs.add(slug);
  }
  const reserved = [
    "admin",
    "api",
    "media",
    "arama",
    "iletisim",
    "kurumsal",
    "haberler",
    "kariyer",
    "ar-ge",
    "tarihce",
    "dokumanlar",
    "satis-kanallari",
    "mevzuat",
    "gizlilik-ve-guvenlik",
    "teklif-sepeti",
    "teklif-al",
    "paylasim",
  ];
  for (const page of c.customPages.pages as Array<{ slug: string }>) {
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug) ||
      reserved.includes(page.slug) ||
      seen.has("d:" + page.slug)
    )
      errors.push(
        "Özel sayfa adresleri benzersiz olmalı ve sistem adresleriyle çakışmamalı.",
      );
    seen.add("d:" + page.slug);
  }
  for (const d of c["data-divisions"].divisions) {
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug) ||
      [
        "admin",
        "api",
        "media",
        "arama",
        "iletisim",
        "kurumsal",
        "haberler",
        "kariyer",
        "ar-ge",
        "tarihce",
        "dokumanlar",
        "satis-kanallari",
        "mevzuat",
        "gizlilik-ve-guvenlik",
        "teklif-sepeti",
        "teklif-al",
        "paylasim",
      ].includes(d.slug) ||
      seen.has("d:" + d.slug)
    )
      errors.push(
        "Bölüm adresleri benzersiz olmalı ve sistem sayfalarıyla çakışmamalı.",
      );
    seen.add("d:" + d.slug);
    for (const group of d.groups)
      for (const item of group.items) {
        const slug = item.slug;
        if (
          !item.name.trim() ||
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
          seen.has("p:" + slug)
        )
          errors.push(
            "Ürün adları boş olamaz; ürün adresleri benzersiz, küçük harf, sayı ve tire içermeli.",
          );
        seen.add("p:" + slug);
      }
  }
  for (const item of Object.values(c["data-details"].details) as Array<{
    variants?: Array<{ id: string; label: string; spin?: unknown }>;
    spin?: unknown;
  }>) {
    const ids = new Set<string>();
    for (const variant of item.variants || []) {
      if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(variant.id) ||
        !variant.label.trim() ||
        ids.has(variant.id)
      )
        errors.push(
          "Parça kimlikleri benzersiz ve küçük harf/rakam/tire olmalı; ceket veya pantolon etiketini yazın.",
        );
      ids.add(variant.id);
    }
    const extended = item as unknown as {
      configurations?: Array<{
        id: string;
        composition: string;
        outerLayer: string;
      }>;
      colors?: Array<{
        id: string;
        label: string;
        swatch: string;
        spin?: unknown;
      }>;
      variants?: Array<{
        configurations?: Array<{
          id: string;
          composition: string;
          outerLayer: string;
        }>;
        colors?: Array<{
          id: string;
          label: string;
          swatch: string;
          spin?: unknown;
        }>;
      }>;
    };
    for (const configs of [
      extended.configurations || [],
      ...(extended.variants || []).map((v) => v.configurations || []),
    ]) {
      const configIds = new Set<string>(),
        combinations = new Set<string>();
      for (const config of configs) {
        const pair = JSON.stringify([config.composition, config.outerLayer]);
        if (
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(config.id) ||
          !config.composition.trim() ||
          !config.outerLayer.trim() ||
          configIds.has(config.id) ||
          combinations.has(pair)
        )
          errors.push(
            "Malzeme seçeneklerinde kimlikler ve bileşim/dış katman çiftleri benzersiz, etiketler dolu olmalı.",
          );
        configIds.add(config.id);
        combinations.add(pair);
      }
    }
    const colorGroups = [
      extended.colors || [],
      ...(extended.variants || []).map((v) => v.colors || []),
    ];
    for (const group of colorGroups) {
      const colorIds = new Set<string>();
      for (const color of group) {
        if (
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(color.id) ||
          !color.label.trim() ||
          !/^#[a-f0-9]{6}$/i.test(color.swatch) ||
          colorIds.has(color.id)
        )
          errors.push(
            "Renkler benzersiz kimlik, ad ve #rrggbb biçiminde renk örneği içermeli.",
          );
        colorIds.add(color.id);
      }
    }
    for (const spinItem of [
      item,
      ...(item.variants || []),
      ...colorGroups.flat(),
    ]) {
      const spin = (
        spinItem as {
          spin?: {
            frames?: string[];
            pattern?: string;
            count?: number;
            pad?: number;
          };
        }
      ).spin;
      if (
        spin &&
        !(
          (Array.isArray(spin.frames) &&
            spin.frames.length >= 2 &&
            spin.frames.every((f) => /^\/(?!\/)|^https?:\/\//.test(f))) ||
          (!Array.isArray(spin.frames) &&
            typeof spin.pattern === "string" &&
            spin.pattern.includes("{n}") &&
            Number.isInteger(spin.count) &&
            spin.count! >= 2 &&
            spin.count! <= 500 &&
            (spin.pad === undefined || (spin.pad >= 0 && spin.pad <= 8)))
        )
      )
        errors.push(
          "360° için en az iki kare veya {n} içeren adres ve 2–500 kare sayısı gerekli.",
        );
    }
  }
  if (
    !c.home.sections.every((s) =>
      [
        "hero",
        "divisions",
        "about",
        "quality",
        "partners",
        "news",
        "discovery",
        "statement",
      ].includes(s.id),
    ) ||
    new Set(c.home.sections.map((s) => s.id)).size !== c.home.sections.length
  )
    errors.push("Ana sayfa bölüm kimlikleri geçerli ve benzersiz olmalı.");
  return errors;
}
export function slugify(text: string) {
  const map: Record<string, string> = {
    ç: "c",
    ğ: "g",
    ı: "i",
    ö: "o",
    ş: "s",
    ü: "u",
    â: "a",
    î: "i",
    û: "u",
  };
  return text
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşüâîû]/g, (c) => map[c])
    .replace(/[®™]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
export const fieldLabels: Record<string, string> = {
  line: "Ürün serisi",
  configurations: "Malzeme ve dış katman seçenekleri",
  composition: "Malzeme bileşimi",
  outerLayer: "Dış katman",
  sizes: "Beden aralığı",
  compositionCode: "Bileşim kodu",
  articleNumber: "Ürün kodu",
  colors: "Renk seçenekleri ve 360° kareleri",
  swatch: "Renk örneği (#rrggbb)",
  imageAlt: "Görsel açıklaması",
  imageCaption: "Görsel alt yazısı",
  body: "İçerik paragrafları",
  eyebrow: "Üst etiket",
  accent: "Vurgulu başlık",
  linkLabel: "Bağlantı metni",
  pages: "Sayfalar",
  blocks: "Sayfa blokları",
  image: "Görsel",
  buttonLabel: "Düğme metni",
  buttonHref: "Düğme bağlantısı",
  seoTitle: "SEO başlığı",
  seoDescription: "SEO açıklaması",
  variants: "Ceket / pantolon ve diğer parçalar",
  title: "Başlık",
  label: "Etiket",
  text: "Metin",
  value: "Değer",
  name: "Ad",
  href: "Bağlantı",
  src: "Görsel adresi",
  alt: "Görsel açıklaması",
  intro: "Giriş metni",
  slug: "Adres (slug)",
  groups: "Ürün grupları",
  items: "Öğeler / ürün adları",
  description: "Açıklama",
  summary: "Özet",
  date: "Tarih",
  features: "Özellikler",
  sections: "Bölümler",
  models: "Modeller",
  specs: "Teknik özellikler",
  images: "Görseller",
  documents: "Belgeler",
  spin: "360° görüntü",
  frames: "Kare görselleri",
  pattern: "Kare adres kalıbı ({n})",
  count: "Kare sayısı",
  start: "Başlangıç numarası",
  pad: "Numara hane sayısı",
  subtitle: "Alt başlık",
  address: "Adres",
  lines: "İletişim satırları",
  visible: "Görünür",
  id: "Bölüm kimliği",
  default: "Varsayılan",
  template: "Başlık şablonu",
  openGraph: "Sosyal paylaşım",
  siteName: "Site adı",
  locale: "Dil",
  type: "Tür",
  twitter: "X paylaşımı",
  card: "Kart türü",
  metadataBase: "Site adresi",
  url: "Adres",
  logo: "Logo",
  email: "E-posta",
  foundingDate: "Kuruluş yılı",
  legislation: "Mevzuat",
  brochures: "Broşürler",
  videos: "Videolar",
  news: "Haberler",
  openPositions: "Açık pozisyonlar",
  divisions: "Faaliyet alanları",
  details: "Ürün detayları",
};

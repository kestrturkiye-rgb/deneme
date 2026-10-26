import { getSection } from "@/cms/server";
import type { SpinConfig } from "@/lib/spin";

export type ProductColor = {
  id: string;
  label: string;
  swatch: string;
  images?: { src: string; alt: string }[];
  spin?: SpinConfig;
};
export type ProductConfiguration = {
  id: string;
  composition: string;
  outerLayer: string;
  sizes: string;
  compositionCode: string;
  articleNumber: string;
};

export type ProductVariant = {
  configurations?: ProductConfiguration[];
  colors?: ProductColor[];
  id: string;
  label: string;
  description?: string;
  images?: { src: string; alt: string }[];
  spin?: SpinConfig;
};

export type Detail = {
  line?: string;
  configurations?: ProductConfiguration[];
  colors?: ProductColor[];
  variants?: ProductVariant[];
  /** Açıklama paragrafları (boşsa genel giriş metni gösterilir) */
  description?: string[];
  /** Madde madde öne çıkan özellikler */
  features?: string[];
  /** Başlıklı ek bölümler (uygulama alanları, standartlar vb.) */
  sections?: { title: string; text?: string[]; items?: string[] }[];
  /** 360° görüntü (isteğe bağlı): normalde public/products/360/<ürün>/ klasöründen otomatik bulunur */
  spin?: SpinConfig;
  /** Ürün modelleri / varyantları */
  models?: string[];
  /** Teknik veriler tablosu */
  specs?: { label: string; value: string }[];
  /** Görseller (isteğe bağlı): normalde public/products/<ürün>/ klasöründen otomatik bulunur */
  images?: { src: string; alt: string }[];
  /** İndirilebilir belgeler (katalog, sertifika, föy) */
  documents?: { title: string; href: string }[];
};

// Ürün sayfalarında gösterilecek özel içerikler.
// Anahtar, ürünün adresidir (örn. /is-guvenligi/itfaiyeci-elbisesi -> "itfaiyeci-elbisesi").
// Kaydı olmayan ürünlerde genel bir giriş metni gösterilir.
//
// Örnek:
// 'itfaiyeci-elbisesi': {
//   description: ['Ürün açıklaması...'],
//   features: ['Alev yayılımına karşı koruma', 'Yansıtıcı şeritler'],
//   specs: [{ label: 'Standart', value: 'EN 469' }],
//   images: [{ src: '/products/itfaiyeci-elbisesi.jpg', alt: 'İtfaiyeci elbisesi' }],
//   spin: { pattern: '/products/360/itfaiyeci-elbisesi/{n}.jpg', count: 24, alt: 'İtfaiyeci elbisesi' },
//   documents: [{ title: 'Katalog (PDF)', href: '/docs/itfaiyeci-elbisesi.pdf' }],
// },
export async function getDetails(): Promise<Record<string, Detail>> {
  return (await getSection("data-details")).details as Record<string, Detail>;
}

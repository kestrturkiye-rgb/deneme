import { readdirSync } from "node:fs";
import path from "node:path";
import type { SpinConfig } from "./spin";

// Klasör düzeni (klasör adı = ürünün web adresindeki son bölüm):
//   public/products/<ürün>/        -> sayfadaki fotoğraflar (alfabetik sırayla)
//   public/products/360/<ürün>/    -> 360° dönen görüntü kareleri (1, 2, 3... sırayla)

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|svg)$/i;
const ROOT = path.join(process.cwd(), "public", "products");

const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, "tr", { numeric: true, sensitivity: "base" });

function listImages(dir: string) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && IMAGE_EXT.test(entry.name))
      .map((entry) => entry.name)
      .sort(naturalCompare);
  } catch {
    return []; // klasör yoksa medya yok
  }
}

export type ProductMedia = {
  spin?: SpinConfig;
  images: { src: string; alt: string }[];
};

export function getProductMedia(slug: string, name: string): ProductMedia {
  const frames = listImages(path.join(ROOT, "360", slug)).map(
    (file) => `/products/360/${slug}/${encodeURIComponent(file)}`,
  );
  const photos = listImages(path.join(ROOT, slug)).map(
    (file) => `/products/${slug}/${encodeURIComponent(file)}`,
  );

  return {
    // Tek kare dönmez, en az 2 kare gerekir
    spin: frames.length >= 2 ? { frames, alt: name } : undefined,
    images: photos.map((src, i) => ({
      src,
      alt: i === 0 ? name : `${name} – ${i + 1}`,
    })),
  };
}

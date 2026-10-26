// 360° görüntüleyici için saf (React'siz) yardımcılar

export type SpinConfig = {
  /** Görsel açıklaması */
  alt: string;
} & (
  | {
      /** Kare adresi, kare numarası {n} ile yazılır. Örn: /products/360/itfaiyeci/{n}.jpg */
      pattern: string;
      /** Toplam kare sayısı */
      count: number;
      /** İlk karenin numarası (varsayılan 1) */
      start?: number;
      /** Numara kaç haneye sıfırla doldurulur (varsayılan 2 -> 01, 02 ...) */
      pad?: number;
    }
  | {
      /** Hazır kare adresleri listesi (klasörden otomatik bulunanlar için) */
      frames: string[];
    }
);

export function wrapIndex(index: number, total: number) {
  if (total <= 0) return 0;
  return ((index % total) + total) % total;
}

export function frameUrls(config: SpinConfig) {
  if ("frames" in config) return config.frames;

  const { pattern, count, start = 1, pad = 2 } = config;
  if (!pattern.includes("{n}")) {
    throw new Error(`360° kare adresinde {n} yok: ${pattern}`);
  }
  return Array.from({ length: Math.max(0, count) }, (_, i) =>
    pattern.replace("{n}", String(start + i).padStart(pad, "0")),
  );
}

/** Sağa sürükleyince önceki kareye, sola sürükleyince sonraki kareye geçer */
export function frameAfterDrag(
  startIndex: number,
  deltaX: number,
  pixelsPerFrame: number,
  total: number,
) {
  return wrapIndex(startIndex - Math.round(deltaX / pixelsPerFrame), total);
}

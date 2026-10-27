// 360° görüntüleyici için saf (React'siz) yardımcılar

export type SpinConfig = {
  /** Görsel açıklaması */
  alt: string;
  /** Her karenin gerçek görüş açısı; eksik açılar varsa eşit aralık varsayılmaz. */
  angles?: number[];
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

export function frameAngles(config: SpinConfig): number[] {
  const total = frameUrls(config).length;
  return config.angles?.length === total &&
    config.angles.every(
      (angle) => Number.isFinite(angle) && angle >= 0 && angle < 360,
    )
    ? config.angles
    : Array.from({ length: total }, (_, i) => (i * 360) / total);
}

export function closestFrame(angle: number, angles: number[]) {
  const target = wrapIndex(angle, 360);
  let closest = 0,
    distance = Infinity;
  angles.forEach((value, i) => {
    const difference = Math.abs(value - target);
    const circular = Math.min(difference, 360 - difference);
    if (circular < distance) {
      closest = i;
      distance = circular;
    }
  });
  return closest;
}

const ORBIT_TILT = (-6 * Math.PI) / 180;
export function orbitPoint(angle: number) {
  const radians = Math.PI + (angle * Math.PI) / 180;
  const x = 190 * Math.cos(radians),
    y = 30 * Math.sin(radians);
  return {
    x: 210 + x * Math.cos(ORBIT_TILT) - y * Math.sin(ORBIT_TILT),
    y: 48 + x * Math.sin(ORBIT_TILT) + y * Math.cos(ORBIT_TILT),
  };
}

export function orbitAngle(x: number, y: number) {
  const dx = x - 210,
    dy = y - 48;
  const rx = dx * Math.cos(ORBIT_TILT) + dy * Math.sin(ORBIT_TILT);
  const ry = -dx * Math.sin(ORBIT_TILT) + dy * Math.cos(ORBIT_TILT);
  return wrapIndex(
    ((Math.atan2(ry / 30, rx / 190) - Math.PI) * 180) / Math.PI,
    360,
  );
}

export const rotationDelay = (total: number) =>
  Math.max(100, Math.round(4800 / Math.max(1, total)));

/** Sağa sürükleyince önceki kareye, sola sürükleyince sonraki kareye geçer */
export function frameAfterDrag(
  startIndex: number,
  deltaX: number,
  pixelsPerFrame: number,
  total: number,
) {
  return wrapIndex(startIndex - Math.round(deltaX / pixelsPerFrame), total);
}

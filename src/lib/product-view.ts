import type { Detail, ProductColor, ProductVariant } from "@/data/details";
import { frameUrls, type SpinConfig } from "./spin";

export type Pictures = { src: string; alt: string }[];
export type MediaScope = {
  images?: Pictures;
  spin?: SpinConfig;
  spinDisabled?: boolean;
};

/** Resolve the actual selected view once, for the catalogue, page and editor. */
export function productView(
  detail: Detail | undefined,
  fallback: MediaScope = {},
  variantIndex = 0,
  colorIndex = 0,
) {
  const variant: ProductVariant | undefined = detail?.variants?.[variantIndex];
  const colors = variant ? variant.colors : detail?.colors;
  const color: ProductColor | undefined = colors?.[colorIndex];
  const scope: MediaScope = color || variant || detail || {};
  const spin = scope.spinDisabled
    ? undefined
    : scope.spin || (!color && !variant ? fallback.spin : undefined);
  const images = color
    ? (color.images ??
      (spin ? [{ src: frameUrls(spin)[0], alt: color.label }] : []))
    : (variant?.images ?? detail?.images ?? fallback.images ?? []);
  const frames = spin ? frameUrls(spin) : [];
  return { images, spin, frames, image: images[0]?.src || frames[0] };
}

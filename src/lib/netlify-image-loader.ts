"use client";
import type { ImageLoaderProps } from "next/image";

export default function netlifyImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps) {
  const query = new URLSearchParams({
    url: src,
    w: String(width),
    q: String(quality ?? 75),
  });
  return "/.netlify/images?" + query;
}

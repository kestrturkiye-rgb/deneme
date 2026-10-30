"use client";
import SiteImage from "./SiteImage";
import BrandLines from "./BrandLines";
import { usePathname } from "next/navigation";
import { useSection } from "@/cms/context";
import type { PageLayout } from "@/cms/workspace";
type Props = {
  title: string;
  intro?: string;
  image?: string;
  imageAlt?: string;
  eyebrow?: string;
  caption?: string;
};
export default function PageBanner({
  title,
  intro,
  image,
  imageAlt = "",
  eyebrow,
  caption,
}: Props) {
  const path = usePathname(),
    layouts = useSection("pageLayouts");
  const banner = (layouts?.pages as Record<string, PageLayout>)?.[path]?.banner;
  if (banner?.hidden) return null;
  title = banner?.title ?? title;
  intro = banner?.intro ?? intro;
  image = banner?.image ?? image;
  imageAlt = banner?.alt ?? imageAlt;
  return (
    <section className={"kg-page-banner" + (image ? " kg-editorial-hero" : "")}>
      {image && (
        <SiteImage
          src={image}
          alt={imageAlt}
          fill
          sizes="100vw"
          fetchPriority="high"
        />
      )}
      <div className="container-site">
        {eyebrow && <p className="editorial-eyebrow">{eyebrow}</p>}
        <span className="kg-banner-rule" aria-hidden="true" />
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
        {caption && <small className="editorial-caption">{caption}</small>}
      </div>
      <BrandLines className="kg-banner-lines" />
    </section>
  );
}

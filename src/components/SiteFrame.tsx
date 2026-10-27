"use client";
import VisualEffects from "./VisualEffects";
import { usePathname } from "next/navigation";
import { ContentProvider } from "@/cms/context";
import type { Content } from "@/cms/store";
import type { CSSProperties } from "react";
export default function SiteFrame({
  content,
  header,
  footer,
  children,
  preview,
}: {
  content: Content;
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
  preview: boolean;
}) {
  const path = usePathname();
  if (path.startsWith("/admin")) return <>{children}</>;
  const d = content.design;
  const style: Record<string, string | number> = {
    "--body-font": path === "/" ? d.homeBodyFont || d.bodyFont : d.bodyFont,
    "--heading-font":
      path === "/" ? d.homeHeadingFont || d.headingFont : d.headingFont,
    "--container-width": d.containerWidth + "px",
    "--button-radius": d.buttonRadius + "px",
    fontSize: d.baseFontSize + "px",
  };
  const colors = {
    brand: d.brand,
    "brand-dark": d.brandDark,
    "brand-light": d.brandLight,
    paper: d.paper,
    ink: d.ink,
    mist: d.mist,
    muted: d.muted,
    brick: d.brick,
    "surface-glow": d.surfaceGlow,
  };
  for (const [key, hex] of Object.entries(colors))
    style["--color-" + key] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16))
      .join(" ");
  return (
    <ContentProvider content={content}>
      <div
        className={
          "site-shell kg-redesign kg-identity" +
          (path === "/" ? " kg-home" : "")
        }
        style={style as CSSProperties}
      >
        <style>{`html { font-size: ${d.baseFontSize}px; } body { background: ${d.paper}; }`}</style>
        <a
          href={content["app-layout"].metin01}
          className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-white"
        >
          {content["app-layout"].metin02}
        </a>
        {d.customCss && (
          <style>{`@scope (.site-shell) { ${d.customCss} }`}</style>
        )}
        {preview && (
          <aside className="cms-preview-bar">
            TASLAK ÖNİZLEMESİ · Bu değişiklikler ziyaretçilere görünmez.{" "}
            <a href="/admin">Yönetime dön</a>
          </aside>
        )}
        {header}
        <main id="icerik">{children}</main>
        {footer}
        <VisualEffects />
      </div>
    </ContentProvider>
  );
}

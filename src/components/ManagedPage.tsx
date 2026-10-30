"use client";
import {useLocale} from "@/i18n/context";
import {localizedHref} from "@/i18n/locales";
import { splitLocale } from "@/i18n/locales";
import { usePathname } from "next/navigation";
import { useSection } from "@/cms/context";
import type { PageLayout } from "@/cms/workspace";
import ContentBlockView from "./ContentBlockView";
import PageBanner from "./PageBanner";

export default function ManagedPage({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale=useLocale();
  const path = splitLocale(usePathname()).path,
    layouts = useSection("pageLayouts");
  const layout = (layouts?.pages as Record<string, PageLayout>)?.[path];
  const replace = path !== "/" && layout?.replaceContent;
  return (
    <>
      {replace ? (
        <PageBanner
          title={layout.banner?.title || ""}
          intro={layout.banner?.intro}
        />
      ) : (
        children
      )}
      {layout?.blocks?.length ? (
        <section className="managed-page-blocks" aria-label="Sayfa içerikleri">
          <div className="source-content container-site">
            {layout.blocks
              .filter((block) => block.visible !== false)
              .map((block, i) => (
                <ContentBlockView
                  key={i}
                  block={block}
                  action={
                    block.buttonLabel && block.buttonHref ? (
                      <a
                        className="btn-outline"
                        href={localizedHref(block.buttonHref,locale)}
                        target={
                          block.buttonHref.startsWith("http") ||
                          block.buttonHref.toLowerCase().includes(".pdf")
                            ? "_blank"
                            : undefined
                        }
                        rel="noopener noreferrer"
                      >
                        {block.buttonLabel}
                      </a>
                    ) : undefined
                  }
                />
              ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

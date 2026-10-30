import type { Content } from "./store";
import type { CustomBlock } from "./pages";
import { slugify } from "./schema";

export type PageLayout = {
  banner?: {
    title?: string;
    intro?: string;
    image?: string;
    alt?: string;
    hidden?: boolean;
  };
  blocks?: CustomBlock[];
  replaceContent?: boolean;
};
export type PageEntry = {
  path: string;
  title: string;
  group: string;
  sections: string[];
  image?: string;
  intro?: string;
  productSlug?: string;
};
const standard = [
  [
    "/",
    "Ana sayfa",
    "home",
    "components-Hero",
    "components-Partners",
    "components-Divisions",
    "components-ProductDiscovery",
    "components-About",
    "components-BrandStatement",
    "components-Quality",
    "components-NewsPreview",
  ],
  [
    "/kurumsal",
    "Kurumsal",
    "app-kurumsal",
    "components-About",
    "components-Divisions",
  ],
  ["/tarihce", "Tarihçe", "app-tarihce"],
  ["/ar-ge", "Ar-Ge", "app-ar-ge"],
  ["/urunler", "Ürünlerimiz", "app-urunler", "components-Divisions"],
  ["/haberler", "Haberler", "app-haberler", "data-news"],
  ["/satis-kanallari", "Satış kanalları", "app-satis-kanallari"],
  [
    "/dokumanlar",
    "Dokümanlar",
    "app-dokumanlar",
    "data-documents",
    "components-DocumentLink",
  ],
  ["/mevzuat", "Mevzuat", "app-mevzuat", "data-documents"],
  ["/kariyer", "Kariyer", "app-kariyer", "data-careers"],
  ["/iletisim", "İletişim", "app-iletisim", "components-MessageForm"],
  ["/teklif-al", "Teklif iste", "app-teklif-al", "components-MessageForm"],
  [
    "/teklif-sepeti",
    "Teklif sepeti",
    "app-teklif-sepeti",
    "components-QuoteCart",
  ],
  ["/gizlilik-ve-guvenlik", "Gizlilik ve güvenlik", "app-gizlilik-ve-guvenlik"],
  ["/arama", "Arama", "app-arama"],
];
export function pageEntries(content: Content): PageEntry[] {
  const pages: PageEntry[] = standard.map(([path, title, ...sections]) => {
    const raw = content[
      sections.find((key) => key.startsWith("app-")) as keyof Content
    ] as unknown as Record<string, unknown> | undefined;
    return {
      path,
      title,
      sections,
      group: "Sayfalar",
      image: String(raw?.heroImage || raw?.image || ""),
      intro: String(raw?.metin02 || raw?.intro || ""),
    };
  });
  for (const d of content["data-divisions"].divisions) {
    const visual = content["components-Divisions"].divisions.find(
      (v) => v.href === "/" + d.slug,
    );
    pages.push({
      path: "/" + d.slug,
      title: d.title,
      intro: d.intro,
      image: visual?.image,
      group: "Bölümler",
      sections: ["data-divisions", "components-Divisions", "app-[division]"],
    });
    for (const g of d.groups)
      for (const p of g.items)
        pages.push({
          path: `/${d.slug}/${p.slug}`,
          title: p.name,
          productSlug: p.slug,
          group: "Ürünler ve kategoriler",
          sections: [],
        });
  }
  for (const p of content.customPages.pages)
    pages.push({
      path: "/" + p.slug,
      title: p.title,
      intro: p.intro,
      group: "Özel sayfalar",
      sections: ["customPages"],
    });
  for (const n of content["data-news"].news)
    pages.push({
      path: "/haberler/" + (n.slug || slugify(n.title)),
      title: n.title,
      image: n.image,
      intro: n.summary,
      group: "Haber detayları",
      sections: ["data-news"],
    });
  return pages;
}
export function layoutFor(content: Content, path: string): PageLayout {
  return (
    (content.pageLayouts?.pages as Record<string, PageLayout> | undefined)?.[
      path
    ] || {}
  );
}
export function changeLayout(
  content: Content,
  path: string,
  value: PageLayout,
): Content {
  return {
    ...content,
    pageLayouts: { pages: { ...content.pageLayouts?.pages, [path]: value } },
  };
}

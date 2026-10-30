import { pageMetadata } from "@/lib/metadata";
import { slugify } from "@/cms/schema";
import { getSection } from "@/cms/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageBanner from "@/components/PageBanner";
import { getCustomPages } from "@/cms/pages";
import { getDivisions, getDivision } from "@/data/divisions";
import { getDetails } from "@/data/details";
import { getProductMedia } from "@/lib/product-media";
import { productView } from "@/lib/product-view";
import ProductCard from "@/components/ProductCard";
import ContentBlocks from "@/components/ContentBlocks";

type Props = {
  params: Promise<{ division: string }>;
};

// Bölümler ve panelden yayınlanan özel sayfalar istekte okunur.
export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { division } = await params;
  const custom = (await getCustomPages()).find(
    (p) => p.slug === division && p.visible,
  );
  if (custom)
    return pageMetadata("/" + division, {
      title: custom.seoTitle || custom.title,
      description: custom.seoDescription || custom.intro,
    });
  const data = await getDivision(division);
  if (!data) return {};
  return pageMetadata("/" + division, {
    title: data.title,
    description: data.intro,
  });
}

export default async function DivisionPage({ params }: Props) {
  const cms = await getSection("app-[division]");

  const { division } = await params;
  const custom = (await getCustomPages()).find(
    (p) => p.slug === division && p.visible,
  );
  if (custom)
    return (
      <>
        <PageBanner title={custom.title} intro={custom.intro} />
        <ContentBlocks blocks={custom.blocks} />
      </>
    );
  const data = await getDivision(division);
  if (!data) notFound();

  const others = (await getDivisions()).filter((d) => d.slug !== data.slug);
  const details = await getDetails();
  const visual = (await getSection("components-Divisions")).divisions.find(
    (d) => d.href === "/" + data.slug,
  );

  return (
    <>
      <PageBanner
        title={data.title}
        intro={data.intro}
        image={visual?.image}
        imageAlt={visual?.imageAlt}
        eyebrow={cms.catalogEyebrow}
      />
      <nav className="catalog-group-nav" aria-label={cms.groupLabel}>
        <div className="container-site">
          {data.groups.map((group) => (
            <a key={group.title} href={"#" + slugify(group.title)}>
              {group.title}
            </a>
          ))}
        </div>
      </nav>

      <section className="bg-mist py-16 md:py-24">
        <div className="container-site space-y-16">
          {data.groups.map((group) => (
            <div
              className="catalog-group"
              key={group.title}
              id={slugify(group.title)}
            >
              <h2 className="border-b border-mist-dark pb-4 text-3xl font-semibold text-ink md:text-4xl">
                {group.title}
              </h2>
              <ul className="kg-product-grid catalog-grid mt-8">
                {group.items
                  .filter((item) => !item.parentSlug)
                  .map((item, index) => {
                    const detail = details[item.slug];
                    const media = getProductMedia(item.slug, item.name);
                    const { image, frames } = productView(detail, media);
                    return (
                      <li key={item.slug}>
                        <ProductCard
                          href={`/${data.slug}/${item.slug}`}
                          name={item.name}
                          category={group.title}
                          image={image}
                          index={index}
                          hasSpin={frames.length >= 2}
                          label={
                            data.slug === "madencilik"
                              ? cms.infoLabel
                              : cms.productLabel
                          }
                          action={
                            data.slug === "madencilik"
                              ? cms.infoViewLabel
                              : cms.viewLabel
                          }
                          summary={(
                            detail?.description?.[0] || cms.cardFallback
                          ).slice(0, 145)}
                          tags={[
                            detail?.line,
                            detail?.configurations?.[0]?.sizes,
                          ].filter((value): value is string => Boolean(value))}
                        />
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-paper py-16">
        <div className="container-site flex flex-wrap items-center justify-between gap-6">
          <p className="font-display text-2xl font-semibold uppercase tracking-wide text-ink">
            {cms.metin01}
          </p>
          <div className="flex flex-wrap gap-4">
            {others.map((d) => (
              <Link key={d.slug} href={`/${d.slug}`} className="btn-outline">
                {d.title}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

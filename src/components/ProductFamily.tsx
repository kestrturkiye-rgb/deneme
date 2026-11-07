import Link from "@/components/LocalizedLink";
import { getSection } from "@/cms/server";
import { productHref, type Product } from "@/data/catalog";
import type { Detail } from "@/data/details";
import { getProductMedia } from "@/lib/product-media";
import { productView } from "@/lib/product-view";
import ProductCard from "./ProductCard";
import BrandLines from "./BrandLines";
import PageBanner from "./PageBanner";
import NicheShowcase, { type NicheItem } from "./NicheShowcase";
import type { PageLayout } from "@/cms/workspace";

/** Families that open with the stone-wall niche gallery (tall garments fit the niches). */
const NICHE_FAMILIES = new Set(["itfaiyeci-elbisesi"]);

export default async function ProductFamily({
  product,
  models,
  details,
  description,
}: {
  product: Product;
  models: Product[];
  details: Record<string, Detail>;
  description: string[];
}) {
  const cms = await getSection("app-[division]-[slug]");
  const labels = await getSection("components-ProductExperience");
  const intro = description[0] || cms.familyIntro;
  const shortIntro = intro.length > 280 ? intro.slice(0, 277) + "…" : intro;
  // Page banner set in the admin under "Sayfalar ve görseller" (pageLayouts).
  const layouts = (await getSection("pageLayouts")) as
    | { pages?: Record<string, PageLayout> }
    | undefined;
  const banner =
    layouts?.pages?.["/" + product.divisionSlug + "/" + product.slug]?.banner;
  const hasBanner = Boolean(banner?.image && !banner.hidden);

  let niches: NicheItem[] = [];
  let nicheHint = "";
  if (NICHE_FAMILIES.has(product.slug)) {
    const spinLabels = await getSection("components-Product360");
    nicheHint = String(spinLabels.metin04 || "");
    niches = models.flatMap((model) => {
      const detail = details[model.slug];
      const { images, frames } = productView(
        detail,
        getProductMedia(model.slug, model.name),
      );
      const list = frames.length >= 2 ? frames : images.map((i) => i.src);
      if (!list.length) return [];
      return [
        {
          href: productHref(model),
          name: model.name,
          line: detail?.line,
          frames: list.slice(0, 36),
          alt: model.name,
        },
      ];
    });
  }

  return (
    <section className="product-family">
      {hasBanner && (
        <PageBanner
          title={product.name}
          intro={shortIntro}
          eyebrow={product.groupTitle}
        />
      )}
      <div className="container-site">
        <nav className="product-breadcrumb" aria-label={labels.breadcrumb}>
          <Link href="/">{labels.home}</Link>
          <span aria-hidden="true">/</span>
          <Link href={"/" + product.divisionSlug}>{product.divisionTitle}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{product.name}</span>
        </nav>
        {!hasBanner && (
          <header className="family-heading">
            <BrandLines className="kg-family-lines" />
            <p className="family-eyebrow">{product.groupTitle}</p>
            <h1>{product.name}</h1>
            <p className="family-intro">{shortIntro}</p>
          </header>
        )}
      </div>
      {niches.length >= 3 && (
        <NicheShowcase
          items={niches}
          eyebrow={product.groupTitle}
          hint={nicheHint}
          action={cms.modelAction}
        />
      )}
      <div className="container-site">
        <section id="modeller" aria-labelledby="family-models-heading">
          <div className="family-models-heading">
            <h2 id="family-models-heading">{cms.metin05}</h2>
            <span>
              {models.length} {cms.familyCountLabel}
            </span>
          </div>
          <ul className="kg-product-grid family-model-grid">
            {models.map((model, index) => {
              const detail = details[model.slug];
              const media = getProductMedia(model.slug, model.name);
              const { image, frames } = productView(detail, media);
              return (
                <li key={model.slug}>
                  <ProductCard
                    href={productHref(model)}
                    name={model.name}
                    category={detail?.line || product.name}
                    image={image}
                    index={index}
                    hasSpin={frames.length >= 2}
                    label={cms.modelLabel}
                    action={cms.modelAction}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </section>
  );
}

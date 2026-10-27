import Link from "next/link";
import { getSection } from "@/cms/server";
import { productHref, type Product } from "@/data/catalog";
import type { Detail } from "@/data/details";
import { getProductMedia } from "@/lib/product-media";
import { frameUrls } from "@/lib/spin";
import ProductCard from "./ProductCard";
import BrandLines from "./BrandLines";

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
  return (
    <section className="product-family">
      <div className="container-site">
        <nav className="product-breadcrumb" aria-label={labels.breadcrumb}>
          <Link href="/">{labels.home}</Link>
          <span aria-hidden="true">/</span>
          <Link href={"/" + product.divisionSlug}>
            {product.divisionTitle}
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{product.name}</span>
        </nav>
        <header className="family-heading">
          <BrandLines className="kg-family-lines" />
          <p className="family-eyebrow">{product.groupTitle}</p>
          <h1>{product.name}</h1>
          <p className="family-intro">
            {intro.length > 280 ? intro.slice(0, 277) + "…" : intro}
          </p>
        </header>
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
              const variant = detail?.variants?.[0];
              const color = detail?.colors?.[0] || variant?.colors?.[0];
              const spin =
                color?.spin || variant?.spin || detail?.spin || media.spin;
              const frames = spin ? frameUrls(spin) : [];
              const image =
                color?.images?.[0]?.src ||
                detail?.images?.[0]?.src ||
                variant?.images?.[0]?.src ||
                media.images[0]?.src ||
                frames[0];
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

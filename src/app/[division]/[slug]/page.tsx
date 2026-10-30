import { pageMetadata } from "@/lib/metadata";
import { getSection } from "@/cms/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductExperience from "@/components/ProductExperience";
import ProductFamily from "@/components/ProductFamily";
import DocumentLink from "@/components/DocumentLink";
import ArrowUpRight from "@/components/ArrowUpRight";
import { getProduct, productHref, getProducts } from "@/data/catalog";
import { getDetails } from "@/data/details";
import { getProductMedia } from "@/lib/product-media";
import { productView } from "@/lib/product-view";
import "./product.css";
import "./product-stage.css";
import "./product-family.css";
type Props = { params: Promise<{ division: string; slug: string }> };
export const dynamicParams = true;
async function introFor(
  name: string,
  group: string,
  division: string,
  slug: string,
) {
  const custom = (await getDetails())[slug]?.description;
  if (custom?.length) return custom;
  const template = (await getSection("app-[division]-[slug]")).fallbackIntro;
  return [
    template
      .replaceAll("{name}", name)
      .replaceAll("{division}", division)
      .replaceAll("{group}", group),
  ];
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { division, slug } = await params;
  const p = await getProduct(division, slug);
  if (!p) return {};
  return pageMetadata(productHref(p), {
    title: p.name,
    description: (
      await introFor(p.name, p.groupTitle, p.divisionTitle, slug)
    )[0],
  });
}
export default async function ProductPage({ params }: Props) {
  const { division, slug } = await params;
  const product = await getProduct(division, slug);
  if (!product) notFound();
  const cms = await getSection("app-[division]-[slug]");
  const labels = await getSection("components-ProductExperience");
  const allDetails = await getDetails();
  const detail = allDetails[slug];
  const media = getProductMedia(product.slug, product.name);
  const images = detail?.images ?? media.images;
  const spin = detail?.spinDisabled ? undefined : (detail?.spin ?? media.spin);
  const description = await introFor(
    product.name,
    product.groupTitle,
    product.divisionTitle,
    slug,
  );
  const allProducts = await getProducts();
  const models = allProducts.filter(
    (p) =>
      p.divisionSlug === division &&
      (p.parentSlug === slug || p.relatedFamilies?.includes(slug)),
  );
  const isFamily = models.length > 0;
  const normalizeName = (name: string) =>
    name
      .normalize("NFKC")
      .replace(/[–—]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .toLocaleLowerCase("tr-TR");
  const modelByName = new Map(
    models.map((model) => [normalizeName(model.name), model]),
  );
  // Source family descriptions sometimes contain only model names. They belong
  // in the selectable catalogue, rather than the product description preview.
  const familyDescription = description.filter(
    (text) => !modelByName.has(normalizeName(text)),
  );
  const sourceOrder = new Map(
    description.map((name, index) => [normalizeName(name), index]),
  );
  models.sort(
    (a, b) =>
      (sourceOrder.get(normalizeName(a.name)) ?? description.length) -
      (sourceOrder.get(normalizeName(b.name)) ?? description.length),
  );
  const hasDetails = Boolean(
    detail?.features?.length ||
      detail?.sections?.length ||
      (isFamily ? familyDescription.length : description.length),
  );
  function detailText(text: string) {
    const model = modelByName.get(normalizeName(text));
    return model ? (
      <Link className="product-family-model-link" href={productHref(model)}>
        {text} →
      </Link>
    ) : (
      text
    );
  }
  const parent = allProducts.find((p) => p.slug === product.parentSlug);
  const related = allProducts.filter(
    (p) =>
      p.divisionSlug === product.divisionSlug &&
      p.groupTitle === product.groupTitle &&
      p.slug !== product.slug &&
      (product.parentSlug
        ? p.parentSlug === product.parentSlug
        : !p.parentSlug),
  );
  return (
    <>
      {parent && (
        <nav
          className="product-parent-nav container-site"
          aria-label={cms.parentLabel}
        >
          <Link href={productHref(parent)}>← {parent.name}</Link>
        </nav>
      )}
      {isFamily ? (
        <ProductFamily
          product={product}
          models={models}
          details={allDetails}
          description={familyDescription}
        />
      ) : (
        <ProductExperience
          {...product}
          href={productHref(product)}
          description={description}
          features={detail?.features ?? []}
          images={images}
          spin={spin}
          variants={detail?.variants ?? []}
          line={detail?.line}
          configurations={detail?.configurations ?? []}
          colors={detail?.colors ?? []}
          relatedProduct={
            related[0]
              ? {
                  name: related[0].name,
                  href: productHref(related[0]),
                  image: productView(
                    allDetails[related[0].slug],
                    getProductMedia(related[0].slug, related[0].name),
                  ).image,
                }
              : undefined
          }
        />
      )}
      <div className="product-detail-nav">
        <div className="container-site">
          {models.length > 0 && <a href="#modeller">{cms.metin05}</a>}
          {hasDetails && <a href="#urun-detaylari">{labels.details}</a>}
          {Boolean(detail?.specs?.length) && (
            <a href="#teknik-bilgiler">{labels.technical}</a>
          )}
          {Boolean(detail?.documents?.length) && (
            <a href="#urun-belgeleri">{labels.documents}</a>
          )}
          {Boolean(detail?.videos?.length) && (
            <a href="#urun-videolari">{cms.videosTitle}</a>
          )}
        </div>
      </div>
      {hasDetails && (
        <section id="urun-detaylari" className="product-details-section">
          <div className="container-site product-details-grid">
            <div>
              <span className="product-kicker">{labels.detailKicker}</span>
              <h2>{labels.details}</h2>
            </div>
            <div>
              {detail?.features && detail.features.length > 0 && (
                <ul className="product-all-features">
                  {detail.features.map((feature, i) => (
                    <li key={i}>
                      <span>+</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              )}
              {detail?.sections?.map((section, i) => (
                <article key={i} className="product-detail-article">
                  <h3>{section.title}</h3>
                  {section.text?.map((text, j) => (
                    <p key={j}>{detailText(text)}</p>
                  ))}
                  {section.items && (
                    <ul>
                      {section.items.map((text, j) => (
                        <li key={j}>{detailText(text)}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
              {!detail?.sections?.length &&
                !detail?.features?.length &&
                (isFamily ? familyDescription : description).map((p, i) => (
                  <p key={i} className="product-detail-paragraph">
                    {p}
                  </p>
                ))}
            </div>
          </div>
        </section>
      )}
      {Boolean(detail?.specs?.length) && (
        <section id="teknik-bilgiler" className="product-spec-section">
          <div className="container-site product-details-grid">
            <h2>{labels.technical}</h2>
            <dl>
              {detail!.specs!.map((s, i) => (
                <div key={i}>
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}
      {Boolean(detail?.documents?.length) && (
        <section id="urun-belgeleri" className="product-document-section">
          <div className="container-site product-details-grid">
            <h2>{labels.documents}</h2>
            <div>
              {detail!.documents!.map((d, i) => (
                <DocumentLink key={i} href={d.href} action="↓">
                  <span>{d.title}</span>
                </DocumentLink>
              ))}
            </div>
          </div>
        </section>
      )}
      {Boolean(detail?.videos?.length) && (
        <section id="urun-videolari" className="product-document-section">
          <div className="container-site product-details-grid">
            <h2>{cms.videosTitle}</h2>
            <div>
              {detail!.videos!.map((video) => (
                <a
                  key={video.href}
                  href={video.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>{video.title}</span>
                  <ArrowUpRight />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
      {Boolean(detail?.models?.length) && (
        <section className="product-model-section">
          <div className="container-site">
            <h2>{cms.metin05}</h2>
            <ul>
              {detail!.models!.map((model, i) => (
                <li key={i}>{detailText(model)}</li>
              ))}
            </ul>
            <Link href="/iletisim" className="btn-outline">
              {cms.metin07}
            </Link>
          </div>
        </section>
      )}
      {!isFamily && related.length > 0 && (
        <section className="product-related">
          <div className="container-site">
            <span className="product-kicker">{product.groupTitle}</span>
            <h2>{labels.related}</h2>
            <div className="product-related-grid">
              {related.map((p) => (
                <Link href={productHref(p)} key={p.slug}>
                  <span>{p.name}</span>
                  <b>→</b>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

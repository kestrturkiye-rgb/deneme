import { pageMetadata } from "@/lib/metadata";
import { getSection } from "@/cms/server";
import type { Metadata } from "next";
import Link from "next/link";
import SiteImage from "@/components/SiteImage";
import PageBanner from "@/components/PageBanner";
import ContentBlocks from "@/components/ContentBlocks";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("/kurumsal", (await getSection("app-kurumsal")).metadata);
}

export default async function CorporatePage() {
  const cms = await getSection("app-kurumsal");
  const areas = cms.areas;
  const facts = (await getSection("components-About")).facts;
  const visuals = (await getSection("components-Divisions")).divisions;

  return (
    <>
      <PageBanner
        title={cms.metin01}
        intro={cms.metin02}
        image={cms.heroImage}
        imageAlt={cms.heroAlt}
        eyebrow={cms.heroEyebrow}
        caption={cms.heroCaption}
      />

      <section className="bg-paper py-16 md:py-24">
        <div className="container-site corporate-story">
          <div>
            <p className="editorial-eyebrow">{cms.storyEyebrow}</p>
            <h2>{cms.storyTitle}</h2>
            <dl className="editorial-facts">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt>{f.value}</dt>
                  <dd>{f.label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="corporate-story-text space-y-6 text-base leading-relaxed text-ink md:text-lg">
            <p>{cms.metin03}</p>
            <p>{cms.metin04}</p>
            <p>{cms.metin05}</p>
            <p>{cms.metin06}</p>
          </div>
        </div>
      </section>

      <section className="bg-paper pb-16" aria-label={cms.sourceTitle}>
        <ContentBlocks blocks={cms.sourceBlocks} />
      </section>
      <section className="bg-mist py-16 md:py-24">
        <div className="container-site">
          <h2 className="text-3xl font-semibold text-ink md:text-4xl">
            {cms.metin07}
          </h2>

          <dl className="corporate-areas mt-10">
            {areas.map((area, index) => (
              <div key={area.title} className="corporate-area">
                {visuals[index]?.image && (
                  <SiteImage
                    className="corporate-area-image"
                    src={visuals[index].image!}
                    alt={visuals[index].imageAlt || area.title}
                    fill
                    sizes="(max-width: 750px) 100vw, 50vw"
                  />
                )}
                <span className="editorial-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <dt className="font-display text-2xl font-semibold uppercase tracking-wide text-ink">
                  {area.href ? (
                    <Link
                      href={area.href}
                      className="transition-colors hover:text-brand-500"
                    >
                      {area.title}
                    </Link>
                  ) : (
                    area.title
                  )}
                </dt>
                <dd className="mt-3 text-[15px] leading-relaxed text-muted">
                  {area.text}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-12">
            <Link href={cms.metin08} className="btn-primary">
              {cms.metin09}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

import { pageMetadata } from "@/lib/metadata";
import { getSection } from "@/cms/server";
import type { Metadata } from "next";
import Link from "next/link";
import PageBanner from "@/components/PageBanner";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("/ar-ge", (await getSection("app-ar-ge")).metadata);
}

// [standart, açıklama]

export default async function RdPage() {
  const cms = await getSection("app-ar-ge");
  const blocks = cms.blocks;
  const tests: [string, string][] = cms.tests as [string, string][];

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

      <section className="bg-mist py-16 md:py-24">
        <div className="container-site">
          <div className="editorial-section-head">
            <h2>{cms.processTitle}</h2>
            <p>{cms.processIntro}</p>
          </div>
          <div className="research-process">
            {blocks.map((b, index) => (
              <div key={b.title} className="research-step">
                <span className="editorial-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h2 className="text-2xl font-semibold text-ink">{b.title}</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  {b.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paper py-16 md:py-24">
        <div className="container-site max-w-5xl">
          <h2 className="text-3xl font-semibold text-ink md:text-4xl">
            {cms.metin03}
          </h2>
          <dl className="mt-8 divide-y divide-mist-dark border-y border-mist-dark">
            {tests.map(([standard, description]) => (
              <div
                key={standard}
                className="grid gap-1 py-4 md:grid-cols-[240px_1fr] md:gap-6"
              >
                <dt className="font-display text-lg font-semibold uppercase tracking-wide text-brand-600">
                  {standard}
                </dt>
                <dd className="text-[15px] leading-relaxed text-ink">
                  {description}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-12">
            <Link href={cms.metin04} className="btn-primary">
              {cms.metin05}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

import { pageMetadata } from "@/lib/metadata";
import { getSection } from "@/cms/server";
import type { Metadata } from "next";
import Link from "@/components/LocalizedLink";
import PageBanner from "@/components/PageBanner";
import { getOpenPositions } from "@/data/careers";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("/kariyer", (await getSection("app-kariyer")).metadata);
}

export default async function CareerPage() {
  const cms = await getSection("app-kariyer");

  return (
    <>
      <PageBanner title={cms.metin01} intro={cms.metin02} />

      <section className="bg-mist py-16 md:py-24">
        <div className="container-site max-w-4xl">
          <h2 className="text-3xl font-semibold text-ink md:text-4xl">
            {cms.metin03}
          </h2>

          {(await getOpenPositions()).length === 0 ? (
            <p className="mt-6 border border-mist-dark bg-paper p-8 text-muted">
              {cms.metin04}
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-mist-dark border-y border-mist-dark bg-paper">
              {(await getOpenPositions()).map((job) => (
                <li
                  key={job.href}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-5"
                >
                  <span className="text-lg font-semibold text-ink">
                    {job.title}
                  </span>
                  <a
                    href={job.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    {cms.metin05}
                  </a>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-12 border border-mist-dark bg-paper p-8">
            <h2 className="text-2xl font-semibold text-ink">{cms.metin06}</h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
              {cms.metin07}
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link href={cms.metin08} className="btn-primary">
                {cms.metin09}
              </Link>
              <a
                href={cms.metin10}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline"
              >
                {cms.metin11}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

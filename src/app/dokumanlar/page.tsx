import { pageMetadata } from "@/lib/metadata";
import { getSection } from "@/cms/server";
import type { Metadata } from "next";
import Link from "next/link";
import PageBanner from "@/components/PageBanner";
import DocumentLink from "@/components/DocumentLink";
import DocumentLibrary from "@/components/DocumentLibrary";
import { getBrochures, getVideos } from "@/data/documents";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(
    "/dokumanlar",
    (await getSection("app-dokumanlar")).metadata,
  );
}

const dateFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const rowClass =
  "flex items-center justify-between gap-6 px-6 py-5 transition-colors hover:bg-brand-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500";

export default async function DocumentsPage() {
  const cms = await getSection("app-dokumanlar");

  const sorted = [...(await getBrochures())].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return (
    <>
      <PageBanner title={cms.metin01} intro={cms.metin02} />

      <section className="bg-mist py-16 md:py-24">
        <div className="container-site max-w-4xl space-y-16">
          <div>
            <h2 className="text-3xl font-semibold text-ink md:text-4xl">
              {cms.metin03}
            </h2>
            <DocumentLibrary
              labels={cms}
              items={sorted.map((doc) => ({
                title: doc.title,
                href: doc.href,
                node: (
                  <DocumentLink
                    href={doc.href}
                    className={rowClass}
                    action={cms.metin04}
                    actionClassName="shrink-0 font-display text-sm font-semibold uppercase tracking-wider text-brand-600"
                  >
                    <span>
                      <span className="block text-[15px] font-semibold text-ink">
                        {doc.title}
                      </span>
                      <time
                        dateTime={doc.date}
                        className="mt-1 block text-sm text-muted"
                      >
                        {dateFormat.format(new Date(doc.date))}
                      </time>
                    </span>
                  </DocumentLink>
                ),
              }))}
            />
          </div>

          <div>
            <h2 className="text-3xl font-semibold text-ink md:text-4xl">
              {cms.metin05}
            </h2>
            <ul className="mt-6 divide-y divide-mist-dark border-y border-mist-dark bg-paper">
              {(await getVideos()).map((v) => (
                <li key={v.href}>
                  <a
                    href={v.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={rowClass}
                  >
                    <span className="text-[15px] font-semibold text-ink">
                      {v.title}
                    </span>
                    <span className="shrink-0 font-display text-lg font-semibold uppercase tracking-wider text-brand-600">
                      {cms.metin06}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-mist-dark bg-paper p-8">
            <h2 className="text-2xl font-semibold text-ink">{cms.metin07}</h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
              {cms.metin08}{" "}
              <Link
                href={cms.metin09}
                className="font-semibold text-brand-600 underline underline-offset-4"
              >
                {cms.metin10}
              </Link>{" "}
              {cms.metin11}
            </p>
            <Link href={cms.metin12} className="btn-primary mt-6">
              {cms.metin13}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

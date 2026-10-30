import { pageMetadata } from "@/lib/metadata";
import { getSection } from "@/cms/server";
import type { Metadata } from "next";
import PageBanner from "@/components/PageBanner";
import DocumentLink from "@/components/DocumentLink";
import { getLegislation } from "@/data/documents";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("/mevzuat", (await getSection("app-mevzuat")).metadata);
}

export default async function LegislationPage() {
  const cms = await getSection("app-mevzuat");

  return (
    <>
      <PageBanner title={cms.metin01} intro={cms.metin02} />

      <section className="bg-mist py-16 md:py-24">
        <ul className="container-site max-w-4xl divide-y divide-mist-dark border-y border-mist-dark bg-paper">
          {(await getLegislation()).map((doc) => (
            <li key={doc.href}>
              <DocumentLink
                href={doc.href}
                className="flex items-center justify-between gap-6 px-6 py-5 transition-colors hover:bg-brand-100"
                action={cms.metin03}
                actionClassName="shrink-0 font-display text-sm font-semibold uppercase tracking-wider text-brand-600"
              >
                <span className="text-[15px] font-semibold text-ink">
                  {doc.title}
                </span>
              </DocumentLink>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

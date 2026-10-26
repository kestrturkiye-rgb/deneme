import { pageMetadata } from "@/lib/metadata";
import { getSection } from "@/cms/server";
import type { Metadata } from "next";
import PageBanner from "@/components/PageBanner";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("/tarihce", (await getSection("app-tarihce")).metadata);
}

type Milestone = { year: string; items: string[] };

export default async function HistoryPage() {
  const cms = await getSection("app-tarihce");
  const milestones: Milestone[] = cms.milestones;

  return (
    <>
      <PageBanner title={cms.metin01} intro={cms.metin02} />

      <section className="bg-paper py-16 md:py-24">
        <ol className="container-site max-w-4xl border-l-2 border-brand-500 pl-8 md:pl-10">
          {milestones.map((m) => (
            <li
              key={m.year}
              className="relative grid gap-2 pb-12 last:pb-0 md:grid-cols-[110px_1fr] md:gap-6"
            >
              <span
                aria-hidden="true"
                className="absolute -left-[41px] top-3 h-3 w-3 bg-brand-500 md:-left-[49px]"
              />
              <h2 className="font-display text-4xl font-semibold text-brand-500">
                {m.year}
              </h2>
              <ul className="space-y-3">
                {m.items.map((item) => (
                  <li
                    key={item}
                    className="text-[15px] leading-relaxed text-ink"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

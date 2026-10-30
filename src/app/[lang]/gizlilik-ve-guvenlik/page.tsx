import { pageMetadata } from "@/lib/metadata";
import { getSection } from "@/cms/server";
import type { Metadata } from "next";
import PageBanner from "@/components/PageBanner";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(
    "/gizlilik-ve-guvenlik",
    (await getSection("app-gizlilik-ve-guvenlik")).metadata,
  );
}

type Section = { title: string; text?: string[]; items?: string[] };

export default async function PrivacyPage() {
  const cms = await getSection("app-gizlilik-ve-guvenlik");
  const sections: Section[] = cms.sections;

  return (
    <>
      <PageBanner title={cms.metin01} intro={cms.metin02} />

      <section className="bg-paper py-16 md:py-24">
        <div className="container-site max-w-3xl space-y-12">
          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="text-2xl font-semibold text-ink md:text-3xl">
                {s.title}
              </h2>
              {s.text?.map((t) => (
                <p
                  key={t}
                  className="mt-3 text-base leading-relaxed text-muted"
                >
                  {t}
                </p>
              ))}
              {s.items && (
                <ul className="mt-4 space-y-2">
                  {s.items.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 text-base leading-snug text-muted"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-2.5 h-1.5 w-1.5 shrink-0 bg-brand-500"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

import { pageMetadata } from "@/lib/metadata";
import { getSection } from "@/cms/server";
import type { Metadata } from "next";
import MessageForm from "@/components/MessageForm";
import PageBanner from "@/components/PageBanner";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("/iletisim", (await getSection("app-iletisim")).metadata);
}

type Location = {
  title: string;
  subtitle?: string;
  address: string;
  lines: { label: string; text: string; href?: string }[];
};

export default async function ContactPage() {
  const cms = await getSection("app-iletisim");
  const locations: Location[] = cms.locations;

  return (
    <>
      <PageBanner title={cms.metin01} intro={cms.metin02} />

      <section className="bg-mist py-16 md:py-24">
        <div className="container-site grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-10">
            {locations.map((loc) => (
              <div key={loc.title}>
                <h2 className="text-3xl font-semibold text-ink">{loc.title}</h2>
                {loc.subtitle ? (
                  <p className="mt-1 text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
                    {loc.subtitle}
                  </p>
                ) : null}
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  {loc.address}
                </p>
                {loc.lines.length > 0 && (
                  <dl className="mt-3 space-y-1 text-[15px]">
                    {loc.lines.map((l) => (
                      <div key={l.label} className="flex gap-2">
                        <dt className="text-muted">
                          {l.label}
                          {cms.metin03}
                        </dt>
                        <dd>
                          {l.href ? (
                            <a
                              href={l.href}
                              className="font-semibold text-brand-600 underline underline-offset-4"
                            >
                              {l.text}
                            </a>
                          ) : (
                            <span className="text-ink">{l.text}</span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            ))}
          </div>

          <div className="self-start border border-mist-dark bg-paper p-6 md:p-8">
            <h2 className="mb-6 text-3xl font-semibold text-ink">
              {cms.metin04}
            </h2>
            <MessageForm kind="contact" />
          </div>
        </div>
      </section>
    </>
  );
}

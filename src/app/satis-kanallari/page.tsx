import { pageMetadata } from "@/lib/metadata";
import { getSection } from "@/cms/server";
import type { Metadata } from "next";
import Link from "next/link";
import PageBanner from "@/components/PageBanner";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(
    "/satis-kanallari",
    (await getSection("app-satis-kanallari")).metadata,
  );
}

type Dealer = {
  name: string;
  address: string;
  phone: string;
  phoneHref: string;
  site: string;
};

export default async function SalesChannelsPage() {
  const cms = await getSection("app-satis-kanallari");
  const dealers: Dealer[] = cms.dealers;
  const channels = cms.channels;

  return (
    <>
      <PageBanner title={cms.metin01} intro={cms.metin02} />

      <section className="bg-mist py-16 md:py-24">
        <div className="container-site">
          <h2 className="text-3xl font-semibold text-ink md:text-4xl">
            {cms.metin03}
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {dealers.map((d) => (
              <div
                key={d.name}
                className="flex flex-col border border-mist-dark bg-paper p-8"
              >
                <h3 className="text-2xl font-semibold text-ink">{d.name}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  {d.address}
                </p>
                <p className="mt-3 text-[15px]">
                  <a
                    href={d.phoneHref}
                    className="font-semibold text-brand-600 underline underline-offset-4"
                  >
                    {d.phone}
                  </a>
                </p>
                <a
                  href={d.site}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline mt-6 self-start"
                >
                  {cms.metin04}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paper py-16 md:py-24">
        <div className="container-site">
          <h2 className="text-3xl font-semibold text-ink md:text-4xl">
            {cms.metin05}
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {channels.map((c) => (
              <div
                key={c.title}
                className="flex flex-col border border-mist-dark bg-mist p-8"
              >
                <h3 className="text-2xl font-semibold text-ink">{c.title}</h3>
                <p className="mt-3 flex-1 text-[15px] leading-relaxed text-muted">
                  {c.text}
                </p>
                <Link href={c.href} className="btn-primary mt-6 self-start">
                  {c.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-[15px] text-muted">
            {cms.metin06}{" "}
            <a
              href={cms.metin07}
              className="font-semibold text-brand-600 underline underline-offset-4"
            >
              {cms.metin08}
            </a>
          </p>
        </div>
      </section>
    </>
  );
}

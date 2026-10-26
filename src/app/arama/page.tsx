import { pageMetadata } from "@/lib/metadata";
import { getSection } from "@/cms/server";
import type { Metadata } from "next";
import Link from "next/link";
import PageBanner from "@/components/PageBanner";
import { productHref, getProducts } from "@/data/catalog";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("/arama", (await getSection("app-arama")).metadata);
}

type Props = {
  searchParams: Promise<{ q?: string | string[] }>;
};

const tr = (s: string) => s.toLocaleLowerCase("tr");

export default async function SearchPage({ searchParams }: Props) {
  const cms = await getSection("app-arama");

  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim().slice(0, 100) ?? "";
  const needle = tr(query);

  const results = needle
    ? (await getProducts()).filter((p) =>
        tr(`${p.name} ${p.groupTitle} ${p.divisionTitle}`).includes(needle),
      )
    : [];

  return (
    <>
      <PageBanner
        title={cms.metin01}
        intro={query ? `“${query}” için sonuçlar` : undefined}
      />

      <section className="bg-mist py-16 md:py-24">
        <div className="container-site max-w-4xl">
          <form action="/arama" role="search" className="flex gap-3">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder={cms.metin02}
              aria-label={cms.metin03}
              className="min-w-0 flex-1 border border-mist-dark bg-paper px-4 py-3 text-[15px] outline-none focus:border-brand-500"
            />
            <button type="submit" className="btn-primary">
              {cms.metin04}
            </button>
          </form>

          <div className="mt-10">
            {!query ? (
              <p className="text-muted">{cms.metin05}</p>
            ) : results.length === 0 ? (
              <p className="text-muted">
                {cms.metin06}{" "}
                <Link
                  href={cms.metin07}
                  className="font-semibold text-brand-600 underline underline-offset-4"
                >
                  {cms.metin08}
                </Link>
                {cms.metin09}
              </p>
            ) : (
              <ul className="divide-y divide-mist-dark border-y border-mist-dark bg-paper">
                {results.map((p) => (
                  <li key={productHref(p)}>
                    <Link
                      href={productHref(p)}
                      className="block px-5 py-4 transition-colors hover:bg-brand-100"
                    >
                      <span className="block text-[15px] font-semibold text-ink">
                        {p.name}
                      </span>
                      <span className="mt-1 block text-sm text-muted">
                        {p.divisionTitle} {cms.metin10}
                        {p.groupTitle}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

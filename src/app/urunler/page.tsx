import Link from "next/link";
import { getSection } from "@/cms/server";
import { getDivisions } from "@/data/divisions";
import { pageMetadata } from "@/lib/metadata";
import PageBanner from "@/components/PageBanner";
import SiteImage from "@/components/SiteImage";
import ArrowUpRight from "@/components/ArrowUpRight";

export async function generateMetadata() {
  return pageMetadata("/urunler", (await getSection("app-urunler")).metadata);
}
export default async function ProductsPage() {
  const cms = await getSection("app-urunler");
  const divisions = await getDivisions();
  const visuals = (await getSection("components-Divisions")).divisions;
  return (
    <>
      <PageBanner title={cms.title} intro={cms.intro} eyebrow={cms.eyebrow} />
      <section className="bg-mist py-16 md:py-24">
        <div className="container-site division-overview">
          {divisions.map((division, index) => {
            const visual = visuals.find((v) => v.href === "/" + division.slug);
            return (
              <Link
                key={division.slug}
                href={"/" + division.slug}
                className="division-overview-card"
              >
                {visual?.image && (
                  <SiteImage
                    src={visual.image}
                    alt={visual.imageAlt || division.title}
                    fill
                    sizes="(max-width: 750px) 100vw, 33vw"
                  />
                )}
                <div>
                  <span className="editorial-number">0{index + 1}</span>
                  <h2>{division.title}</h2>
                  <p>{division.intro}</p>
                  <span>{cms.action} <ArrowUpRight /></span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}

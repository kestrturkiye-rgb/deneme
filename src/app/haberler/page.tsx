import ArrowUpRight from "@/components/ArrowUpRight";
import { getSection } from "@/cms/server";
import Link from "next/link";
import PageBanner from "@/components/PageBanner";
import NewsVisual from "@/components/NewsVisual";
import { getNews, newsHref } from "@/data/news";
import { pageMetadata } from "@/lib/metadata";
export async function generateMetadata() {
  return pageMetadata("/haberler", (await getSection("app-haberler")).metadata);
}
export default async function NewsPage() {
  const cms = await getSection("app-haberler");
  const news = [...(await getNews())].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  return (
    <>
      <PageBanner
        title={cms.metin01}
        intro={cms.metin02}
        eyebrow={cms.eyebrow}
      />
      <section className="news-index">
        <div className="container-site">
          {news.length === 0 ? (
            <p>{cms.metin03}</p>
          ) : (
            <ul>
              {news.map((item, index) => (
                <li
                  key={newsHref(item)}
                  className={index === 0 ? "news-index-featured" : ""}
                >
                  <Link href={newsHref(item)} className="news-index-card">
                    <NewsVisual item={item} label={cms.visualLabel} />
                    <div>
                      <p className="editorial-eyebrow">
                        {index === 0 ? cms.featuredLabel + " · " : ""}
                        <time dateTime={item.date}>
                          {new Intl.DateTimeFormat("tr-TR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            timeZone: "Europe/Istanbul",
                          }).format(new Date(item.date + "T12:00:00Z"))}
                        </time>
                      </p>
                      <h2>{item.title}</h2>
                      <p>{item.summary}</p>
                      <span className="news-card-action">
                        {cms.articleLabel}{" "}
                        <span aria-hidden="true">
                          <ArrowUpRight />
                        </span>
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

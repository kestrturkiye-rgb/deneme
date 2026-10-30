import {getLocale} from "@/i18n/server";
import {intlLocales} from "@/i18n/locales";
import ArrowUpRight from "./ArrowUpRight";
import { getSection } from "@/cms/server";
import { getNews, newsHref } from "@/data/news";
import NewsVisual from "./NewsVisual";
import Link from "@/components/LocalizedLink";
export default async function NewsPreview() {
  const locale=await getLocale();
  const c = await getSection("components-NewsPreview");
  const news = [...(await getNews())]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  return (
    <section className="kg-news" data-reveal>
      <div className="container-site">
        <div className="kg-section-head">
          <div>
            <p className="kg-eyebrow kg-eyebrow-dark">
              <span />
              {c.eyebrow}
            </p>
            <h2>{c.title}</h2>
          </div>
          <Link href={c.href} className="kg-dark-link">
            {c.linkLabel}
            <span aria-hidden="true">
              <ArrowUpRight />
            </span>
          </Link>
        </div>
        <div className="kg-news-grid">
          {news.map((item, i) => (
            <article
              key={item.date + item.title}
              className={i === 0 ? "is-featured" : ""}
            >
              <Link
                href={newsHref(item)}
                className="news-preview-image"
                aria-label={item.title}
              >
                <NewsVisual item={item} label="KIVANÇ GROUP" />
              </Link>
              <div className="kg-news-meta">
                <time dateTime={item.date}>
                  {new Intl.DateTimeFormat(intlLocales[locale], {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    timeZone: "Europe/Istanbul",
                  }).format(new Date(item.date + "T12:00:00Z"))}
                </time>
                <span>0{i + 1}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <Link href={newsHref(item)} className="kg-news-read">
                {c.readLabel}
                <span aria-hidden="true">
                  <ArrowUpRight />
                </span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

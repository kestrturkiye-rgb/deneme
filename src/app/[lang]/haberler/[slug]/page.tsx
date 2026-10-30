import {getLocale} from "@/i18n/server";
import {intlLocales} from "@/i18n/locales";
import ArrowUpRight from "@/components/ArrowUpRight";
import Link from "@/components/LocalizedLink";
import { notFound } from "next/navigation";
import { getNews, newsHref } from "@/data/news";
import { getSection } from "@/cms/server";
import NewsVisual from "@/components/NewsVisual";
import { pageMetadata } from "@/lib/metadata";
type Props = { params: Promise<{ slug: string }> };
async function find(slug: string) {
  return (await getNews()).find((n) => newsHref(n) === "/haberler/" + slug);
}
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const item = await find(slug);
  return item
    ? pageMetadata(
        newsHref(item),
        { title: item.title, description: item.summary },
        item.image,
      )
    : {};
}
export default async function ArticlePage({ params }: Props) {
  const locale=await getLocale();
  const item = await find((await params).slug);
  if (!item) notFound();
  const cms = await getSection("app-haberler");
  return (
    <article className="news-article container-site">
      <Link href="/haberler" className="news-back">
        ← {cms.backLabel}
      </Link>
      <header>
        <p className="editorial-eyebrow">
          <time dateTime={item.date}>
            {new Intl.DateTimeFormat(intlLocales[locale], {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Europe/Istanbul",
            }).format(new Date(item.date + "T12:00:00Z"))}
          </time>
        </p>
        <h1>{item.title}</h1>
        <p>{item.summary}</p>
      </header>
      <figure>
        <NewsVisual item={item} label={cms.visualLabel} />
        {item.imageCaption && <figcaption>{item.imageCaption}</figcaption>}
      </figure>
      <div className="news-article-body">
        {item.body?.map((p, index) => (
          <p key={index}>{p}</p>
        ))}
        {item.href && (
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
          >
            {cms.sourceLabel} <ArrowUpRight />
          </a>
        )}
      </div>
    </article>
  );
}

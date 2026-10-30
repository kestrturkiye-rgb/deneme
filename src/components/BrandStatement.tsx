import Link from "@/components/LocalizedLink";
import { getSection } from "@/cms/server";
import ArrowUpRight from "./ArrowUpRight";
import BrandLines from "./BrandLines";
export default async function BrandStatement() {
  const c = await getSection("components-BrandStatement");
  return (
    <section className="kg-statement" data-reveal>
      <BrandLines className="kg-statement-lines" />
      <div className="container-site">
        <div className="kg-statement-top">
          <span>{c.eyebrow}</span>
          <span aria-hidden="true">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="m14 0 3.7 10.3L28 14l-10.3 3.7L14 28l-3.7-10.3L0 14l10.3-3.7Z" />
            </svg>
          </span>
        </div>
        <h2>{c.title}</h2>
        <div className="kg-statement-bottom">
          <p>{c.description}</p>
          <Link href={c.href}>
            {c.linkLabel}
            <ArrowUpRight />
          </Link>
        </div>
      </div>
      <div className="kg-statement-marquee" aria-hidden="true">
        <span>
          {c.marquee} · {c.marquee} ·{" "}
        </span>
        <span>
          {c.marquee} · {c.marquee} ·{" "}
        </span>
      </div>
    </section>
  );
}

import ArrowUpRight from "./ArrowUpRight";
import { getSection } from "@/cms/server";
import Link from "next/link";
export default async function Quality() {
  const c = await getSection("components-Quality");
  return (
    <section className="kg-quality" data-reveal>
      <div className="container-site">
        <div className="kg-section-head">
          <div>
            <p className="kg-eyebrow kg-eyebrow-dark">
              <span />
              {c.eyebrow}
            </p>
            <h2>{c.metin01}</h2>
          </div>
          <Link href={c.href} className="kg-dark-link">
            {c.linkLabel}
            <span aria-hidden="true">
              <ArrowUpRight />
            </span>
          </Link>
        </div>
        <div className="kg-quality-grid">
          {c.values.map((value, i) => (
            <article key={value.title}>
              <span className="kg-quality-number">0{i + 1}</span>
              <h3>{value.title}</h3>
              <p>{value.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

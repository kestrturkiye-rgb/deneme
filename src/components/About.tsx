import { getSection } from "@/cms/server";
import Link from "next/link";
import SiteImage from "./SiteImage";
export default async function About() {
  const c = await getSection("components-About");
  return (
    <section
      className={"kg-about" + (!c.image ? " kg-about-text" : "")}
      data-reveal
    >
      {c.image && (
        <div className="kg-about-image">
          <SiteImage
            src={c.image}
            alt={c.imageAlt}
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
          />
          <span className="kg-about-year">{c.facts[0]?.value}</span>
        </div>
      )}
      <div className="kg-about-content">
        <p className="kg-eyebrow">
          <span />
          {c.metin01}
        </p>
        <h2>{c.metin02}</h2>
        <p>{c.metin03}</p>
        <p>{c.metin04}</p>
        <p>{c.metin05}</p>
        <Link href={c.metin06} className="btn-primary">
          {c.metin07}
          <span aria-hidden="true">{c.metin08}</span>
        </Link>
        <dl className="kg-facts">
          {c.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.value}</dt>
              <dd>{fact.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

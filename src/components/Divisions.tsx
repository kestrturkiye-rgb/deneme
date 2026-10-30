"use client";
import type {Division} from "@/data/divisions";
import { useState } from "react";
import Link from "@/components/LocalizedLink";
import { useSection } from "@/cms/context";
import ArrowUpRight from "./ArrowUpRight";
import SiteImage from "./SiteImage";
import { slugify } from "@/cms/schema";
export default function Divisions() {
  const c = useSection("components-Divisions");
  const catalog = useSection("data-divisions") as {divisions:Division[]};
  const [selected, setSelected] = useState(0);
  const current = c.divisions[selected] || c.divisions[0];
  const division = catalog.divisions.find(
    (item) => "/" + item.slug === current?.href,
  );
  const destination = (label: string) => {
    const normalize = (value: string) => value.normalize("NFKC").trim().toLocaleLowerCase();
    const key = normalize(label);
    const group = division?.groups.find((item) => normalize(item.title) === key);
    if (group) return current.href + "#" + (group.anchor || slugify(group.title));
    const product = division?.groups
      .flatMap((item) => item.items)
      .find((item) => normalize(item.name) === key);
    return product ? current.href + "/" + product.slug : current.href;
  };
  return (
    <section
      className="kg-divisions kg-sector-section"
      id="faaliyet-alanlari"
      data-reveal
    >
      <div className="container-site">
        <div className="kg-section-head">
          <div>
            <p className="kg-eyebrow kg-eyebrow-dark">
              <span />
              {c.eyebrow}
            </p>
            <h2>{c.metin01}</h2>
          </div>
          <p>{c.intro}</p>
        </div>
        {current && (
          <>
            <div
              className="kg-sector-tabs"
              role="tablist"
              aria-label={c.selectorLabel}
            >
              {c.divisions.map((division, index) => (
                <button
                  type="button"
                  role="tab"
                  key={division.href}
                  id={"sector-tab-" + index}
                  aria-controls="sector-panel"
                  aria-selected={selected === index}
                  onClick={() => setSelected(index)}
                  tabIndex={selected === index ? 0 : -1}
                  onKeyDown={(event) => {
                    if (
                      event.key === "ArrowLeft" ||
                      event.key === "ArrowRight"
                    ) {
                      event.preventDefault();
                      const next =
                        (index +
                          (event.key === "ArrowRight" ? 1 : -1) +
                          c.divisions.length) %
                        c.divisions.length;
                      setSelected(next);
                      document.getElementById("sector-tab-" + next)?.focus();
                    }
                  }}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{division.title}</strong>
                  <ArrowUpRight />
                </button>
              ))}
            </div>
            <div
              className="kg-sector-panel"
              id="sector-panel"
              role="tabpanel"
              aria-labelledby={"sector-tab-" + selected}
            >
              {current.image && (
                <div className="kg-sector-art">
                  <SiteImage
                    key={current.image}
                    className="kg-sector-photo"
                    src={current.image}
                    alt={current.imageAlt || current.title}
                    loading="lazy"
                    fill
                    sizes="100vw"
                  />
                </div>
              )}
              <div className="kg-sector-overlay" />
              <div className="kg-sector-copy">
                <span className="kg-sector-number" aria-hidden="true">
                  {String(selected + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="kg-eyebrow">
                    <span />
                    {c.detailLabel}
                  </p>
                  <h3>{current.title}</h3>
                  <p>{current.text}</p>
                  <Link href={current.href} className="btn-primary">
                    {c.metin02}
                    <ArrowUpRight />
                  </Link>
                </div>
              </div>
              <ul className="kg-sector-solutions">
                {current.items.map((item) => (
                  <li key={item}>
                    <Link href={destination(item)}>
                      <span aria-hidden="true">+</span>
                      <span>{item}</span>
                      <ArrowUpRight />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

"use client";
import {useLocale} from "@/i18n/context";
import { useMemo, useState } from "react";
import { useSection } from "@/cms/context";
import type { Product } from "@/data/catalog";
import ProductCard from "./ProductCard";
type Item = Product & { href: string; image?: string; hasSpin: boolean };
export default function ProductDiscoveryClient({
  items,
  divisions,
}: {
  items: Item[];
  divisions: { slug: string; title: string }[];
}) {
  const locale=useLocale();
  const c = useSection("components-ProductDiscovery");
  const [filter, setFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [visible, setVisible] = useState(c.limit);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase(locale);
    const result = items.filter(
      (item) =>
        (filter === "all" || item.divisionSlug === filter) &&
        (!q ||
          (
            item.name +
            " " +
            item.groupTitle +
            " " +
            item.divisionTitle +
            " " +
            item.slug
          )
            .toLocaleLowerCase(locale)
            .includes(q)),
    );
    if (filter === "all" && !q)
      result.sort((a, b) => {
        const aRank = c.featuredSlugs.indexOf(a.slug),
          bRank = c.featuredSlugs.indexOf(b.slug);
        return (aRank < 0 ? 999 : aRank) - (bRank < 0 ? 999 : bRank);
      });
    return result;
  }, [items, filter, query, c.featuredSlugs, locale]);
  function clear() {
    setFilter("all");
    setQuery("");
    setVisible(c.limit);
  }
  return (
    <section className="kg-discovery" id="urun-kesfi" data-reveal>
      <div className="container-site">
        <div className="kg-section-head">
          <div>
            <p className="kg-eyebrow kg-eyebrow-dark">
              <span />
              {c.eyebrow}
            </p>
            <h2>{c.title}</h2>
          </div>
          <p>{c.intro}</p>
        </div>
        <div className="kg-discovery-toolbar">
          <div
            className="kg-discovery-filters"
            role="group"
            aria-label={c.filterLabel}
          >
            {[{ slug: "all", title: c.allLabel }, ...divisions].map(
              (division) => (
                <button
                  key={division.slug}
                  type="button"
                  aria-pressed={filter === division.slug}
                  onClick={() => {
                    setFilter(division.slug);
                    setVisible(c.limit);
                  }}
                >
                  {division.title}
                </button>
              ),
            )}
          </div>
          <label className="kg-discovery-search">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              aria-hidden="true"
            >
              <circle cx="10" cy="10" r="6.5" />
              <path d="m15 15 6 6" />
            </svg>
            <span className="sr-only">{c.searchLabel}</span>
            <input
              type="search"
              value={query}
              placeholder={c.searchPlaceholder}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisible(c.limit);
              }}
            />
          </label>
        </div>
        <output className="kg-discovery-count" aria-live="polite">
          {filtered.length} {c.resultsLabel}
        </output>
        {filtered.length > 0 ? (
          <ul className="kg-product-grid">
            {filtered.slice(0, visible).map((item, index) => (
              <li key={item.divisionSlug + "/" + item.slug}>
                <ProductCard
                  href={item.href}
                  name={item.name}
                  category={item.divisionTitle + " / " + item.groupTitle}
                  image={item.image}
                  index={index}
                  hasSpin={item.hasSpin}
                  label={item.kind === "info" ? c.infoLabel : c.productLabel}
                  action={item.kind === "info" ? c.infoViewLabel : c.viewLabel}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="kg-discovery-empty">
            <h3>{c.emptyTitle}</h3>
            <p>{c.emptyDescription}</p>
            <button type="button" onClick={clear}>
              {c.clearLabel}
            </button>
          </div>
        )}
        {filtered.length > visible && (
          <div className="kg-discovery-more">
            <button
              type="button"
              className="btn-outline"
              onClick={() => setVisible((count) => count + c.limit)}
            >
              {c.moreLabel}
              <span aria-hidden="true">+</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

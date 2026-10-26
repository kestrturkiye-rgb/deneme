"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSection } from "@/cms/context";
import type { Division } from "@/data/divisions";
import { slugify } from "@/cms/schema";
type Item = { label: string; href: string };
export default function MegaNavigation({
  items,
  divisions,
}: {
  items: Item[];
  divisions: Division[];
}) {
  const c = useSection("components-Header");
  const [active, setActive] = useState<string | null>(null);
  const nav = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const pathname = usePathname();
  function cancelClose() {
    if (timer.current) clearTimeout(timer.current);
  }
  function closeSoon() {
    cancelClose();
    timer.current = setTimeout(() => setActive(null), 160);
  }
  useEffect(() => {
    setActive(null);
  }, [pathname]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActive(null);
        buttons.current[active]?.focus();
      }
    };
    const outside = (e: PointerEvent) => {
      if (!nav.current?.contains(e.target as Node)) setActive(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", outside);
    };
  }, [active]);
  const division = divisions.find((d) => "/" + d.slug === active);
  let cut = 1;
  if (division) {
    const weights = division.groups.map(
      (g) => 2 + Math.ceil(g.items.length / 2),
    );
    const total = weights.reduce((a, b) => a + b, 0);
    let best = Infinity,
      sum = 0;
    for (let i = 0; i < weights.length - 1; i++) {
      sum += weights[i];
      if (Math.abs(total / 2 - sum) < best) {
        cut = i + 1;
        best = Math.abs(total / 2 - sum);
      }
    }
  }
  return (
    <nav
      ref={nav}
      className="kg-desktop-nav"
      aria-label={c.navigationLabel}
      onPointerEnter={cancelClose}
      onPointerLeave={closeSoon}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setActive(null);
      }}
    >
      {items.map((item) =>
        divisions.some((d) => "/" + d.slug === item.href) ? (
          <button
            key={item.href}
            type="button"
            ref={(element) => {
              buttons.current[item.href] = element;
            }}
            className={active === item.href ? "is-active" : ""}
            aria-expanded={active === item.href}
            aria-controls="kg-products-panel"
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") {
                cancelClose();
                setActive(item.href);
              }
            }}
            onClick={() => {
              cancelClose();
              setActive((value) => (value === item.href ? null : item.href));
            }}
          >
            {item.label}
          </button>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            onPointerEnter={() => setActive(null)}
          >
            {item.label}
          </Link>
        ),
      )}
      {division && (
        <div
          className="kg-mega-panel"
          id="kg-products-panel"
          onPointerEnter={cancelClose}
          onPointerLeave={closeSoon}
        >
          <div className="kg-mega-inner">
            <div className="kg-mega-overview">
              <Link href={"/" + division.slug} onClick={() => setActive(null)}>
                {division.title}
                <span aria-hidden="true">›</span>
              </Link>
              <button
                type="button"
                aria-label={c.closeProductsLabel}
                onClick={() => {
                  setActive(null);
                  buttons.current[active!]?.focus();
                }}
              >
                ×
              </button>
            </div>
            {[division.groups.slice(0, cut), division.groups.slice(cut)].map(
              (groups, i) => (
                <div className="kg-mega-column" key={i}>
                  {groups.map((group) => (
                    <section key={group.title}>
                      <h2>
                        <Link
                          href={
                            "/" + division.slug + "#" + slugify(group.title)
                          }
                          onClick={() => setActive(null)}
                        >
                          {group.title}
                          <span aria-hidden="true">›</span>
                        </Link>
                      </h2>
                      <ul>
                        {group.items.map((item) => (
                          <li key={item.slug}>
                            <Link
                              href={"/" + division.slug + "/" + item.slug}
                              onClick={() => setActive(null)}
                            >
                              {item.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

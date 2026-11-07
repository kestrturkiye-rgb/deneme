"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/components/LocalizedLink";
import SiteImage from "./SiteImage";
import styles from "./NicheShowcase.module.css";

export type NicheItem = {
  href: string;
  name: string;
  line?: string;
  /** First frame is the resting view; the rest are 360° frames in rotation order. */
  frames: string[];
  alt: string;
};

type Props = {
  items: NicheItem[];
  eyebrow: string;
  hint: string;
  action: string;
};

const SIZES = "(max-width: 767px) 60vw, 220px";

/** Splits "Maximus 2.0 (832551)" into name and model code for the label. */
function splitCode(name: string) {
  const m = /^(.*?)\s*\((\d+)\)\s*$/.exec(name);
  return m ? { title: m[1], code: m[2] } : { title: name, code: "" };
}

function Niche({
  item,
  index,
  active,
  onActivate,
  onMove,
  action,
}: {
  item: NicheItem;
  index: number;
  active: boolean;
  onActivate: (i: number) => void;
  onMove: (i: number, dir: number) => void;
  action: string;
}) {
  const [frame, setFrame] = useState(0);
  const [loaded, setLoaded] = useState(false); // extra frames load on first activation
  const reduce = useRef(false);
  useEffect(() => {
    reduce.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);
  useEffect(() => {
    if (active) setLoaded(true);
    else setFrame(0);
  }, [active]);
  const { title, code } = splitCode(item.name);
  const frames = loaded ? item.frames : item.frames.slice(0, 1);
  // Never point past the frames that are mounted, or the niche would go blank.
  const shown = Math.min(frame, frames.length - 1);

  return (
    <li className={styles.slot}>
      <Link
        href={item.href}
        className={styles.niche + (active ? " " + styles.on : "")}
        aria-label={`${item.name} – ${action}`}
        onMouseEnter={() => onActivate(index)}
        onFocus={() => onActivate(index)}
        onMouseMove={(e) => {
          if (!active) onActivate(index);
          if (reduce.current || item.frames.length < 2) return;
          const r = e.currentTarget.getBoundingClientRect();
          const k = Math.min(0.999, Math.max(0, (e.clientX - r.left) / r.width));
          setFrame(Math.floor(k * item.frames.length));
        }}
        onMouseLeave={() => setFrame(0)}
        onKeyDown={(e) => {
          const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          if (d) {
            e.preventDefault();
            onMove(index, d);
          }
        }}
        data-niche={index}
      >
        <span className={styles.cell} aria-hidden="true">
          <span className={styles.lamp} />
          <span className={styles.cone} />
          <span className={styles.pool} />
          <span className={styles.suit}>
            {frames.map((src, i) => (
              <SiteImage
                key={src}
                src={src}
                alt=""
                fill
                sizes={SIZES}
                className={i === shown ? styles.cur : undefined}
                loading={index < 4 && i === 0 ? "eager" : "lazy"}
              />
            ))}
          </span>
          {item.frames.length > 2 && <span className={styles.badge}>360°</span>}
        </span>
        <span className={styles.edge} aria-hidden="true" />
        <span className={styles.label} aria-hidden="true">
          <b>{title}</b>
          <span>{[code, item.line].filter(Boolean).join(" · ")}</span>
        </span>
      </Link>
    </li>
  );
}

/** Stone-wall gallery: one lit niche per model, hover/drag scrubs its 360° frames. */
export default function NicheShowcase({ items, eyebrow, hint, action }: Props) {
  const [active, setActive] = useState(-1);
  const row = useRef<HTMLUListElement>(null);
  const move = useCallback((i: number, d: number) => {
    const next = (i + d + items.length) % items.length;
    row.current
      ?.querySelector<HTMLElement>(`[data-niche="${next}"]`)
      ?.focus();
  }, [items.length]);

  // Touch screens: the niche in the middle of the strip is the active one.
  useEffect(() => {
    const el = row.current;
    if (!el || !matchMedia("(hover: none)").matches) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting)
            setActive(Number((en.target as HTMLElement).dataset.niche));
        }),
      { root: el, threshold: 0.75 },
    );
    el.querySelectorAll("[data-niche]").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  if (items.length < 2) return null;
  return (
    <section className={styles.stage} aria-label={eyebrow}>
      <div className={styles.wall} aria-hidden="true" />
      <div className={styles.floor} aria-hidden="true" />
      <ul
        ref={row}
        className={styles.row + (active >= 0 ? " " + styles.hasActive : "")}
        onMouseLeave={() => {
          if (!row.current?.contains(document.activeElement)) setActive(-1);
        }}
      >
        {items.map((item, i) => (
          <Niche
            key={item.href}
            item={item}
            index={i}
            active={i === active}
            onActivate={setActive}
            onMove={move}
            action={action}
          />
        ))}
      </ul>
      <div className={styles.title}>
        <p className={styles.eyebrow}>{eyebrow}</p>
      </div>
      <p className={styles.hint} aria-hidden="true">
        ← → {hint}
      </p>
      <div className={styles.grain} aria-hidden="true" />
    </section>
  );
}

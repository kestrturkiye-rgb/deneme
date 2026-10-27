"use client";
import { useEffect, useRef, useState } from "react";
import { useSection } from "@/cms/context";
import SiteImage from "./SiteImage";
import ArrowUpRight from "./ArrowUpRight";

export default function Partners() {
  const c = useSection("components-Partners");
  const design = useSection("design");
  const section = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const drag = useRef({ active: false, x: 0, scroll: 0, moved: false });
  const [reduced, setReduced] = useState(true);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [choice, setChoice] = useState<boolean | null>(null);
  const count = c.partners.length;
  const wanted =
    count > 1 && (choice ?? (c.autoScroll && design.motionEffects && !reduced));
  const moving =
    wanted && inView && visible && !hovered && !focused && !dragging;

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const policy = () => setReduced(motion.matches);
    const visibility = () => setVisible(!document.hidden);
    policy();
    visibility();
    motion.addEventListener("change", policy);
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry.isIntersecting),
    );
    if (section.current) observer.observe(section.current);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", policy);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  function loopWidth() {
    const items = list.current?.children;
    if (!items?.[count] || !items[0]) return 0;
    return (
      items[count].getBoundingClientRect().left -
      items[0].getBoundingClientRect().left
    );
  }

  useEffect(() => {
    if (!moving) return;
    let frame = 0,
      previous = 0;
    let position = viewport.current?.scrollLeft || 0;
    const tick = (now: number) => {
      const el = viewport.current,
        distance = loopWidth();
      if (el && distance > 0 && el.scrollWidth > el.clientWidth) {
        const delta = previous ? Math.min(48, now - previous) : 0;
        position = (position + delta * 0.028) % distance;
        el.scrollLeft = position;
      }
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [moving, count]);

  function nudge(direction: number) {
    const el = viewport.current;
    if (!el) return;
    setChoice(false);
    const first = list.current?.children[0];
    const step = first ? first.getBoundingClientRect().width + 24 : 250;
    const distance = loopWidth();
    const target = el.scrollLeft + direction * step;
    el.scrollTo({
      left: distance ? (target + distance) % distance : Math.max(0, target),
      behavior: reduced ? "instant" : "smooth",
    });
  }

  return (
    <section
      ref={section}
      className="kg-partners"
      aria-labelledby="partners-heading"
      data-reveal
    >
      <div className="container-site">
        <div className="kg-partners-heading">
          <div>
            {c.eyebrow && (
              <p className="kg-eyebrow kg-eyebrow-dark">{c.eyebrow}</p>
            )}
            <h2 id="partners-heading">{c.metin01}</h2>
            {c.intro && <p className="kg-partners-intro">{c.intro}</p>}
          </div>
          {count > 1 && (
            <div className="kg-partners-controls">
              <button
                type="button"
                onClick={() => nudge(-1)}
                aria-label={c.previousLabel}
              >
                <span aria-hidden="true">←</span>
              </button>
              <button
                type="button"
                onClick={() => setChoice(!wanted)}
                aria-label={wanted ? c.pauseLabel : c.playLabel}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    d={wanted ? "M7 5h3v14H7zm7 0h3v14h-3z" : "m8 5 11 7-11 7z"}
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => nudge(1)}
                aria-label={c.nextLabel}
              >
                <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </div>
        <div
          ref={viewport}
          className="kg-partners-viewport"
          data-moving={moving}
          data-dragging={dragging}
          tabIndex={0}
          aria-label={c.metin01}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") setHovered(true);
          }}
          onPointerLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setFocused(false);
          }}
          onWheel={(event) => {
            if (event.deltaX || event.shiftKey) setChoice(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              nudge(event.key === "ArrowRight" ? 1 : -1);
            }
          }}
          onPointerDown={(event) => {
            drag.current = {
              active: event.pointerType === "mouse" && event.button === 0,
              x: event.clientX,
              scroll: event.currentTarget.scrollLeft,
              moved: false,
            };
            if (event.pointerType === "touch") setChoice(false);
          }}
          onPointerMove={(event) => {
            const state = drag.current;
            if (!state.active) return;
            const delta = event.clientX - state.x;
            if (Math.abs(delta) <= 6 && !state.moved) return;
            state.moved = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            event.preventDefault();
            setDragging(true);
            setChoice(false);
            event.currentTarget.scrollLeft = state.scroll - delta;
          }}
          onPointerUp={(event) => {
            drag.current.active = false;
            setDragging(false);
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            drag.current.active = false;
            setDragging(false);
          }}
          onClickCapture={(event) => {
            if (drag.current.moved && event.detail > 0) {
              drag.current.moved = false;
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          <ul ref={list} className="kg-partners-track">
            {[0, ...(count > 1 ? [1] : [])].flatMap((copy) =>
              c.partners.map((partner, index) => (
                <li
                  key={copy + "-" + index + "-" + partner.name}
                  aria-hidden={copy ? true : undefined}
                >
                  <a
                    href={partner.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={partner.name}
                    tabIndex={copy ? -1 : undefined}
                    draggable={false}
                  >
                    <div className="kg-partner-logo">
                      {partner.image ? (
                        <SiteImage
                          src={partner.image}
                          alt=""
                          width={300}
                          height={130}
                          sizes="(max-width:700px) 170px, 250px"
                          draggable={false}
                        />
                      ) : (
                        <strong>{partner.name}</strong>
                      )}
                    </div>
                    <div className="kg-partner-name">
                      <span>{partner.name}</span>
                      <ArrowUpRight />
                    </div>
                  </a>
                </li>
              )),
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

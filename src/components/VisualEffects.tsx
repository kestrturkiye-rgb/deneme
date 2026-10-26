"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSection } from "@/cms/context";
export default function VisualEffects() {
  const c = useSection("components-VisualEffects"),
    design = useSection("design");
  const path = usePathname();
  const bar = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const root = bar.current?.closest<HTMLElement>(".site-shell");
    if (!root) return;
    let frame = 0,
      disposed = false;
    let intersection: IntersectionObserver | undefined,
      mutations: MutationObserver | undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    function reveal() {
      intersection?.disconnect();
      mutations?.disconnect();
      if (!root) return;
      const enabled = design.motionEffects && !media.matches;
      root.dataset.motion = enabled ? "on" : "off";
      root.classList.remove("kg-motion-active");
      if (!enabled || !("IntersectionObserver" in window)) return;
      const observed = new WeakSet<Element>();
      intersection = new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            if (entry.isIntersecting) {
              entry.target.classList.add("is-revealed");
              intersection?.unobserve(entry.target);
            }
        },
        { threshold: 0.05, rootMargin: "0px 0px -25px 0px" },
      );
      const observe = () => {
        root.querySelectorAll("[data-reveal]").forEach((element) => {
          if (!observed.has(element)) {
            observed.add(element);
            intersection?.observe(element);
          }
        });
      };
      observe();
      root.classList.add("kg-motion-active");
      mutations = new MutationObserver(observe);
      mutations.observe(root, { childList: true, subtree: true });
    }
    function update() {
      frame = 0;
      if (disposed) return;
      const available = document.documentElement.scrollHeight - innerHeight;
      const progress =
        available > 0 ? Math.min(1, Math.max(0, scrollY / available)) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${progress})`;
      setShowTop((value) => {
        const next = scrollY > 600;
        return value === next ? value : next;
      });
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    reveal();
    update();
    media.addEventListener("change", reveal);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const resize =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedule)
        : undefined;
    resize?.observe(document.documentElement);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      intersection?.disconnect();
      mutations?.disconnect();
      resize?.disconnect();
      root.classList.remove("kg-motion-active");
      delete root.dataset.motion;
      media.removeEventListener("change", reveal);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [path, design.motionEffects]);
  return (
    <>
      <div ref={bar} className="kg-reading-progress" aria-hidden="true" />
      {showTop && (
        <button
          type="button"
          className="kg-back-top"
          aria-label={c.backToTopLabel}
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior:
                design.motionEffects &&
                !window.matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "smooth"
                  : "auto",
            })
          }
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            aria-hidden="true"
          >
            <path d="M12 20V4m-6 6 6-6 6 6" />
          </svg>
        </button>
      )}
    </>
  );
}

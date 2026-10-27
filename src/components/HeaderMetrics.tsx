"use client";
import { useEffect, useRef } from "react";

/** Keep the hero and sticky page navigation below the actual header. */
export default function HeaderMetrics() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const header = marker.current?.closest("header");
    const shell = header?.closest<HTMLElement>(".site-shell");
    if (!header || !shell) return;
    const measure = () => {
      const value = Math.ceil(header.getBoundingClientRect().height) + "px";
      if (shell.style.getPropertyValue("--kg-header-height") !== value)
        shell.style.setProperty("--kg-header-height", value);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  return <span ref={marker} hidden aria-hidden="true" />;
}

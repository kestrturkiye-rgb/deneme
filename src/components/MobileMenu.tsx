"use client";
import ArrowUpRight from "./ArrowUpRight";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSection } from "@/cms/context";
type Item = { label: string; href: string };
export default function MobileMenu({
  primary,
  secondary,
}: {
  primary: Item[];
  secondary: Item[];
}) {
  const c = useSection("components-MobileMenu");
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      dialog.current?.close();
      document.body.style.overflow = previous;
    };
  }, [open]);
  return (
    <div className="kg-mobile-nav">
      <button
        type="button"
        className="kg-menu-toggle"
        aria-label={c.metin01}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(true)}
      >
        <svg
          width="25"
          height="25"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M3 8h18M3 16h18" />
        </svg>
      </button>
      <dialog
        ref={dialog}
        id="mobile-menu"
        className="kg-mobile-dialog"
        aria-label={c.metin02}
        onCancel={() => setOpen(false)}
      >
        <div className="kg-mobile-top">
          <span>{c.metin03}</span>
          <button
            type="button"
            aria-label={c.metin04}
            onClick={() => setOpen(false)}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M6 18 18 6" />
            </svg>
          </button>
        </div>
        <nav aria-label={c.metin05}>
          <ol>
            {primary.map((item, i) => (
              <li key={item.href}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <Link href={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                  <span aria-hidden="true">
                    <ArrowUpRight />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <div className="kg-mobile-secondary">
            {secondary.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </dialog>
    </div>
  );
}

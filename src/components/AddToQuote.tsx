"use client";

import { useSection } from "@/cms/context";

import Link from "@/components/LocalizedLink";
import { useState } from "react";
import { useCart } from "./CartProvider";

type Props = {
  slug: string;
  name: string;
  href: string;
};

export default function AddToQuote({ slug, name, href }: Props) {
  const cms = useSection("components-AddToQuote");

  const { add, items } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const inCart = items.some((i) => i.slug === slug);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        className="btn-primary"
        onClick={() => {
          add({ slug, name, href });
          setJustAdded(true);
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="14" />
          <path d="m3 5 9 8 9-8M3 19l6-7m12 7-6-7" />
        </svg>
        {cms.metin01}
      </button>

      <p role="status" className="text-sm text-muted">
        {justAdded || inCart ? (
          <>
            {cms.metin02}{" "}
            <Link
              href={cms.metin03}
              className="font-semibold text-brand-600 underline underline-offset-4"
            >
              {cms.metin04}
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}

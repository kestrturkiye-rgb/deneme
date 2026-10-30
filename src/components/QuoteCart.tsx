"use client";

import { useSection } from "@/cms/context";

import Link from "@/components/LocalizedLink";
import { useState } from "react";
import { useCart } from "./CartProvider";
import MessageForm from "./MessageForm";

export default function QuoteCart() {
  const cms = useSection("components-QuoteCart");
  const catalog = useSection("data-divisions");
  const details = useSection("data-details");

  const { items, ready, setQty, remove, clear } = useCart();
  const [sent, setSent] = useState(false);
  const displayItems = items.map((item) => {
    const [slug, variantId, colorId, configurationId] = item.slug.split("--");
    const product = catalog.divisions
      .flatMap((d) => d.groups.flatMap((g) => g.items))
      .find((p) => p.slug === slug);
    const detail = (
      details.details as Record<string, import("@/data/details").Detail>
    )[slug];
    if (!product) return item;
    const variant = detail?.variants?.find((v) => v.id === variantId);
    const color = (variant?.colors || detail?.colors)?.find(
      (c) => c.id === colorId,
    );
    const config = (variant?.configurations || detail?.configurations)?.find(
      (c) => c.id === configurationId,
    );
    return {
      ...item,
      name: [
        product.name,
        variant?.label,
        color?.label,
        config ? `${config.composition} / ${config.outerLayer}` : undefined,
      ]
        .filter(Boolean)
        .join(" – "),
    };
  });

  if (!ready) {
    return <p className="text-muted">{cms.metin01}</p>;
  }

  if (sent) {
    return (
      <div role="status" className="border border-brand-500 bg-brand-100 p-8">
        <h2 className="text-2xl font-semibold text-ink">{cms.metin02}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink">
          {cms.metin03}
        </p>
        <Link href={cms.metin04} className="btn-outline mt-6">
          {cms.metin05}
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border border-mist-dark bg-paper p-10 text-center">
        <h2 className="text-3xl font-semibold text-ink">{cms.metin06}</h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted">
          {cms.metin07}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href={cms.metin08} className="btn-primary">
            {cms.metin09}
          </Link>
          <Link href={cms.metin10} className="btn-outline">
            {cms.metin11}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <div className="flex items-end justify-between border-b border-mist-dark pb-4">
          <h2 className="text-3xl font-semibold text-ink">{cms.metin12}</h2>
          <button
            type="button"
            onClick={clear}
            className="text-sm text-muted underline underline-offset-4 transition-colors hover:text-brand-600"
          >
            {cms.metin13}
          </button>
        </div>

        <ul className="divide-y divide-mist-dark">
          {displayItems.map((item) => (
            <li
              key={item.slug}
              className="flex flex-wrap items-center gap-4 py-5"
            >
              <Link
                href={item.href}
                className="min-w-0 flex-1 text-[15px] font-semibold text-ink transition-colors hover:text-brand-600"
              >
                {item.name}
              </Link>

              <label className="flex items-center gap-2 text-sm text-muted">
                {cms.metin14}
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={item.qty}
                  onChange={(e) => setQty(item.slug, Number(e.target.value))}
                  className="w-20 border border-mist-dark bg-paper px-3 py-2 text-ink outline-none focus:border-brand-500"
                />
              </label>

              <button
                type="button"
                onClick={() => remove(item.slug)}
                aria-label={`${cms.metin15}: ${item.name}`}
                className="text-sm text-muted underline underline-offset-4 transition-colors hover:text-brand-600"
              >
                {cms.metin15}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="border border-mist-dark bg-mist p-6 md:p-8">
        <h2 className="text-3xl font-semibold text-ink">{cms.metin16}</h2>
        <div className="mt-6">
          <MessageForm
            kind="quote"
            items={displayItems.map((i) => ({
              name: i.name,
              qty: i.qty,
              href: i.href,
            }))}
            onSuccess={() => {
              clear();
              setSent(true);
            }}
          />
        </div>
      </div>
    </div>
  );
}

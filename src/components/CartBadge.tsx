"use client";

import { useCart } from "./CartProvider";

export default function CartBadge() {
  const { count } = useCart();

  return (
    <span
      aria-label={`Sepetteki ürün sayısı: ${count}`}
      className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white"
    >
      {count}
    </span>
  );
}

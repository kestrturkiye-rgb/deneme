"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartItem = {
  slug: string;
  name: string;
  href: string;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  ready: boolean;
  add: (item: Omit<CartItem, "qty">) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "kivanc-teklif-sepeti";
const MAX_QTY = 9999;

const CartContext = createContext<CartContextValue | null>(null);

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.slug === "string" &&
    typeof v.name === "string" &&
    typeof v.href === "string" &&
    typeof v.qty === "number"
  );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.filter(isCartItem));
      }
    } catch {
      // Bozuk veya erişilemeyen depolama: boş sepetle devam et
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Depolama dolu veya kapalı olabilir
    }
  }, [items, ready]);

  const add = useCallback((item: Omit<CartItem, "qty">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.slug === item.slug);
      if (existing) {
        return prev.map((i) =>
          i.slug === item.slug
            ? { ...i, qty: Math.min(i.qty + 1, MAX_QTY) }
            : i,
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const setQty = useCallback((slug: string, qty: number) => {
    const safe = Math.max(1, Math.min(MAX_QTY, Math.floor(qty) || 1));
    setItems((prev) =>
      prev.map((i) => (i.slug === slug ? { ...i, qty: safe } : i)),
    );
  }, []);

  const remove = useCallback((slug: string) => {
    setItems((prev) => prev.filter((i) => i.slug !== slug));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, i) => sum + i.qty, 0),
      ready,
      add,
      setQty,
      remove,
      clear,
    }),
    [items, ready, add, setQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart, CartProvider içinde kullanılmalı");
  return ctx;
}

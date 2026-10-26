"use client";
import { createContext, useContext } from "react";
import type { Content } from "./store";
const Context = createContext<Content | null>(null);
export function ContentProvider({
  content,
  children,
}: {
  content: Content;
  children: React.ReactNode;
}) {
  return <Context.Provider value={content}>{children}</Context.Provider>;
}
export function useSection<K extends keyof Content>(key: K): Content[K] {
  const value = useContext(Context);
  if (!value) throw new Error("İçerik sağlayıcısı bulunamadı.");
  return value[key];
}

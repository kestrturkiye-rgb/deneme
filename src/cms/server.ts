import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { readState, type Content } from "./store";
import { authenticated } from "./auth";
export const getClientContent = cache(async (): Promise<Content> => {
  const jar = await cookies();
  const state = await readState();
  return jar.get("cms_preview")?.value === "1" && (await authenticated())
    ? state.draft
    : state.published;
});
export async function getSection<K extends keyof Content>(
  key: K,
): Promise<Content[K]> {
  return (await getClientContent())[key];
}

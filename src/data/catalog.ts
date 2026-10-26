import { getDivisions } from "./divisions";
export { slugify } from "@/cms/schema";
export type Product = {
  slug: string;
  name: string;
  kind: "product" | "info";
  divisionSlug: string;
  divisionTitle: string;
  groupTitle: string;
  parentSlug?: string;
  relatedFamilies?: string[];
};
export async function getProducts(): Promise<Product[]> {
  return (await getDivisions()).flatMap((division) =>
    division.groups.flatMap((group) =>
      group.items.map((item) => ({
        slug: item.slug,
        name: item.name,
        parentSlug: item.parentSlug,
        relatedFamilies: item.relatedFamilies,
        kind:
          division.slug === "madencilik"
            ? ("info" as const)
            : ("product" as const),
        divisionSlug: division.slug,
        divisionTitle: division.title,
        groupTitle: group.title,
      })),
    ),
  );
}
export async function getProduct(divisionSlug: string, slug: string) {
  return (await getProducts()).find(
    (p) => p.divisionSlug === divisionSlug && p.slug === slug,
  );
}
export function productHref(p: Pick<Product, "divisionSlug" | "slug">) {
  return `/${p.divisionSlug}/${p.slug}`;
}

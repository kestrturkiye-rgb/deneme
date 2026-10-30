import { getSection } from "@/cms/server";
export type Group = {
  anchor?: string;
  title: string;
  items: {
    name: string;
    slug: string;
    parentSlug?: string;
    relatedFamilies?: string[];
  }[];
};

export type Division = {
  slug: string;
  title: string;
  intro: string;
  groups: Group[];
};

export async function getDivisions(): Promise<Division[]> {
  return (await getSection("data-divisions")).divisions as Division[];
}

export async function getDivision(slug: string) {
  return (await getDivisions()).find((d) => d.slug === slug);
}

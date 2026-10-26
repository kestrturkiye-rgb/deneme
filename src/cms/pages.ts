import { getSection } from "./server";
export type CustomBlock = {
  title: string;
  text: string;
  image: string;
  alt: string;
  buttonLabel: string;
  buttonHref: string;
};
export type CustomPage = {
  slug: string;
  title: string;
  intro: string;
  seoTitle: string;
  seoDescription: string;
  visible: boolean;
  blocks: CustomBlock[];
};
export async function getCustomPages(): Promise<CustomPage[]> {
  return (await getSection("customPages")).pages;
}

import ProductDiscovery from "@/components/ProductDiscovery";
import BrandStatement from "@/components/BrandStatement";
import About from "@/components/About";
import Divisions from "@/components/Divisions";
import Hero from "@/components/Hero";
import Partners from "@/components/Partners";
import Quality from "@/components/Quality";
import NewsPreview from "@/components/NewsPreview";
import { getSection } from "@/cms/server";
const blocks = {
  hero: Hero,
  divisions: Divisions,
  about: About,
  quality: Quality,
  partners: Partners,
  news: NewsPreview,
  discovery: ProductDiscovery,
  statement: BrandStatement,
};
export default async function HomePage() {
  const { sections } = await getSection("home");
  return (
    <>
      {sections
        .filter((s) => s.visible)
        .map((s) => {
          const Component = blocks[s.id as keyof typeof blocks];
          return Component ? <Component key={s.id} /> : null;
        })}
    </>
  );
}

import { getSection } from "@/cms/server";
import { slugify } from "@/cms/schema";
export type NewsItem = {
  title: string;
  date: string; // YYYY-MM-DD
  summary: string;
  href?: string;
  slug?: string;
  image?: string;
  imageAlt?: string;
  imageCaption?: string;
  body?: string[];
};
export const newsHref = (item: NewsItem) =>
  "/haberler/" + (item.slug || slugify(item.title));

// Haberler sayfasında yeni haber eklemek için bu listeye kayıt ekle (sıralama otomatik, yeniden eskiye).
export async function getNews(): Promise<NewsItem[]> {
  return (await getSection("data-news")).news as NewsItem[];
}

import { getSection } from "@/cms/server";
export type JobPosting = {
  title: string;
  href: string; // başvuru bağlantısı
};

// Açık pozisyonlar. Yeni ilan eklemek veya kapananı silmek için bu listeyi düzenle.
export async function getOpenPositions(): Promise<JobPosting[]> {
  return (await getSection("data-careers")).openPositions as JobPosting[];
}

import { getSection } from "@/cms/server";
export type DocumentLink = {
  title: string;
  href: string;
};

export type Brochure = DocumentLink & {
  /** YYYY-MM-DD */
  date: string;
};

// PDF dosyaları public/docs/ klasöründedir (npm run assets ile eski siteden indirilir)

export async function getLegislation(): Promise<DocumentLink[]> {
  return (await getSection("data-documents")).legislation as DocumentLink[];
}

export async function getBrochures(): Promise<Brochure[]> {
  return (await getSection("data-documents")).brochures as Brochure[];
}

export async function getVideos(): Promise<DocumentLink[]> {
  return (await getSection("data-documents")).videos as DocumentLink[];
}

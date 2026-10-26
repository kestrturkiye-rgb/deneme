import "server-only";
import type { Metadata } from "next";
import { getSection } from "@/cms/server";
export async function pageMetadata(
  path: string,
  metadata: Metadata,
  image?: string,
): Promise<Metadata> {
  const root = (await getSection("app-layout")).metadata;
  const title =
    typeof metadata.title === "string" ? metadata.title : root.title.default;
  const description = metadata.description || root.description;
  const images = [image || "/paylasim?path=" + encodeURIComponent(path)];
  return {
    ...metadata,
    alternates: { ...metadata.alternates, canonical: path },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      siteName: root.openGraph.siteName,
      title,
      description,
      url: path,
      images,
    },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

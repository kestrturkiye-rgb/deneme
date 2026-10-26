import { pageMetadata } from "@/lib/metadata";
import { getSection } from "@/cms/server";
import type { Metadata } from "next";
import PageBanner from "@/components/PageBanner";
import QuoteCart from "@/components/QuoteCart";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(
    "/teklif-sepeti",
    (await getSection("app-teklif-sepeti")).metadata,
  );
}

export default async function QuoteCartPage() {
  const cms = await getSection("app-teklif-sepeti");

  return (
    <>
      <PageBanner title={cms.metin01} intro={cms.metin02} />
      <section className="bg-paper py-16 md:py-24">
        <div className="container-site">
          <QuoteCart />
        </div>
      </section>
    </>
  );
}

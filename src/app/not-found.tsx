import { getSection } from "@/cms/server";
import Link from "next/link";
import PageBanner from "@/components/PageBanner";

export default async function NotFound() {
  const cms = await getSection("app-not-found");

  return (
    <>
      <PageBanner title={cms.metin01} intro={cms.metin02} />
      <section className="bg-paper py-16 md:py-24">
        <div className="container-site flex flex-wrap gap-4">
          <Link href={cms.metin03} className="btn-primary">
            {cms.metin04}
          </Link>
          <Link href={cms.metin05} className="btn-outline">
            {cms.metin06}
          </Link>
        </div>
      </section>
    </>
  );
}

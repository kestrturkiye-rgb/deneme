import { getSection } from "@/cms/server";
import SiteImage from "@/components/SiteImage";
import MessageForm from "@/components/MessageForm";
import { pageMetadata } from "@/lib/metadata";
export async function generateMetadata() {
  return pageMetadata(
    "/teklif-al",
    (await getSection("app-teklif-al")).metadata,
  );
}
export default async function InquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ urun?: string | string[] }>;
}) {
  const cms = await getSection("app-teklif-al");
  const { urun } = await searchParams;
  const selected =
    (Array.isArray(urun) ? urun[0] : urun)?.trim().slice(0, 300) || "";
  return (
    <section className="inquiry-page container-site">
      <div className="inquiry-story">
        {cms.image && (
          <SiteImage
            src={cms.image}
            alt={cms.imageAlt}
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
          />
        )}
        <div>
          <p className="editorial-eyebrow">{cms.eyebrow}</p>
          <h1>{cms.title}</h1>
          <p>{cms.intro}</p>
          <ol>
            {cms.steps.map((step, index) => (
              <li key={index}>
                <span>0{index + 1}</span>
                <div>
                  <h2>{step.title}</h2>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="inquiry-form" id="talep-formu">
        <h2>{cms.formTitle}</h2>
        {selected && (
          <p className="inquiry-selected">
            {cms.selectedLabel}: <strong>{selected}</strong>
          </p>
        )}
        <MessageForm kind="inquiry" subject={selected} />
      </div>
    </section>
  );
}

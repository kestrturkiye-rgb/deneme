import { getSection } from "@/cms/server";
export default async function Partners() {
  const c = await getSection("components-Partners");
  return (
    <section className="kg-partners" data-reveal>
      <div className="container-site">
        <h2>{c.metin01}</h2>
        <ul>
          {c.partners.map((partner) => (
            <li key={partner.name}>
              <a href={partner.href} target="_blank" rel="noopener noreferrer">
                {partner.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

import ArrowUpRight from "./ArrowUpRight";
import { getSection } from "@/cms/server";
import Link from "@/components/LocalizedLink";
import { getLegislation } from "@/data/documents";
import { documentAvailable } from "@/lib/document-availability";

const linkClass =
  "text-sm text-white/70 transition-colors duration-300 hover:text-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500";

export default async function Footer() {
  const cms = await getSection("components-Footer");
  const corporate = cms.corporate;
  const social = cms.social;

  return (
    <footer className="kg-footer bg-ink text-paper">
      <div className="kg-footer-cta container-site">
        <div>
          <span>{cms.contactEyebrow}</span>
          <h2>{cms.contactTitle}</h2>
        </div>
        <Link href={cms.contactHref} className="btn-primary">
          {cms.contactLabel}
          <span aria-hidden="true">
            <ArrowUpRight />
          </span>
        </Link>
      </div>
      <div className="kg-footer-links container-site">
        <div className="kg-footer-brand">
          {cms.logo ? (
            <Link href="/" aria-label={cms.logoAlt || "Kıvanç Group"}>
              <img
                className="kg-footer-logo"
                src={cms.logo}
                alt={cms.logoAlt || "Kıvanç Group"}
                width="220"
                height="72"
              />
            </Link>
          ) : (
            <span>
              KIVANÇ<span>GROUP</span>
            </span>
          )}
          <p>{cms.tagline}</p>
          <span className="kg-footer-established">{cms.established}</span>
        </div>
        <div>
          <h3 className="text-2xl font-semibold">{cms.metin01}</h3>
          <ul className="mt-6 space-y-3">
            {corporate.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={cms.metin02}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {cms.metin03}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-2xl font-semibold">{cms.metin04}</h3>
          <ul className="mt-6 space-y-3">
            <li>
              <a href={cms.metin05} className={linkClass}>
                {cms.metin06}
              </a>
            </li>
            <li>
              <a href={cms.metin07} className={linkClass}>
                {cms.metin08}
              </a>
            </li>
            {social.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-2xl font-semibold">{cms.metin09}</h3>
          <ul className="mt-6 space-y-3">
            {(await getLegislation()).map((l) => (
              <li key={l.href}>
                <a
                  href={documentAvailable(l.href) ? l.href : "/mevzuat"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {l.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-site py-6 text-xs text-white/50">
          {cms.metin10}
          {new Date().getFullYear()} {cms.metin11}
        </div>
      </div>
    </footer>
  );
}

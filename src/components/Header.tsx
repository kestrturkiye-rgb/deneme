import LanguageSwitcher from "./LanguageSwitcher";
import { localizedHref } from "@/i18n/locales";
import { getLocale } from "@/i18n/server";
import MegaNavigation from "./MegaNavigation";
import { getDivisions } from "@/data/divisions";
import { getSection } from "@/cms/server";
import Link from "@/components/LocalizedLink";
import CartBadge from "./CartBadge";
import MobileMenu from "./MobileMenu";
import HeaderMetrics from "./HeaderMetrics";
export default async function Header() {
  const locale = await getLocale();
  const c = await getSection("components-Header");
  return (
    <header className="kg-header">
      <HeaderMetrics />
      <div className="kg-header-utility container-site">
        <div>
          <a href={c.metin02}>{c.metin03}</a>
          <a href={c.metin04}>{c.metin05}</a>
        </div>
        <nav aria-label={c.utilityLabel}>
          {c.utilityLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="kg-header-main container-site">
        <Link className="kg-brand" href={c.metin07} aria-label={c.metin08}>
          {c.metin09 ? (
            <img src={c.metin09} alt={c.metin10} width="163" height="60" />
          ) : (
            <span>{c.metin10 || "Kıvanç Group"}</span>
          )}
        </Link>
        <MegaNavigation items={c.mainNav} divisions={await getDivisions()} />
        <div className="kg-header-actions">
          <LanguageSwitcher />
          <details className="kg-search">
            <summary aria-label={c.searchLabel} title={c.searchLabel}>
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m16 16 5 5" />
              </svg>
            </summary>
            <form action={localizedHref("/arama", locale)} role="search">
              <label>
                <span className="sr-only">{c.metin06}</span>
                <input
                  name="q"
                  type="search"
                  placeholder={c.metin06}
                  required
                />
              </label>
              <button type="submit">{c.searchSubmit}</button>
            </form>
          </details>
          <Link href={c.metin11} className="kg-header-quote">
            <span>{c.metin12}</span>
            <span className="kg-cart-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M6 7h12l-1 13H7L6 7Z" />
                <path d="M9 7a3 3 0 0 1 6 0" />
              </svg>
              <CartBadge />
            </span>
          </Link>
          <MobileMenu primary={c.mainNav} secondary={c.utilityLinks} />
        </div>
      </div>
      {c.showAnnouncements && (
        <div className="kg-announcements">
          <div className="animate-marquee">
            {[...c.announcements, ...c.announcements].map((text, i) => (
              <span key={i}>
                {c.metin01} {text}
              </span>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

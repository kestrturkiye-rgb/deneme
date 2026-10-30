import Link from "@/components/LocalizedLink";
import SiteImage from "./SiteImage";
import ArrowUpRight from "./ArrowUpRight";

export default function ProductCard({
  href,
  name,
  category,
  image,
  label,
  action,
  summary,
  tags = [],
  hasSpin,
  index = 0,
}: {
  href: string;
  name: string;
  category: string;
  image?: string;
  label: string;
  action: string;
  summary?: string;
  tags?: string[];
  hasSpin?: boolean;
  index?: number;
}) {
  return (
    <Link href={href} className="kg-product-card">
      <div className={"kg-product-art" + (image ? "" : " is-technical")}>
        <span className="kg-product-type">
          <span className="kg-card-index" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          {label}
        </span>
        {image ? (
          <SiteImage
            src={image}
            alt={name}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw"
          />
        ) : (
          <>
            <span className="kg-technical-ring" aria-hidden="true" />
            <svg
              className="kg-technical-mark"
              viewBox="0 0 120 140"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              aria-hidden="true"
            >
              <path d="M60 10 100 28v42c0 26-40 55-40 55S20 96 20 70V28Z" />
              <path d="M60 25 87 37v31c0 19-27 40-27 40S33 87 33 68V37Z" />
              <path d="M45 65h30M60 50v30" />
              <circle cx="60" cy="65" r="27" strokeDasharray="2 5" />
            </svg>
            <span className="kg-technical-index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
          </>
        )}
        {hasSpin && <span className="kg-product-spin">360°</span>}
        <span className="kg-product-open" aria-hidden="true">
          <ArrowUpRight />
        </span>
      </div>
      <div className="kg-product-caption">
        <small>{category}</small>
        <h3>{name}</h3>
        {summary && <p className="catalog-card-summary">{summary}</p>}
        {tags.length > 0 && (
          <ul className="catalog-card-tags">
            {tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}
        <span>
          {action}
          <span aria-hidden="true"> →</span>
        </span>
      </div>
    </Link>
  );
}

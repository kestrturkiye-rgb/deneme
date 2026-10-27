import SiteImage from "./SiteImage";
import BrandLines from "./BrandLines";
type Props = {
  title: string;
  intro?: string;
  image?: string;
  imageAlt?: string;
  eyebrow?: string;
  caption?: string;
};
export default function PageBanner({
  title,
  intro,
  image,
  imageAlt = "",
  eyebrow,
  caption,
}: Props) {
  return (
    <section className={"kg-page-banner" + (image ? " kg-editorial-hero" : "")}>
      {image && (
        <SiteImage
          src={image}
          alt={imageAlt}
          fill
          sizes="100vw"
          fetchPriority="high"
        />
      )}
      <div className="container-site">
        {eyebrow && <p className="editorial-eyebrow">{eyebrow}</p>}
        <span className="kg-banner-rule" aria-hidden="true" />
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
        {caption && <small className="editorial-caption">{caption}</small>}
      </div>
      <BrandLines className="kg-banner-lines" />
    </section>
  );
}

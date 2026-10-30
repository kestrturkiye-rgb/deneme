"use client";
import {useLocale} from "@/i18n/context";
import {localizedHref} from "@/i18n/locales";
import BrandLines from "./BrandLines";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "@/components/LocalizedLink";
import { useSection } from "@/cms/context";
import Product360 from "./Product360";
import AddToQuote from "./AddToQuote";
import SiteImage from "./SiteImage";
import type { SpinConfig } from "@/lib/spin";
import { productView } from "@/lib/product-view";
import type {
  ProductVariant,
  ProductColor,
  ProductConfiguration,
} from "@/data/details";
type Picture = { src: string; alt: string };
type Props = {
  name: string;
  slug: string;
  href: string;
  kind: "product" | "info";
  divisionSlug: string;
  divisionTitle: string;
  groupTitle: string;
  description: string[];
  features: string[];
  images: Picture[];
  spin?: SpinConfig;
  variants: ProductVariant[];
  line?: string;
  configurations: ProductConfiguration[];
  colors: ProductColor[];
  relatedProduct?: { href: string; name: string; image?: string };
};
export default function ProductExperience(props: Props) {
  const locale=useLocale();
  const c = useSection("components-ProductExperience");
  const [variant, setVariant] = useState(0),
    [selected, setSelected] = useState(0),
    [colorIndex, setColorIndex] = useState(0),
    [configurationId, setConfigurationId] = useState(""),
    [expanded, setExpanded] = useState(false),
    [shareStatus, setShareStatus] = useState(""),
    [fullscreen, setFullscreen] = useState(false),
    [quoteVisible, setQuoteVisible] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const quoteContainer = useRef<HTMLDivElement>(null);
  const current = props.variants[variant];
  const colors = current?.colors ?? (!current ? props.colors : []);
  const color = colors[colorIndex];
  const configurations = current?.configurations ?? props.configurations;
  const configuration =
    configurations.find((item) => item.id === configurationId) ||
    configurations[0];
  const compositions = [
    ...new Set(configurations.map((item) => item.composition)),
  ];
  const outerLayers = configurations.filter(
    (item) => item.composition === configuration?.composition,
  );
  const { images, spin } = productView(props, {}, variant, colorIndex);
  const hasSpin = Boolean(spin);
  const [mode, setMode] = useState<"spin" | "image">(
    hasSpin ? "spin" : "image",
  );
  const mediaKey = [current?.id || "default", color?.id || "default"].join("-");
  useEffect(() => {
    setSelected(0);
    setMode(hasSpin ? "spin" : "image");
  }, [mediaKey, hasSpin]);
  useEffect(() => {
    if (fullscreen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [fullscreen]);
  useEffect(() => {
    const element = quoteContainer.current;
    if (!element || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(
      ([entry]) => setQuoteVisible(entry.isIntersecting),
      { threshold: 0.2, rootMargin: "-90px 0px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  function changeVariant(index: number) {
    setVariant(index);
    setColorIndex(0);
    setSelected(0);
    setConfigurationId("");
  }
  async function share() {
    const url = new URL(localizedHref(props.href,locale), window.location.origin).href;
    try {
      if (navigator.share) {
        await navigator.share({ title: props.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareStatus(c.shared);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") setShareStatus(c.shareError);
    }
  }
  const image = images[selected];
  const previewParagraphs = props.description.slice(
    0,
    (props.description[0]?.length || 0) < 140 ? 2 : 1,
  );
  const otherVariant = props.variants.find((_, index) => index !== variant);
  const thumbFor = (entry: ProductVariant) =>
    productView({ variants: [entry] }).image;
  const visual = (large = false) => (
    <div className={"product-visual" + (large ? " is-fullscreen" : "")}>
      {mode === "spin" && spin ? (
        <Product360 key={mediaKey} spin={spin} fallback={images[0]?.src} />
      ) : image ? (
        <div className="product-photo">
          <SiteImage
            src={image.src}
            alt={image.alt}
            width={1200}
            height={1440}
            sizes="(max-width:750px) 100vw, 55vw"
            draggable={false}
          />
        </div>
      ) : (
        <div className="product-no-image">
          <span>KG</span>
          <p>{c.noImage}</p>
        </div>
      )}
    </div>
  );
  const quoteName = [
    props.name,
    current?.label,
    color?.label,
    configuration
      ? `${configuration.composition} / ${configuration.outerLayer}`
      : undefined,
  ]
    .filter(Boolean)
    .join(" – ");
  const quoteSlug = [props.slug, current?.id, color?.id, configuration?.id]
    .filter(Boolean)
    .join("--");
  const style = {
    "--product-background": c.productBackground,
    "--product-text": c.productText,
    "--product-accent": c.productAccent,
    "--product-glow": c.productGlow,
  } as CSSProperties;
  return (
    <section className="product-overview product-reference" style={style}>
      <div className="product-side-label">
        <i />
        {props.name}
      </div>
      <div className="container-site">
        <nav className="product-breadcrumb" aria-label={c.breadcrumb}>
          <Link href="/">{c.home}</Link>
          <span>/</span>
          <Link href={"/" + props.divisionSlug}>{props.divisionTitle}</Link>
          <span>/</span>
          <span>{props.name}</span>
        </nav>
        <div className="product-hero-grid">
          <div className="product-heading">
            <div className="product-title-row">
              <h1>{props.name}</h1>
              <button
                className="product-share"
                type="button"
                aria-label={c.share}
                onClick={share}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  aria-hidden="true"
                >
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <path d="m8.7 10.4 6.5-3.8M8.7 13.6l6.5 3.8" />
                </svg>
              </button>
            </div>
            {shareStatus && (
              <p className="product-share-status" role="status">
                {shareStatus}
              </p>
            )}
            <p className="product-series">
              {props.line || current?.label || props.groupTitle}
            </p>
          </div>
          <div className="product-gallery">
            {props.variants.length > 0 && (
              <div
                className="product-variant-tabs"
                role="tablist"
                aria-label={c.variantLabel}
              >
                {props.variants.map((item, index) => (
                  <button
                    type="button"
                    key={item.id}
                    role="tab"
                    id={"variant-tab-" + index}
                    aria-controls="product-view-panel"
                    aria-selected={variant === index}
                    onClick={() => changeVariant(index)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
            <div
              id="product-view-panel"
              className="product-gallery-main"
              role={props.variants.length ? "tabpanel" : undefined}
              aria-labelledby={
                props.variants.length ? "variant-tab-" + variant : undefined
              }
            >
              <BrandLines className="kg-product-lines" />
              {visual()}
              {(images.length > 0 || hasSpin) && (
                <button
                  className="product-enlarge"
                  type="button"
                  onClick={() => setFullscreen(true)}
                  aria-label={c.fullscreen}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6" />
                  </svg>
                </button>
              )}
            </div>
            <div className="product-gallery-bottom">
              {otherVariant ? (
                <button
                  type="button"
                  className="product-related-thumb"
                  onClick={() =>
                    changeVariant(props.variants.indexOf(otherVariant))
                  }
                >
                  <span>
                    {thumbFor(otherVariant) ? (
                      <img
                        src={thumbFor(otherVariant)}
                        alt={otherVariant.label}
                      />
                    ) : (
                      <b>{otherVariant.label.slice(0, 1)}</b>
                    )}
                  </span>
                  <strong>{c.relatedProduct}</strong>
                  <small>{otherVariant.label}</small>
                </button>
              ) : props.relatedProduct ? (
                <Link
                  className="product-related-thumb"
                  href={props.relatedProduct.href}
                >
                  <span>
                    {props.relatedProduct.image ? (
                      <img
                        src={props.relatedProduct.image}
                        alt={props.relatedProduct.name}
                      />
                    ) : (
                      <b>KG</b>
                    )}
                  </span>
                  <strong>{c.relatedProduct}</strong>
                  <small>{props.relatedProduct.name}</small>
                </Link>
              ) : null}
              {(images.length > 1 || (hasSpin && images.length > 0)) && (
                <details
                  className="product-gallery-details"
                  open={!hasSpin && images.length <= 2}
                >
                  <summary>
                    {c.galleryLabel || "Ürün görselleri"}
                    <span>{images.length}</span>
                    <span aria-hidden="true">＋</span>
                  </summary>
                  <div className="product-thumbnails">
                    {hasSpin && (
                      <button
                        type="button"
                        className={mode === "spin" ? "active" : ""}
                        onClick={() => setMode("spin")}
                        aria-label={c.spinLabel}
                        aria-pressed={mode === "spin"}
                      >
                        <strong>360°</strong>
                        <small>{c.spinLabel}</small>
                      </button>
                    )}
                    {images.map((item, index) => (
                      <button
                        key={item.src + "-" + index}
                        type="button"
                        className={
                          mode === "image" && selected === index ? "active" : ""
                        }
                        onClick={() => {
                          setSelected(index);
                          setMode("image");
                        }}
                        aria-label={`${c.photo} ${index + 1}`}
                        aria-pressed={mode === "image" && selected === index}
                      >
                        <SiteImage
                          src={item.src}
                          alt={item.alt}
                          width={80}
                          height={96}
                          sizes="80px"
                        />
                      </button>
                    ))}
                  </div>
                </details>
              )}
            </div>
            {hasSpin && (
              <p className="product-view-note">
                <span>360°</span>
                {c.spinHint}
              </p>
            )}
          </div>
          <div className="product-intro">
            <div
              id="product-description"
              className={
                "product-description" + (expanded ? " is-expanded" : "")
              }
            >
              {expanded
                ? props.description.map((text, index) => (
                    <p key={index}>{text}</p>
                  ))
                : previewParagraphs.map((text, index) => (
                    <p key={index}>
                      {text.slice(0, 230)}
                      {text.length > 230 ? "…" : ""}
                    </p>
                  ))}
            </div>
            {(props.description.length > 1 ||
              (props.description[0]?.length || 0) > 230) && (
              <button
                type="button"
                className="product-read-more"
                aria-expanded={expanded}
                aria-controls="product-description"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? c.readLess : c.readMore}
              </button>
            )}
            {current?.description && (
              <p className="product-variant-description">
                {current.description}
              </p>
            )}
            {configuration && (
              <>
                <div className="product-options">
                  <label>
                    <span>{c.composition}</span>
                    <select
                      aria-label={c.composition}
                      value={configuration.composition}
                      onChange={(event) =>
                        setConfigurationId(
                          configurations.find(
                            (item) => item.composition === event.target.value,
                          )!.id,
                        )
                      }
                    >
                      {compositions.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{c.outerLayer}</span>
                    <select
                      aria-label={c.outerLayer}
                      value={configuration.id}
                      onChange={(event) =>
                        setConfigurationId(event.target.value)
                      }
                    >
                      {outerLayers.map((item) => (
                        <option value={item.id} key={item.id}>
                          {item.outerLayer}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <dl className="product-config-data">
                  {(
                    [
                      [c.sizes, configuration.sizes],
                      [c.compositionCode, configuration.compositionCode],
                      [c.articleNumber, configuration.articleNumber],
                    ] as const
                  )
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}:</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                </dl>
              </>
            )}
            {colors.length > 0 && (
              <fieldset className="product-colors">
                <legend>{c.color}</legend>
                <div>
                  {colors.map((item, index) => (
                    <button
                      type="button"
                      key={item.id}
                      aria-pressed={colorIndex === index}
                      onClick={() => {
                        setColorIndex(index);
                        setSelected(0);
                      }}
                    >
                      <span
                        className="product-color-swatch"
                        style={{ backgroundColor: item.swatch }}
                      >
                        {item.images?.[0]?.src && (
                          <img src={item.images[0].src} alt="" />
                        )}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="product-quote" ref={quoteContainer}>
              {props.kind === "product" ? (
                <AddToQuote
                  key={quoteSlug}
                  slug={quoteSlug}
                  name={quoteName}
                  href={props.href}
                />
              ) : (
                <Link href="/iletisim" className="btn-primary">
                  {c.contact}
                </Link>
              )}
              <Link className="product-contact-link" href="/iletisim">
                {c.ask} →
              </Link>
            </div>
            <a href="#urun-detaylari" className="product-details-jump">
              {c.details}
              <span>↓</span>
            </a>
          </div>
        </div>
      </div>
      <div className="product-mobile-bar" data-primary-visible={quoteVisible}>
        <div>
          <strong>{props.name}</strong>
          <span>{current?.label || props.groupTitle}</span>
        </div>
        <Link
          className="btn-primary"
          href={"/teklif-al?urun=" + encodeURIComponent(quoteName)}
        >
          {props.kind === "product" ? c.mobileQuote : c.mobileAsk}
        </Link>
      </div>
      <dialog
        ref={dialog}
        className="product-lightbox"
        onCancel={() => setFullscreen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setFullscreen(false);
        }}
      >
        <div className="product-lightbox-header">
          <span>
            {props.name}
            {current ? " · " + current.label : ""}
            {color ? " · " + color.label : ""}
          </span>
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            aria-label={c.close}
          >
            ×
          </button>
        </div>
        {fullscreen && visual(true)}
      </dialog>
    </section>
  );
}

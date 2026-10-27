"use client";
import { useState } from "react";
import Link from "next/link";
import { useSection } from "@/cms/context";
import ArrowUpRight from "./ArrowUpRight";
import SiteImage from "./SiteImage";
import HeroVideo from "./HeroVideo";
import { getImageProps } from "next/image";
export default function Hero() {
  const c = useSection("components-Hero");
  const [selected, setSelected] = useState(0);
  const stories = [
    {
      id: "protection",
      label: c.firstStoryLabel,
      eyebrow: c.metin01,
      title: c.metin02,
      accent: c.metin03,
      description: c.metin04,
      image: c.heroImage,
      video: c.heroVideo,
      imageAlt: c.metin09,
      href: c.metin05,
      linkLabel: c.metin06,
    },
    ...c.extraStories,
  ];
  const current = stories[selected] || stories[0];
  function preload(src: string) {
    const image = new Image();
    const { props } = getImageProps({
      src,
      alt: "",
      width: 1672,
      height: 941,
      sizes: "100vw",
      unoptimized: !src.startsWith("/"),
    });
    if (props.srcSet) image.srcset = props.srcSet;
    if (props.sizes) image.sizes = props.sizes;
    image.src = props.src;
  }
  return (
    <section className="kg-hero kg-story-hero" aria-labelledby="hero-heading">
      <SiteImage
        key={current.image}
        className="kg-hero-image kg-story-image"
        src={current.image}
        alt={current.imageAlt}
        fill
        sizes="100vw"
        fetchPriority={selected === 0 ? "high" : "auto"}
      />
      {current.video && (
        <HeroVideo
          key={current.id + current.video}
          src={current.video}
          playLabel={c.videoPlayLabel || "Banner videosunu oynat"}
          pauseLabel={c.videoPauseLabel || "Banner videosunu durdur"}
        />
      )}
      <div className="kg-hero-shade" />
      <div
        className="kg-hero-content container-site"
        id="hero-story"
        role="tabpanel"
        aria-labelledby={"hero-story-" + current.id}
      >
        <p className="kg-eyebrow">
          <span />
          {current.eyebrow}
        </p>
        <h1 id="hero-heading">
          {current.title}
          <br />
          <span>{current.accent}</span>
        </h1>
        <p className="kg-hero-description">{current.description}</p>
        <div className="kg-hero-actions">
          <Link className="btn-primary" href={current.href}>
            {current.linkLabel}
            <ArrowUpRight />
          </Link>
          <Link className="kg-text-link" href={c.metin07}>
            {c.metin08}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
      <div
        className="kg-story-selector container-site"
        role="tablist"
        aria-label={c.storyLabel}
      >
        {stories.map((story, index) => (
          <button
            key={story.id}
            id={"hero-story-" + story.id}
            role="tab"
            type="button"
            aria-selected={selected === index}
            aria-controls="hero-story"
            onPointerEnter={() => preload(story.image)}
            onFocus={() => preload(story.image)}
            onClick={() => setSelected(index)}
            onKeyDown={(event) => {
              if (
                ["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? stories.length - 1
                      : (index +
                          (event.key === "ArrowRight" ? 1 : -1) +
                          stories.length) %
                        stories.length;
                setSelected(next);
                document
                  .getElementById("hero-story-" + stories[next].id)
                  ?.focus();
              }
            }}
            tabIndex={selected === index ? 0 : -1}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{story.label}</strong>
            <i aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className="kg-hero-bottom container-site">
        <span>{c.metin10}</span>
        <a href="#faaliyet-alanlari">
          <span>{c.scrollLabel}</span>
          <svg
            width="17"
            height="20"
            viewBox="0 0 17 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            aria-hidden="true"
          >
            <path d="M8.5 1v16M3 11l5.5 6 5.5-6" />
          </svg>
        </a>
        <span className="kg-hero-index">
          {String(selected + 1).padStart(2, "0")} /{" "}
          {String(stories.length).padStart(2, "0")}
        </span>
      </div>
    </section>
  );
}

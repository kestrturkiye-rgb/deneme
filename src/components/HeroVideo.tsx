"use client";
import { useEffect, useRef, useState } from "react";
import { useSection } from "@/cms/context";

type Connection = EventTarget & { saveData?: boolean };

/** Decorative footage: the hero's image remains underneath until playback succeeds. */
export default function HeroVideo({
  src,
  playLabel,
  pauseLabel,
}: {
  src: string;
  playLabel: string;
  pauseLabel: string;
}) {
  const design = useSection("design");
  const video = useRef<HTMLVideoElement>(null);
  const wanted = useRef(false);
  const [automatic, setAutomatic] = useState(false);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(false);
  const [choice, setChoice] = useState<"auto" | "play" | "pause">("auto");
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const permitted = automatic || choice !== "auto";
  const shouldPlay =
    !failed &&
    visible &&
    inView &&
    (choice === "play" || (choice === "auto" && automatic));

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: Connection })
      .connection;
    const policy = () =>
      setAutomatic(
        design.motionEffects && !motion.matches && !connection?.saveData,
      );
    const visibility = () => setVisible(!document.hidden);
    policy();
    visibility();
    motion.addEventListener("change", policy);
    connection?.addEventListener("change", policy);
    document.addEventListener("visibilitychange", visibility);
    const hero = video.current?.closest(".kg-hero");
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            ([entry]) => setInView(entry.isIntersecting),
            { threshold: 0 },
          )
        : undefined;
    if (hero && observer) observer.observe(hero);
    else setInView(true);
    return () => {
      motion.removeEventListener("change", policy);
      connection?.removeEventListener("change", policy);
      document.removeEventListener("visibilitychange", visibility);
      observer?.disconnect();
    };
  }, [design.motionEffects]);

  useEffect(() => {
    const element = video.current;
    wanted.current = shouldPlay;
    if (!element || !shouldPlay) {
      element?.pause();
      return;
    }
    let disposed = false;
    element.muted = true;
    element.play()?.catch(() => {
      // Autoplay may be blocked; keep the poster and offer an explicit play button.
      if (!disposed) setPlaying(false);
    });
    return () => {
      disposed = true;
      element.pause();
    };
  }, [shouldPlay]);

  function toggle() {
    const element = video.current;
    if (!element) return;
    if (playing) {
      wanted.current = false;
      setChoice("pause");
      element.pause();
    } else {
      wanted.current = true;
      setChoice("play");
      // Call play during the gesture, including on browsers that disallow autoplay.
      if (!element.getAttribute("src")) element.src = src;
      element.muted = true;
      element.play()?.catch(() => setPlaying(false));
    }
  }

  return (
    <>
      <video
        ref={video}
        className={
          "kg-hero-video" + (started && permitted && !failed ? " is-ready" : "")
        }
        src={permitted && !failed ? src : undefined}
        width={1920}
        height={1080}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        onPlaying={() => {
          if (!wanted.current) return video.current?.pause();
          setStarted(true);
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onError={() => {
          setFailed(true);
          setPlaying(false);
        }}
      />
      {!failed && (
        <button
          className="kg-hero-video-control"
          type="button"
          onClick={toggle}
          aria-label={playing ? pauseLabel : playLabel}
          title={playing ? pauseLabel : playLabel}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
            aria-hidden="true"
          >
            {playing ? (
              <path d="M7 5h3v14H7zm7 0h3v14h-3z" />
            ) : (
              <path d="m8 5 11 7-11 7z" />
            )}
          </svg>
        </button>
      )}
    </>
  );
}

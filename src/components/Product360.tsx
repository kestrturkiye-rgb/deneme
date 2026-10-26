"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSection } from "@/cms/context";
import {
  frameAfterDrag,
  frameUrls,
  wrapIndex,
  type SpinConfig,
} from "@/lib/spin";

export default function Product360({
  spin,
  fallback,
}: {
  spin: SpinConfig;
  fallback?: string;
}) {
  const cms = useSection("components-Product360");
  const frames = useMemo(() => frameUrls(spin), [spin]);
  const total = frames.length;
  const [index, setIndex] = useState(0),
    [playing, setPlaying] = useState(false),
    [loaded, setLoaded] = useState(0),
    [failed, setFailed] = useState(false);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false,
      done = 0;
    setLoaded(0);
    setFailed(false);
    setIndex(0);
    setPlaying(false);
    const images = frames.map((src) => {
      const image = new Image();
      image.onload = () => {
        if (!cancelled) setLoaded(++done);
      };
      image.onerror = () => {
        if (!cancelled) setFailed(true);
      };
      image.src = src;
      return image;
    });
    return () => {
      cancelled = true;
      images.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, [frames]);
  const ready = total >= 2 && loaded === total && !failed;
  useEffect(() => {
    if (!ready || !playing) return;
    const timer = window.setInterval(
      () => setIndex((i) => wrapIndex(i + 1, total)),
      100,
    );
    return () => window.clearInterval(timer);
  }, [playing, ready, total]);
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  function step(delta: number) {
    setPlaying(false);
    setIndex((i) => wrapIndex(i + delta, total));
  }
  const src = failed ? fallback : frames[index];
  return (
    <div className="p360" data-ready={ready}>
      <div
        ref={stage}
        role="group"
        tabIndex={0}
        className="p360-stage"
        aria-label={`${spin.alt}. ${cms.instructions}`}
        onPointerDown={(e) => {
          if (!ready || e.button !== 0) return;
          e.currentTarget.focus({ preventScroll: true });
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, start: index };
          setPlaying(false);
        }}
        onPointerMove={(e) => {
          if (drag.current && ready) {
            const sensitivity = Math.max(
              3,
              e.currentTarget.clientWidth / total,
            );
            setIndex(
              frameAfterDrag(
                drag.current.start,
                e.clientX - drag.current.x,
                sensitivity,
                total,
              ),
            );
          }
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onKeyDown={(e) => {
          if (!ready) return;
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            step(e.key === "ArrowLeft" ? -1 : 1);
          }
          if (e.key === "Home") {
            e.preventDefault();
            setIndex(0);
          }
          if (e.key === "End") {
            e.preventDefault();
            setIndex(total - 1);
          }
        }}
      >
        {src ? (
          <img
            className="p360-image"
            src={src}
            alt={spin.alt}
            draggable={false}
          />
        ) : (
          <div className="p360-empty">{cms.unavailable}</div>
        )}
        <span className="p360-label">360°</span>
        {!ready && !failed && (
          <div className="p360-loading" role="status">
            <span />
            {cms.metin02}
            {Math.round((loaded / Math.max(total, 1)) * 100)}%
          </div>
        )}
        {failed && (
          <div className="p360-error" role="alert">
            {cms.loadError}
          </div>
        )}
        {ready && (
          <div className="p360-drag-hint" aria-hidden="true">
            <span>←</span>
            <span>{cms.metin04}</span>
            <span>→</span>
          </div>
        )}
      </div>
      <div className="p360-orbit" role="group" aria-label={cms.metin07}>
        <svg viewBox="0 0 420 90" aria-hidden="true">
          <ellipse cx="210" cy="45" rx="190" ry="31" />
        </svg>
        {Array.from({ length: Math.min(total, 8) }, (_, point) => {
          const points = Math.min(total, 8),
            target = Math.floor((point * total) / points),
            angle = Math.PI + (point / points) * Math.PI * 2;
          const active =
            Math.floor((index * points) / Math.max(total, 1)) === point;
          return (
            <button
              key={point}
              type="button"
              disabled={!ready}
              className={active ? "active" : ""}
              style={{
                left: ((210 + 190 * Math.cos(angle)) / 420) * 100 + "%",
                top: ((45 + 31 * Math.sin(angle)) / 90) * 100 + "%",
              }}
              aria-label={`${cms.angle} ${Math.round((target / Math.max(total, 1)) * 360)}°`}
              aria-pressed={active}
              onClick={() => {
                setPlaying(false);
                setIndex(target);
              }}
            />
          );
        })}
      </div>
      <div className="p360-controls">
        <button
          type="button"
          disabled={!ready}
          aria-label={cms.previous}
          onClick={() => step(-1)}
        >
          ←
        </button>
        <button
          type="button"
          disabled={!ready}
          aria-pressed={playing}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? cms.metin05 : cms.metin06}
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(0, total - 1)}
          value={Math.min(index, Math.max(0, total - 1))}
          disabled={!ready}
          aria-label={cms.metin07}
          onChange={(e) => {
            setPlaying(false);
            setIndex(Number(e.target.value));
          }}
        />
        <button
          type="button"
          disabled={!ready}
          aria-label={cms.next}
          onClick={() => step(1)}
        >
          →
        </button>
        <output aria-live="off">
          {index + 1} / {total}
        </output>
      </div>
    </div>
  );
}

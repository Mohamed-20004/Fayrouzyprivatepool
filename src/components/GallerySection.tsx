"use client";

import { useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { IconMoon, IconSun } from "@/components/Icons";

type GalleryImage = {
  src: string;
  alt: string;
  category: "pool" | "interiors" | "views";
  time: "day" | "night";
};

type Labels = Pick<
  Dictionary,
  "daySlot" | "nightSlot" | "tabPool" | "tabInteriors" | "tabViews"
>;

/**
 * Day ↔ Night slider: a track with an arrow knob the guest drags (or taps
 * the other side / uses arrow keys) to move between day and night. Positions
 * use logical (inline) coordinates so the whole control mirrors in RTL.
 */
function DayNightSlider({
  time,
  onChange,
  labels,
}: {
  time: "day" | "night";
  onChange: (t: "day" | "night") => void;
  labels: Pick<Labels, "daySlot" | "nightSlot">;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const dragging = dragRatio !== null;
  // 0 = day (inline start), 1 = night (inline end)
  const ratio = dragRatio ?? (time === "day" ? 0 : 1);

  function ratioFromPointer(clientX: number): number {
    const el = trackRef.current;
    if (!el) return ratio;
    const rect = el.getBoundingClientRect();
    let r = (clientX - rect.left) / rect.width;
    if (getComputedStyle(el).direction === "rtl") r = 1 - r;
    return Math.max(0, Math.min(1, r));
  }

  function commit(r: number) {
    setDragRatio(null);
    onChange(r > 0.5 ? "night" : "day");
  }

  return (
    <div
      ref={trackRef}
      className={`dn-slider${dragging ? " dragging" : ""}`}
      role="switch"
      aria-checked={time === "night"}
      aria-label={`${labels.daySlot} / ${labels.nightSlot}`}
      tabIndex={0}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragRatio(ratioFromPointer(e.clientX));
      }}
      onPointerMove={(e) => {
        if (dragging) setDragRatio(ratioFromPointer(e.clientX));
      }}
      onPointerUp={(e) => commit(ratioFromPointer(e.clientX))}
      onPointerCancel={() => setDragRatio(null)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(time === "day" ? "night" : "day");
        } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          const rtl =
            trackRef.current &&
            getComputedStyle(trackRef.current).direction === "rtl";
          const towardsEnd = rtl ? e.key === "ArrowLeft" : e.key === "ArrowRight";
          onChange(towardsEnd ? "night" : "day");
        }
      }}
    >
      <span className={`dn-end${time === "day" ? " active" : ""}`}>
        <IconSun /> {labels.daySlot}
      </span>
      <span className={`dn-end${time === "night" ? " active" : ""}`}>
        <IconMoon /> {labels.nightSlot}
      </span>
      <span
        className="dn-thumb"
        style={{ insetInlineStart: `calc(5px + ${ratio} * (100% - 52px))` }}
        aria-hidden="true"
      >
        <span className="dn-arrow">{ratio > 0.5 ? "←" : "→"}</span>
      </span>
    </div>
  );
}

/** Gallery with the day↔night slider and category tabs. */
export function GallerySection({
  images,
  labels,
}: {
  images: readonly GalleryImage[];
  labels: Labels;
}) {
  const [time, setTime] = useState<"day" | "night">("day");
  const [category, setCategory] = useState<"pool" | "interiors" | "views">("pool");

  const tabs = [
    { key: "pool" as const, label: labels.tabPool },
    { key: "interiors" as const, label: labels.tabInteriors },
    { key: "views" as const, label: labels.tabViews },
  ];

  // Show the active category with shots matching the day/night slider first,
  // so the grid always has content even when a category has one shot per time.
  const shown = images
    .filter((img) => img.category === category)
    .slice()
    .sort((a, b) => (a.time === time ? -1 : 0) - (b.time === time ? -1 : 0));

  return (
    <>
      <DayNightSlider time={time} onChange={setTime} labels={labels} />

      <div className="tab-row" style={{ marginTop: "var(--space-4)" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={category === t.key ? "active" : ""}
            onClick={() => setCategory(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="gallery-grid">
        {shown.map((img) => (
          <figure key={img.src} className="gallery-item" style={{ margin: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} alt={img.alt} loading="lazy" />
            <span className="gallery-badge">
              {img.time === "day" ? <IconSun /> : <IconMoon />}
              {img.time === "day" ? labels.daySlot : labels.nightSlot}
            </span>
          </figure>
        ))}
      </div>
    </>
  );
}

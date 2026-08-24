"use client";

import { useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { IconMoon, IconSun } from "@/components/Icons";

type GalleryEntry = {
  category: "pool" | "interiors" | "views";
  alt: string;
  day: string;
  /** Absent = plain photo without the day/night comparison. */
  night?: string;
  /** Panorama — spans the full gallery width at a wider aspect ratio. */
  wide?: boolean;
};

type GalleryPair = GalleryEntry & { night: string };

type Labels = Pick<
  Dictionary,
  "daySlot" | "nightSlot" | "tabPool" | "tabInteriors" | "tabViews" | "galleryDragHint"
>;

/**
 * Before/after comparison on the photo itself: the day and night shots of the
 * same angle are stacked, and an arrow handle dragged across the image wipes
 * between them. Positions are physical (left→right) — photo content isn't
 * language-directional — with day anchored on the left.
 */
function DayNightCompare({
  pair,
  labels,
}: {
  pair: GalleryPair;
  labels: Pick<Labels, "daySlot" | "nightSlot">;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(0.5); // 0 = all day, 1 = all night
  const [dragging, setDragging] = useState(false);

  function posFromPointer(clientX: number): number {
    const el = boxRef.current;
    if (!el) return pos;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  return (
    <div
      ref={boxRef}
      className={`compare${dragging ? " dragging" : ""}`}
      role="slider"
      aria-label={`${labels.daySlot} / ${labels.nightSlot}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos * 100)}
      tabIndex={0}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
        setPos(posFromPointer(e.clientX));
      }}
      onPointerMove={(e) => {
        if (dragging) setPos(posFromPointer(e.clientX));
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 0.1));
        if (e.key === "ArrowRight") setPos((p) => Math.min(1, p + 0.1));
      }}
    >
      {/* Base layer: day. Top layer: night, clipped to the right of the divider. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={pair.day} alt={pair.alt} draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={pair.night}
        alt=""
        draggable={false}
        className="compare-top"
        style={{ clipPath: `inset(0 0 0 ${pos * 100}%)` }}
      />

      <span className="gallery-badge compare-label-day" style={{ opacity: pos > 0.08 ? 1 : 0 }}>
        <IconSun /> {labels.daySlot}
      </span>
      <span className="gallery-badge compare-label-night" style={{ opacity: pos < 0.92 ? 1 : 0 }}>
        <IconMoon /> {labels.nightSlot}
      </span>

      <div className="compare-divider" style={{ left: `${pos * 100}%` }} aria-hidden="true">
        <span className="compare-knob">
          <span>‹</span>
          <span>›</span>
        </span>
      </div>
    </div>
  );
}

/** Gallery: category tabs; entries with a night shot get the on-image wipe. */
export function GallerySection({
  pairs,
  labels,
}: {
  pairs: readonly GalleryEntry[];
  labels: Labels;
}) {
  const [category, setCategory] = useState<"pool" | "interiors" | "views">("pool");

  const tabs = [
    { key: "pool" as const, label: labels.tabPool },
    { key: "interiors" as const, label: labels.tabInteriors },
    { key: "views" as const, label: labels.tabViews },
  ];

  const shown = pairs.filter((p) => p.category === category);
  const hasComparison = shown.some((p) => p.night);

  return (
    <>
      <div className="tab-row">
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

      <p className="compare-hint" style={hasComparison ? undefined : { visibility: "hidden" }}>
        {labels.galleryDragHint}
      </p>

      <div className={`gallery-grid${shown.length === 1 ? " single" : ""}`}>
        {shown.map((entry) =>
          entry.night ? (
            <DayNightCompare
              key={entry.day}
              pair={entry as GalleryPair}
              labels={labels}
            />
          ) : (
            <figure
              key={entry.day}
              className={`compare plain${entry.wide ? " wide" : ""}`}
              style={{ margin: 0 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={entry.day} alt={entry.alt} draggable={false} />
            </figure>
          )
        )}
      </div>
    </>
  );
}

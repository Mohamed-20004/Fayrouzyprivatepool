"use client";

import { useState } from "react";
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

/** Gallery with the design's Day/Night toggle and category tabs. */
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

  // Show the active category with shots matching the Day/Night toggle first,
  // so the grid always has content even when a category has one shot per time.
  const shown = images
    .filter((img) => img.category === category)
    .slice()
    .sort((a, b) => (a.time === time ? -1 : 0) - (b.time === time ? -1 : 0));

  return (
    <>
      <div className="seg-toggle" role="group">
        <button
          type="button"
          className={time === "day" ? "active" : ""}
          onClick={() => setTime("day")}
        >
          <IconSun /> {labels.daySlot}
        </button>
        <button
          type="button"
          className={time === "night" ? "active" : ""}
          onClick={() => setTime("night")}
        >
          <IconMoon /> {labels.nightSlot}
        </button>
      </div>

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

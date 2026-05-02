"use client";

import { useState } from "react";
import {
  FAMILY_GLYPH,
  FAMILY_LABELS,
  type SourceFamily,
} from "@/lib/source-family";

export function Thumbnail({
  src,
  alt,
  family,
  isPaper,
  className,
}: {
  src?: string;
  alt: string;
  family: SourceFamily;
  isPaper: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={`thumb thumb-fallback fam-${family} ${isPaper ? "is-paper" : "is-news"} ${className ?? ""}`}
      >
        <div className="thumb-fb-glyph">{FAMILY_GLYPH[family]}</div>
        <div className="thumb-fb-label">{FAMILY_LABELS[family]}</div>
      </div>
    );
  }
  return (
    <div className={`thumb ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

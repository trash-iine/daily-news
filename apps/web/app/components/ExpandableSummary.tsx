"use client";

import { useState } from "react";

export function ExpandableSummary({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((v) => !v);
  return (
    <p
      className={`ed-summary${expanded ? " ed-summary--expanded" : ""}`}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
    >
      {text}
    </p>
  );
}

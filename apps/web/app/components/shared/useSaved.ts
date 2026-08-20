"use client";
import { useCallback, useEffect, useState } from "react";

const KEY = "dn:saved";

export function useSaved(): {
  saved: Set<string>;
  toggle: (id: string) => void;
} {
  const [saved, setSaved] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSaved(new Set(JSON.parse(raw) as string[]));
    } catch {}
  }, []);

  const toggle = useCallback((id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }, []);

  return { saved, toggle };
}

"use client";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode };

export function ExternalLink({ onClick, href, children, ...rest }: Props) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!href) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    e.preventDefault();
    window.location.href = href;
  };
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      onClick={handleClick}
      {...rest}
    >
      {children}
    </a>
  );
}

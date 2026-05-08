"use client";
import type { CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

const baseText: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 14,
  lineHeight: 1.7,
  color: "inherit",
  wordBreak: "break-word",
};

export function SummaryMarkdown({ source }: { source: string }) {
  return (
    <div style={baseText}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        urlTransform={(url) => {
          const trimmed = url.trim().toLowerCase();
          if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:")) return "";
          return url;
        }}
        components={{
          h1: ({ children }) => (
            <h1 style={{ fontSize: 16, fontWeight: 600, margin: "10px 0 6px", lineHeight: 1.4 }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: "10px 0 6px", lineHeight: 1.4 }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ fontSize: 14.5, fontWeight: 600, margin: "8px 0 4px", lineHeight: 1.4 }}>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 style={{ fontSize: 14, fontWeight: 600, margin: "8px 0 4px", lineHeight: 1.4 }}>
              {children}
            </h4>
          ),
          p: ({ children }) => <p style={{ margin: "0 0 8px" }}>{children}</p>,
          ul: ({ children }) => (
            <ul style={{ margin: "0 0 8px", paddingLeft: 20 }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ margin: "0 0 8px", paddingLeft: 20 }}>{children}</ol>
          ),
          li: ({ children }) => <li style={{ margin: "2px 0" }}>{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              style={{ color: "var(--fg)", textDecoration: "underline" }}
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={typeof src === "string" ? src : undefined}
              alt={alt ?? ""}
              style={{
                maxWidth: "100%",
                height: "auto",
                borderRadius: 6,
                display: "block",
                margin: "8px 0",
              }}
            />
          ),
          code: ({ children }) => (
            <code
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
                padding: "1px 5px",
                borderRadius: 4,
                background: "color-mix(in oklch, var(--fg) 8%, transparent)",
              }}
            >
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
                padding: 10,
                borderRadius: 6,
                background: "color-mix(in oklch, var(--fg) 6%, transparent)",
                overflowX: "auto",
                margin: "8px 0",
                lineHeight: 1.5,
              }}
            >
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                margin: "8px 0",
                padding: "2px 12px",
                borderLeft: "3px solid var(--border)",
                color: "var(--fg-muted)",
              }}
            >
              {children}
            </blockquote>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}

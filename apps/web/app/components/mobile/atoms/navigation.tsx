"use client";

export type TabId = "today" | "saved" | "recap";

export function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  const tabs: { id: TabId; glyph: string; label: string }[] = [
    { id: "today", glyph: "◧", label: "Today" },
    { id: "saved", glyph: "★", label: "Saved" },
    { id: "recap", glyph: "▤", label: "Recap" },
  ];
  return (
    <div
      style={{
        flexShrink: 0,
        paddingTop: 8,
        paddingBottom: "max(22px, env(safe-area-inset-bottom))",
        paddingLeft: 12,
        paddingRight: 12,
        display: "grid",
        gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
        gap: 4,
        background: "color-mix(in oklch, var(--bg-elev) 92%, transparent)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "0.5px solid var(--border)",
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            background: "none",
            border: 0,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            padding: "6px 0",
            color: active === t.id ? "var(--fg)" : "var(--fg-faint)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1, fontFamily: "var(--font-mono)" }}>{t.glyph}</span>
          <span style={{ fontSize: 10, fontWeight: 500 }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

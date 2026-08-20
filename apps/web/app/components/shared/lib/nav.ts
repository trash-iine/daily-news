/** アプリ全体のトップレベルナビ。mobile は下部 TabBar、desktop は左サイドバーとして描く。 */

export type TabId = "today" | "saved" | "recap";

export interface NavItem {
  id: TabId;
  glyph: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "today", glyph: "◧", label: "Today" },
  { id: "saved", glyph: "★", label: "Saved" },
  { id: "recap", glyph: "▤", label: "Recap" },
];

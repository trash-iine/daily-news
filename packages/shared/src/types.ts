export type ItemKind = "news" | "paper";

export interface BaseItem {
  id: string;
  kind: ItemKind;
  title: string;
  url: string;
  summary: string;
  tags: string[];
  score: number;
  source: string;
  publishedAt: string;
  fetchedAt: string;
  thumbnail?: string;
}

export interface DailyBundle {
  date: string;
  generatedAt: string;
  items: BaseItem[];
}

export interface DailyIndex {
  dates: string[];
  updatedAt: string;
}

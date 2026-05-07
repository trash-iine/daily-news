import { BIG_TAG_GROUPS, type BigTagGroup } from "@daily-news/shared";

export type TagCategory = BigTagGroup | "default";

export const tagCategory = (raw: string): TagCategory =>
  BIG_TAG_GROUPS[String(raw).toLowerCase().trim()] ?? "default";

export const tagCatClass = (t: string): string => `tag-cat-${tagCategory(t)}`;

export type TagCategory =
  | "ai"
  | "rust"
  | "python"
  | "lang"
  | "theory"
  | "algo"
  | "hw"
  | "web"
  | "devops"
  | "default";

export const tagCategory = (raw: string): TagCategory => {
  const t = String(raw).toLowerCase().trim();
  if (/(claude|gpt|llm|agent|ai$|^ai|openai|anthropic|copilot|cursor|prompt|rag|gemini|mcp|skill)/i.test(t))
    return "ai";
  if (t === "rust" || /^rust[-/]/.test(t)) return "rust";
  if (t === "python" || /^py($|thon|test|pi)/.test(t)) return "python";
  if (/(typescript|javascript|^js$|^ts$|golang|^go$|kotlin|swift|ruby|java$|c\+\+|csharp|c#)/.test(t))
    return "lang";
  if (/(np[- ]?hard|np[- ]?complete|complexity|priority|theore|p\s*=\s*np|polynomial)/i.test(t))
    return "theory";
  if (/(combinator|algorithm|graph|optimization|approximat|parameteriz|tree|subgraph)/i.test(t))
    return "algo";
  if (/(キーボード|keyboard|kicad|pcb|hardware|firmware|qmk|zmk|電子|半田|3dprint|raspberry|arduino|esp32)/i.test(t))
    return "hw";
  if (/(react|vue|svelte|next|frontend|css|html|tailwind|web|browser)/i.test(t)) return "web";
  if (/(docker|kubernetes|k8s|aws|gcp|azure|ci\/cd|github action|terraform|infra|deploy|server)/i.test(t))
    return "devops";
  return "default";
};

export const tagCatClass = (t: string): string => `tag-cat-${tagCategory(t)}`;

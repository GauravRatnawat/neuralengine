import type { ReactNode } from "react";
import { createElement } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return createElement("strong", { key }, part.slice(2, -2));
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return createElement("code", { key }, part.slice(1, -1));
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return createElement("em", { key }, part.slice(1, -1));
    }
    return part || null;
  });
}

export function parseMarkdown(text: string): Array<{ type: "p"; nodes: ReactNode[] }> {
  if (!text) return [];
  return text
    .split(/\n\n+/)
    .filter(Boolean)
    .map((para, i) => ({
      type: "p" as const,
      nodes: renderInline(para.replace(/\n/g, " "), `p${i}`),
    }));
}

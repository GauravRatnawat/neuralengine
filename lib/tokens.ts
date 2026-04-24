import { MODELS } from "./models";

export function estimateTokens(text: string): number {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  return Math.max(words, Math.round(chars / 3.8));
}

export interface Cost {
  inCost: number;
  outCost: number;
  total: number;
}

export function costFor(modelId: string, inTok: number, outTok: number): Cost {
  const m = MODELS.find(x => x.id === modelId);
  if (!m) return { inCost: 0, outCost: 0, total: 0 };
  const inCost = (inTok / 1_000_000) * m.inPrice;
  const outCost = (outTok / 1_000_000) * m.outPrice;
  return { inCost, outCost, total: inCost + outCost };
}

export function fmtCost(v: number): string {
  if (v === 0) return "$0.0000";
  if (v < 0.001) return "$" + v.toFixed(6);
  if (v < 1) return "$" + v.toFixed(4);
  return "$" + v.toFixed(3);
}

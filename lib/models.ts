export type Provider = "anthropic" | "openai";

export interface ModelConfig {
  id: string;
  name: string;
  short: string;
  provider: Provider;
  ctx: string;
  inPrice: number;
  outPrice: number;
}

export const MODELS: ModelConfig[] = [
  { id: "claude-opus-4-7",           name: "Claude Opus 4",      short: "opus-4",     provider: "anthropic", ctx: "200K", inPrice: 15.00, outPrice: 75.00 },
  { id: "claude-sonnet-4-6",         name: "Claude Sonnet 4.6",  short: "sonnet-4.6", provider: "anthropic", ctx: "200K", inPrice: 3.00,  outPrice: 15.00 },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5",   short: "haiku-4.5",  provider: "anthropic", ctx: "200K", inPrice: 0.80,  outPrice: 4.00  },
  { id: "gpt-4o",                    name: "GPT-4o",             short: "gpt-4o",     provider: "openai",    ctx: "128K", inPrice: 2.50,  outPrice: 10.00 },
  { id: "gpt-4o-mini",               name: "GPT-4o mini",        short: "4o-mini",    provider: "openai",    ctx: "128K", inPrice: 0.15,  outPrice: 0.60  },
];

export const PROVIDERS: Record<Provider, { label: string; dot: string }> = {
  anthropic: { label: "Anthropic", dot: "#c05621" },
  openai:    { label: "OpenAI",    dot: "#2f6e4e" },
};

export const DEFAULT_MODEL = "claude-sonnet-4-6";

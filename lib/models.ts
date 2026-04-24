export type Provider = "anthropic" | "openai" | "google";

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
  // Anthropic — Claude 4
  { id: "claude-opus-4-7",              name: "Claude Opus 4",        short: "opus-4",       provider: "anthropic", ctx: "200K", inPrice: 15.00, outPrice: 75.00 },
  { id: "claude-sonnet-4-6",            name: "Claude Sonnet 4.6",    short: "sonnet-4.6",   provider: "anthropic", ctx: "200K", inPrice: 3.00,  outPrice: 15.00 },
  { id: "claude-haiku-4-5-20251001",    name: "Claude Haiku 4.5",     short: "haiku-4.5",    provider: "anthropic", ctx: "200K", inPrice: 0.80,  outPrice: 4.00  },
  // Anthropic — Claude 3.x
  { id: "claude-3-5-sonnet-20241022",   name: "Claude 3.5 Sonnet",    short: "3.5-sonnet",   provider: "anthropic", ctx: "200K", inPrice: 3.00,  outPrice: 15.00 },
  { id: "claude-3-5-haiku-20241022",    name: "Claude 3.5 Haiku",     short: "3.5-haiku",    provider: "anthropic", ctx: "200K", inPrice: 0.80,  outPrice: 4.00  },
  { id: "claude-3-opus-20240229",       name: "Claude 3 Opus",        short: "3-opus",       provider: "anthropic", ctx: "200K", inPrice: 15.00, outPrice: 75.00 },
  { id: "claude-3-haiku-20240307",      name: "Claude 3 Haiku",       short: "3-haiku",      provider: "anthropic", ctx: "200K", inPrice: 0.25,  outPrice: 1.25  },
  // OpenAI — GPT-4o
  { id: "gpt-4o",                       name: "GPT-4o",               short: "gpt-4o",       provider: "openai",    ctx: "128K", inPrice: 2.50,  outPrice: 10.00 },
  { id: "gpt-4o-mini",                  name: "GPT-4o mini",          short: "4o-mini",      provider: "openai",    ctx: "128K", inPrice: 0.15,  outPrice: 0.60  },
  // OpenAI — o-series
  { id: "o3",                           name: "o3",                   short: "o3",           provider: "openai",    ctx: "200K", inPrice: 10.00, outPrice: 40.00 },
  { id: "o3-mini",                      name: "o3-mini",              short: "o3-mini",      provider: "openai",    ctx: "200K", inPrice: 1.10,  outPrice: 4.40  },
  { id: "o1",                           name: "o1",                   short: "o1",           provider: "openai",    ctx: "200K", inPrice: 15.00, outPrice: 60.00 },
  { id: "o1-mini",                      name: "o1-mini",              short: "o1-mini",      provider: "openai",    ctx: "128K", inPrice: 3.00,  outPrice: 12.00 },
  { id: "gpt-4-turbo",                  name: "GPT-4 Turbo",          short: "gpt-4t",       provider: "openai",    ctx: "128K", inPrice: 10.00, outPrice: 30.00 },
  // Google — Gemini
  { id: "gemini-2.0-flash",             name: "Gemini 2.0 Flash",     short: "gem-flash-2",  provider: "google",    ctx: "1M",   inPrice: 0.10,  outPrice: 0.40  },
  { id: "gemini-1.5-pro",               name: "Gemini 1.5 Pro",       short: "gem-1.5-pro",  provider: "google",    ctx: "2M",   inPrice: 1.25,  outPrice: 5.00  },
  { id: "gemini-1.5-flash",             name: "Gemini 1.5 Flash",     short: "gem-1.5-flash",provider: "google",    ctx: "1M",   inPrice: 0.075, outPrice: 0.30  },
];

export const PROVIDERS: Record<Provider, { label: string; dot: string }> = {
  anthropic: { label: "Anthropic", dot: "#c05621" },
  openai:    { label: "OpenAI",    dot: "#2f6e4e" },
  google:    { label: "Google",    dot: "#1a73e8" },
};

export const DEFAULT_MODEL = "claude-sonnet-4-6";

# promptdiff — neuralengine.dev

Compare two LLM prompts side-by-side. See token counts, cost delta, and actual model outputs instantly.

**Live at:** https://neuralengine.dev

---

## What it does

- Paste two prompts (system + user), pick a model
- See live token count and estimated cost per prompt as you type
- Run both against the real API — outputs appear side by side
- Cost delta strip shows actual cost difference after each run
- Shareable URL — encode the full prompt state into a link

## Models supported

| Model | Provider | Input / 1M | Output / 1M |
|---|---|---|---|
| Claude Sonnet 4.5 | Anthropic | $3.00 | $15.00 |
| Claude Haiku 4.5 | Anthropic | $0.80 | $4.00 |
| Claude Opus 4.5 | Anthropic | $15.00 | $75.00 |
| GPT-4o | OpenAI | $2.50 | $10.00 |
| GPT-4o mini | OpenAI | $0.15 | $0.60 |
| GPT-4.1 | OpenAI | $2.00 | $8.00 |

---

## Local development

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Deploy to Vercel

```bash
npm install -g vercel
vercel deploy
# point neuralengine.dev → vercel project in DNS settings
```

Or push to GitHub and import the repo at vercel.com — zero config needed.

---

## Updating model pricing

Edit `lib/models.ts`. All pricing lives in one place:

```ts
"claude-sonnet-4-5": {
  label: "Claude Sonnet 4.5",
  provider: "anthropic",
  inputPer1M: 3.0,   // ← update here
  outputPer1M: 15.0, // ← update here
  color: "#e8633a",
},
```

---

## Architecture

```
app/
  layout.tsx          root layout, fonts, metadata
  page.tsx            main page — state orchestration
  globals.css         design tokens, base styles

components/
  Header.tsx          logo + version
  KeysRow.tsx         API key inputs (saved to localStorage)
  ModelSelector.tsx   model toggle buttons
  PromptEditor.tsx    system + user textarea with token/cost pill
  CostStrip.tsx       A vs B cost comparison bar
  ActionsBar.tsx      run / share / clear buttons
  OutputPanel.tsx     single output display with latency + token count
  SectionLabel.tsx    reusable section heading

lib/
  models.ts           model config + pricing table (edit to update prices)
  tokens.ts           token counting (Claude API + approximation fallback)
  api.ts              Anthropic + OpenAI API wrappers
  share.ts            URL state encode/decode for shareable links
  storage.ts          localStorage helpers for API keys
```

---

## v2 roadmap

- [ ] Auth (Clerk) + Supabase for saved comparisons
- [ ] Run history with total cost tracking
- [ ] Fan-out: one prompt vs 3–4 models at once
- [ ] Export results as CSV / JSON
- [ ] Proxy mode (no BYOK required for Pro tier)
- [ ] Team workspaces

---

## License

MIT

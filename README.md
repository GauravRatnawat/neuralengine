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

See [model list and prices](lib/models.ts).

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

Edit prices in [lib/models.ts](lib/models.ts).

---

## Architecture

[app/page.tsx](app/page.tsx) holds page state and UI. [ModelPicker.tsx](components/ModelPicker.tsx) picks model.
[lib/](lib/) holds model prices, token math, API calls, diff, text render, and share links.

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

# ⚡ AI-FlashView

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Daily data refresh](https://img.shields.io/badge/data-refreshed%20daily-22d3ee.svg)](.github/workflows/daily.yml)

**Which AI to use, for what, at what price — in 30 seconds.**

AI-FlashView is an open-source dashboard for the general public and small businesses — the people who understand neither GPQA nor $/million tokens. It is not yet another benchmark aggregator: it is a **translator**. Technical benchmarks become simple scores per everyday use case (writing, code, web search, document analysis, creativity), alongside real API prices *and* subscription prices. Bilingual FR/EN, French first.

A free tool by [romande-ia.ch](https://romande-ia.ch) (IAtelier).

## How it works

```
pipeline/build.mjs  (Node 20+, native fetch, zero npm dependencies)
        │
        ├── OpenRouter public API ──→ API prices + context windows (LiteLLM JSON as fallback)
        ├── Artificial Analysis API ─→ benchmark data (intelligence/coding indexes, MMLU-Pro, …)
        ├── data/models.json ────────→ curated model list + editorial fields
        ├── data/subscriptions.json ─→ subscription prices (maintained by hand, verified weekly)
        └── data/weights.json ───────→ transparent weights per use case
        ▼
data/latest.json  +  data/history/YYYY-MM-DD.json
        ▼
site/index.html   (static, dependency-free — works from file:// with an inline fallback)
```

A GitHub Actions workflow ([daily.yml](.github/workflows/daily.yml)) rebuilds the data every day at ~06:00 Europe/Zurich and commits only when something changed.

## Scoring methodology

Each model gets a **score out of 100 per use case**, computed as a weighted average of public benchmark results. The weights live in [`data/weights.json`](data/weights.json) — versioned, transparent, and open to criticism and pull requests. That's the point.

- Artificial Analysis indexes (~0–100) are used as-is; AA benchmarks (0–1) are scaled ×100.
- No min-max normalization over the cohort: scores stay stable day after day and never produce artificial 0/100.
- Context window is log-normalized between fixed anchors (16K → 0, 2M → 100).
- A documented **editorial share** (web access, creativity) is part of the recipe — assumed, not hidden.
- Missing data is never invented: a missing field renormalizes the remaining weights; an unknown model gets `null` and an explicit log line.
- Honest scores, even when they hurt: the Swiss Apertus models score very low on raw benchmarks — that's the dashboard's credibility, and their case rests on sovereignty, transparency and price, not raw power.

Badges: 🏆 top quality (best score) · 💎 best value (score³/blended price, score ≥ 75, free models excluded) · 🪙 budget pick (cheapest with score ≥ 60, free models welcome).

## Run locally

```bash
# 1. Get a free API key at https://artificialanalysis.ai/data-api
# 2. Put it in .env (never committed):  AA_API_KEY=your_key
node --env-file=.env pipeline/build.mjs

# Without a key the build still succeeds, keeping the demo scores
# from models.json and flagging the output with "scores_demo": true.
node pipeline/build.mjs

# Then open site/index.html (works from file://), or serve the repo root:
python3 -m http.server 8123   # → http://localhost:8123/site/
```

## Data sources & attribution

- **[Artificial Analysis](https://artificialanalysis.ai)** — benchmark data (intelligence, coding, agentic evaluations…). This project uses the Artificial Analysis Data API and displays only aggregated per-use-case scores, never their raw datasets. **Attribution required and gladly given: benchmark data © Artificial Analysis.**
- **[OpenRouter](https://openrouter.ai)** — real-time API prices and context windows (public endpoint).
- **[LiteLLM](https://github.com/BerriAI/litellm)** — price fallback.
- **[Apertus](https://huggingface.co/swiss-ai)** (EPFL / ETH Zurich / CSCS) — entered manually; free chat at [chat.publicai.co](https://chat.publicai.co).
- Subscription prices — maintained by hand in [`data/subscriptions.json`](data/subscriptions.json) (no public API exists), each entry carrying a `verified` flag and date.

## Repository layout

| Path | Role |
|---|---|
| `data/models.json` | Curated model list: OpenRouter ids, Artificial Analysis slugs, editorial fields, fallbacks |
| `data/subscriptions.json` | Subscription/free-chat prices, maintained by hand |
| `data/weights.json` | Scoring weights per use case — the transparent heart of the product |
| `data/latest.json` | **Generated** — never edit by hand |
| `data/history/` | Daily snapshots |
| `pipeline/build.mjs` | The whole pipeline, zero dependencies |
| `site/` | Static demo page (GitHub Pages ready) |

## License

[MIT](LICENSE) © 2026 Médéric Morin (IAtelier)

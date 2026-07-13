#!/usr/bin/env node
/**
 * AI-FlashView data pipeline — Node 20+, native fetch, ZERO npm dependencies.
 *
 * Sources:
 *   1. Prices/context : OpenRouter public API (no key) → fallback LiteLLM JSON → fallback models.json
 *   2. Benchmarks     : Artificial Analysis Data API (AA_API_KEY) → without key: models.json scores + scores_demo:true
 *
 * Rules: a failing source NEVER crashes the run — log, degrade, continue.
 *        Missing data is never invented: null + explicit log.
 *
 * Run locally: node --env-file=.env pipeline/build.mjs
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "data");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/models";
const LITELLM_URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";
const AA_URL = "https://artificialanalysis.ai/api/v2/data/llms/models";

const USAGES = ["redaction", "code", "recherche", "docs", "crea"];

const log = (...a) => console.log("[build]", ...a);
const warn = (...a) => console.warn("[build:WARN]", ...a);
const fail = (...a) => console.error("[build:ERROR]", ...a);

async function fetchJson(url, { headers = {}, timeoutMs = 30_000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(rel) {
  return JSON.parse(await readFile(path.join(DATA_DIR, rel), "utf8"));
}

// ---------- Prices / context ----------

async function fetchOpenRouterPrices() {
  const body = await fetchJson(OPENROUTER_URL);
  const map = new Map();
  for (const m of body.data ?? []) {
    map.set(m.id, {
      in: m.pricing?.prompt != null ? Number(m.pricing.prompt) * 1e6 : null,
      out: m.pricing?.completion != null ? Number(m.pricing.completion) * 1e6 : null,
      context: m.context_length ?? null,
    });
  }
  log(`OpenRouter: ${map.size} models fetched`);
  return map;
}

async function fetchLiteLLMPrices() {
  const body = await fetchJson(LITELLM_URL);
  const map = new Map();
  for (const [key, m] of Object.entries(body)) {
    if (typeof m !== "object" || m === null) continue;
    map.set(key, {
      in: m.input_cost_per_token != null ? Number(m.input_cost_per_token) * 1e6 : null,
      out: m.output_cost_per_token != null ? Number(m.output_cost_per_token) * 1e6 : null,
      context: m.max_input_tokens ?? m.max_tokens ?? null,
    });
  }
  log(`LiteLLM fallback: ${map.size} entries fetched`);
  return map;
}

function liteLLMLookup(map, openrouterId) {
  // LiteLLM keys models either as "openrouter/<id>", as the bare "<id>", or as the model name alone.
  return (
    map.get(`openrouter/${openrouterId}`) ??
    map.get(openrouterId) ??
    map.get(openrouterId.split("/")[1]) ??
    null
  );
}

// ---------- Benchmarks (Artificial Analysis) ----------

async function fetchAAModels(apiKey) {
  const body = await fetchJson(AA_URL, { headers: { "x-api-key": apiKey } });
  const map = new Map();
  for (const m of body.data ?? []) map.set(m.slug, m);
  log(`Artificial Analysis: ${map.size} models fetched`);
  return map;
}

// Metric extraction. AA indexes are ~0-100 and used as-is; AA benchmarks are 0-1 → ×100.
// Editorial metrics come from models.json; context_log from the resolved context window.
const AA_INDEXES = {
  aa_intelligence_index: "artificial_analysis_intelligence_index",
  aa_coding_index: "artificial_analysis_coding_index",
  aa_math_index: "artificial_analysis_math_index",
};
const AA_BENCHMARKS = new Set([
  "mmlu_pro", "gpqa", "hle", "livecodebench", "scicode", "aime_25",
  "ifbench", "lcr", "tau2", "terminalbench_hard",
]);

function metricValue(metric, { aaModel, editorial, contextTokens, anchors }) {
  if (metric in AA_INDEXES) {
    const v = aaModel?.evaluations?.[AA_INDEXES[metric]];
    return typeof v === "number" ? v : null;
  }
  if (AA_BENCHMARKS.has(metric)) {
    const v = aaModel?.evaluations?.[metric];
    return typeof v === "number" ? v * 100 : null;
  }
  if (metric === "web_access" || metric === "editorial_crea") {
    const v = editorial?.[metric];
    return typeof v === "number" ? v : null;
  }
  if (metric === "context_log") {
    if (typeof contextTokens !== "number" || contextTokens <= 0) return null;
    const lo = Math.log10(anchors.min_tokens);
    const hi = Math.log10(anchors.max_tokens);
    const x = (Math.log10(contextTokens) - lo) / (hi - lo);
    return Math.max(0, Math.min(1, x)) * 100;
  }
  warn(`Unknown metric "${metric}" in weights.json — ignored`);
  return null;
}

// Weighted average with renormalization over non-null components.
function usageScore(weightsForUsage, ctx) {
  let sum = 0;
  let wsum = 0;
  for (const [metric, w] of Object.entries(weightsForUsage)) {
    const v = metricValue(metric, ctx);
    if (v === null) continue;
    sum += v * w;
    wsum += w;
  }
  if (wsum === 0) return null;
  return Math.round(sum / wsum);
}

// ---------- Display helpers ----------

function formatContext(tokens) {
  if (typeof tokens !== "number" || tokens <= 0) return "?";
  if (tokens >= 950_000) return `${Math.round(tokens / 1e6)}M`;
  return `${Math.floor(tokens / 1000)}K`;
}

const blended = (m) => m.in * 0.25 + m.out * 0.75;

// Badges per usage, computed over the full cohort (the site recomputes them per filtered view).
function computeBadges(models) {
  const badges = {};
  for (const usage of USAGES) {
    const scored = models.filter((m) => m.scores && typeof m.scores[usage] === "number");
    const top = [...scored].sort((a, b) => b.scores[usage] - a.scores[usage])[0] ?? null;
    let pool = scored.filter((m) => m.scores[usage] >= 75 && blended(m) > 0);
    if (!pool.length) pool = scored.filter((m) => blended(m) > 0);
    const value =
      [...pool].sort(
        (a, b) =>
          Math.pow(b.scores[usage], 3) / blended(b) - Math.pow(a.scores[usage], 3) / blended(a)
      )[0] ?? null;
    const budget =
      scored.filter((m) => m.scores[usage] >= 60).sort((a, b) => blended(a) - blended(b))[0] ??
      null;
    badges[usage] = { top: top?.id ?? null, value: value?.id ?? null, budget: budget?.id ?? null };
  }
  return badges;
}

// ---------- Main ----------

async function main() {
  const [modelsFile, subsFile, weightsFile] = await Promise.all([
    readJson("models.json"),
    readJson("subscriptions.json"),
    readJson("weights.json"),
  ]);
  const subsByName = new Map(subsFile.subscriptions.map((s) => [s.name, s]));
  const anchors = weightsFile.context_log_anchors;

  // 1. Prices: OpenRouter → LiteLLM → models.json fallback
  let orPrices = null;
  let litellm = null;
  let priceSource = "openrouter";
  try {
    orPrices = await fetchOpenRouterPrices();
  } catch (e) {
    fail(`OpenRouter unreachable (${e.message}) — trying LiteLLM fallback`);
    priceSource = "litellm";
    try {
      litellm = await fetchLiteLLMPrices();
    } catch (e2) {
      fail(`LiteLLM unreachable too (${e2.message}) — using models.json fallback prices`);
      priceSource = "fallback";
    }
  }

  // 2. Benchmarks: AA if key is present, otherwise demo scores from models.json
  const apiKey = process.env.AA_API_KEY;
  let aaModels = null;
  let scoresDemo = false;
  if (!apiKey) {
    warn("AA_API_KEY not set — keeping demo scores from models.json (scores_demo:true)");
    scoresDemo = true;
  } else {
    try {
      aaModels = await fetchAAModels(apiKey);
    } catch (e) {
      fail(`Artificial Analysis unreachable (${e.message}) — demo scores (scores_demo:true)`);
      scoresDemo = true;
    }
  }

  const out = [];
  for (const def of modelsFile.models) {
    // --- price & context ---
    let priceIn = null;
    let priceOut = null;
    let context = null;
    if (def.openrouter_id === null) {
      // Absent from OpenRouter by design (e.g. Apertus): free, context from models.json
      priceIn = def.fallback.price_in;
      priceOut = def.fallback.price_out;
      context = def.fallback.context;
    } else {
      const live =
        orPrices?.get(def.openrouter_id) ??
        (litellm ? liteLLMLookup(litellm, def.openrouter_id) : null);
      if (live && live.in !== null && live.out !== null) {
        priceIn = live.in;
        priceOut = live.out;
        context = live.context ?? def.fallback.context;
      } else {
        warn(
          `${def.id}: "${def.openrouter_id}" not found in ${priceSource === "openrouter" ? "OpenRouter" : "price sources"} — fallback prices from models.json`
        );
        priceIn = def.fallback.price_in;
        priceOut = def.fallback.price_out;
        context = def.fallback.context;
      }
    }

    // --- scores ---
    let scores;
    if (scoresDemo) {
      scores = { ...def.fallback.scores };
    } else {
      const aaModel = aaModels.get(def.aa_slug) ?? null;
      if (!aaModel) {
        fail(
          `${def.id}: AA slug "${def.aa_slug}" NOT FOUND — scores set to null (never invented). Check the mapping table.`
        );
        scores = null;
      } else {
        scores = {};
        const ctx = { aaModel, editorial: def.editorial, contextTokens: context, anchors };
        for (const usage of USAGES) {
          scores[usage] = usageScore(weightsFile.usages[usage], ctx);
          if (scores[usage] === null) warn(`${def.id}: no data at all for usage "${usage}"`);
        }
      }
    }

    // --- subscription ---
    const sub = subsByName.get(def.subscription);
    if (!sub) warn(`${def.id}: subscription "${def.subscription}" not found in subscriptions.json`);

    out.push({
      id: def.id,
      name: def.name,
      provider: def.provider,
      in: Math.round(priceIn * 100) / 100,
      out: Math.round(priceOut * 100) / 100,
      ctx: formatContext(context),
      ctx_tokens: context,
      sub: { fr: def.subscription, en: def.subscription },
      subPrice: sub?.display ?? "0|0",
      sub_url: sub?.url ?? null,
      verified: sub?.verified ?? false,
      verified_date: sub?.verified_date ?? null,
      tags: def.tags,
      scores,
    });
  }

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const latest = {
    updated_at: now.toISOString(),
    updated: day,
    scores_demo: scoresDemo,
    sources: {
      prices: priceSource,
      benchmarks: scoresDemo ? "demo (models.json)" : "Artificial Analysis",
      attribution: "Benchmark data: Artificial Analysis (https://artificialanalysis.ai)",
    },
    badges: computeBadges(out),
    models: out,
  };

  await mkdir(path.join(DATA_DIR, "history"), { recursive: true });
  const json = JSON.stringify(latest, null, 2) + "\n";
  await writeFile(path.join(DATA_DIR, "latest.json"), json);
  await writeFile(path.join(DATA_DIR, "history", `${day}.json`), json);

  log(
    `OK — ${out.length} models · prices:${priceSource} · scores_demo:${scoresDemo} → data/latest.json + data/history/${day}.json`
  );
}

main().catch((e) => {
  // Only unrecoverable local errors (unreadable data files…) land here.
  fail(e.stack ?? String(e));
  process.exit(1);
});

// AI-FlashView — aperçu en console, avec votre propre clé Artificial Analysis.
// 2026-11-23 ≈16:05 (Europe/Zurich) — Claude (projet Romande-IA) — Anthropic, Claude Opus 5.5
// Usage : AA_API_KEY=votre_cle npm run apercu            (usage général)
//         AA_API_KEY=votre_cle npm run apercu -- legal   (general, finance, legal, strategy, engineering, health)
// Le script n’écrit rien sur disque : il affiche les données d’Artificial Analysis, il ne les republie pas.

import { buildFlashView, type AAModel } from '../src/flashview-build'
import { FLASHVIEW_USAGES, blendedPrice, formatUsd } from '../src/flashview'

const AA_URL = 'https://artificialanalysis.ai/api/v2/language/models/free'

interface AAPage {
  intelligence_index_version?: string | number | null
  pagination?: { total_pages?: number; has_more?: boolean }
  data?: AAModel[]
}

async function main() {
  const key = process.env.AA_API_KEY
  if (!key) {
    console.error('Clé manquante. Lancez : AA_API_KEY=votre_cle npm run apercu')
    process.exit(1)
  }

  const raw: AAModel[] = []
  let indexVersion: string | null = null
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`${AA_URL}?page=${page}`, {
      headers: { 'x-api-key': key },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`Artificial Analysis a répondu HTTP ${res.status}`)
    const body = (await res.json()) as AAPage
    const items = body.data ?? []
    if (body.intelligence_index_version != null) indexVersion = String(body.intelligence_index_version)
    raw.push(...items)
    const p = body.pagination
    const hasNext = p?.has_more ?? (p?.total_pages ? page < p.total_pages : items.length >= 200)
    if (!hasNext || items.length === 0) break
  }

  const data = buildFlashView(raw, { indexVersion })
  const usage = FLASHVIEW_USAGES.find((u) => u.id === process.argv[2]) ?? FLASHVIEW_USAGES[0]
  const rows = [...data.models].sort((a, b) => (b.scores[usage.id] ?? -1) - (a.scores[usage.id] ?? -1))

  console.log(`AI-FlashView · ${usage.label} · ${rows.length} modèles retenus sur ${raw.length} · indice v${indexVersion ?? '?'}`)
  console.log('Données : Artificial Analysis, https://artificialanalysis.ai\n')
  rows.forEach((m, i) => {
    const name = `${m.name}${m.variant ? ` (${m.variant})` : ''}`
    const score = m.scores[usage.id]
    console.log(
      `${String(i + 1).padStart(2)}. ${name.padEnd(36)} ${m.creator.padEnd(10)} ${score === null ? 'n/m'.padStart(5) : score.toFixed(1).replace('.', ',').padStart(5)}  ${formatUsd(blendedPrice(m)).padStart(9)} par million de jetons`
    )
  })
  console.log(`\nIA suisse (non évaluée par Artificial Analysis) : ${data.swiss.map((s) => s.name).join(', ')}`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})

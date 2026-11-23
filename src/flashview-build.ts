// AI-FlashView — sélection des modèles à partir de l'API gratuite d'Artificial Analysis.
// 2026-11-23 ≈14:55 (Europe/Zurich) — Claude (projet Romande-IA) — Anthropic, Claude Opus 5.5
//
// Fonction pure (pas de réseau, pas de clé) : utilisée par le serveur et par le script de copie de secours.
// Règles, toutes visibles dans la méthodologie de la page :
// - éditeurs suivis : les grands laboratoires listés dans CREATORS, plus tout éditeur suisse ;
// - modèles sortis depuis moins de 6 mois (12 mois si l'éditeur n'a rien de plus récent), notés par AA
//   et vendus à un prix public (sinon une PME ne peut pas s'en servir) ;
// - une « famille » = le nom sans le réglage entre parenthèses ; on garde le réglage au meilleur indice général ;
// - on écarte les modèles dépassés : ceux qu'un autre modèle du même éditeur égale ou bat
//   à la fois en indice général et en prix ;
// - par éditeur : les 2 familles restantes au meilleur indice général, plus la moins chère des autres.
// Aucune donnée n'est inventée : un indice absent reste null.

import { FLASHVIEW_USAGES, blendedPrice, type FlashViewData, type FlashViewModel, type FlashViewRegion } from './flashview'
import { FLASHVIEW_SWISS } from './flashview-swiss'

export interface AAModel {
  id: string
  name: string
  slug: string
  release_date: string | null
  model_creator: { name: string }
  evaluations: Record<string, number | null>
  pricing?: { price_1m_input_tokens?: number | null; price_1m_output_tokens?: number | null } | null
  performance?: { median_output_tokens_per_second?: number | null } | null
}

// Pays = siège de l'éditeur. Les éditeurs absents de cette liste ne sont pas affichés.
const CREATORS: Record<string, { country: string; flag: string; region: FlashViewRegion }> = {
  OpenAI: { country: 'États-Unis', flag: '🇺🇸', region: 'us' },
  Anthropic: { country: 'États-Unis', flag: '🇺🇸', region: 'us' },
  Google: { country: 'États-Unis', flag: '🇺🇸', region: 'us' },
  Meta: { country: 'États-Unis', flag: '🇺🇸', region: 'us' },
  SpaceXAI: { country: 'États-Unis', flag: '🇺🇸', region: 'us' },
  xAI: { country: 'États-Unis', flag: '🇺🇸', region: 'us' },
  Mistral: { country: 'France', flag: '🇫🇷', region: 'eu' },
  DeepSeek: { country: 'Chine', flag: '🇨🇳', region: 'cn' },
  Alibaba: { country: 'Chine', flag: '🇨🇳', region: 'cn' },
  Kimi: { country: 'Chine', flag: '🇨🇳', region: 'cn' },
  'Z AI': { country: 'Chine', flag: '🇨🇳', region: 'cn' },
  MiniMax: { country: 'Chine', flag: '🇨🇳', region: 'cn' },
}

// Tout éditeur dont le nom évoque la Suisse est retenu automatiquement (ex. « Swiss AI Initiative »)
const SWISS_CREATOR = /swiss|epfl|eth z/i
const SWISS = { country: 'Suisse', flag: '🇨🇭', region: 'ch' as FlashViewRegion }

const EFFORT = /^(max|xhigh|high|medium|low|minimal|non-reasoning|reasoning)$/i
const FAMILIES_BY_SCORE = 2
const MONTH_MS = 30.44 * 24 * 3600 * 1000

function splitName(name: string): { family: string; variant: string | null } {
  const m = name.match(/^(.*?)\s*\(([^)]*)\)\s*$/)
  if (!m) return { family: name.trim(), variant: null }
  const first = m[2].split(',')[0].trim()
  return { family: m[1].trim(), variant: EFFORT.test(first) ? first : null }
}

const general = (x: AAModel) => x.evaluations?.artificial_analysis_intelligence_index ?? null

const price = (x: AAModel): number | null => {
  const pin = x.pricing?.price_1m_input_tokens
  const pout = x.pricing?.price_1m_output_tokens
  return pin == null || pout == null ? null : blendedPrice({ price_in: pin, price_out: pout })
}

export function buildFlashView(raw: AAModel[], options: { now?: Date; indexVersion?: string | null } = {}): FlashViewData {
  const now = options.now ?? new Date()
  const byCreator = new Map<string, AAModel[]>()

  for (const x of raw) {
    const creator = x.model_creator?.name ?? ''
    if (!CREATORS[creator] && !SWISS_CREATOR.test(creator)) continue
    if (general(x) === null || !x.release_date || price(x) === null) continue
    const list = byCreator.get(creator) ?? []
    list.push(x)
    byCreator.set(creator, list)
  }

  const models: FlashViewModel[] = []
  for (const [creator, list] of byCreator) {
    const origin = CREATORS[creator] ?? SWISS
    const age = (x: AAModel) => (now.getTime() - new Date(x.release_date as string).getTime()) / MONTH_MS
    let recent = list.filter((x) => age(x) <= 6)
    if (recent.length === 0) recent = list.filter((x) => age(x) <= 12)
    if (recent.length === 0) continue

    // Une famille = un modèle ; on garde son réglage au meilleur indice général
    const families = new Map<string, AAModel>()
    for (const x of recent) {
      const { family } = splitName(x.name)
      const best = families.get(family)
      if (!best || (general(x) as number) > (general(best) as number)) families.set(family, x)
    }
    // Modèles dépassés : un autre modèle du même éditeur fait au moins aussi bien pour au plus le même prix
    const candidates = [...families.values()]
    const undominated = candidates.filter(
      (x) =>
        !candidates.some(
          (y) =>
            y !== x &&
            (general(y) as number) >= (general(x) as number) &&
            (price(y) as number) <= (price(x) as number) &&
            ((general(y) as number) > (general(x) as number) || (price(y) as number) < (price(x) as number))
        )
    )
    const ranked = undominated.sort((a, b) => (general(b) as number) - (general(a) as number))
    const picked = ranked.slice(0, FAMILIES_BY_SCORE)
    const cheapest = ranked.slice(FAMILIES_BY_SCORE).sort((a, b) => (price(a) as number) - (price(b) as number))[0]
    if (cheapest) picked.push(cheapest)

    for (const x of picked) {
      const { family, variant } = splitName(x.name)
      const scores = Object.fromEntries(
        FLASHVIEW_USAGES.map((u) => {
          const v = x.evaluations?.[u.field]
          return [u.id, typeof v === 'number' ? Math.round(v * 10) / 10 : null]
        })
      ) as FlashViewModel['scores']
      models.push({
        id: x.slug,
        name: family,
        variant,
        creator,
        country: origin.country,
        flag: origin.flag,
        region: origin.region,
        release_date: x.release_date,
        scores,
        price_in: x.pricing?.price_1m_input_tokens ?? null,
        price_out: x.pricing?.price_1m_output_tokens ?? null,
        speed: x.performance?.median_output_tokens_per_second != null ? Math.round(x.performance.median_output_tokens_per_second) : null,
      })
    }
  }

  models.sort((a, b) => (b.scores.general ?? -1) - (a.scores.general ?? -1))

  return {
    schema: 2,
    updated_at: now.toISOString(),
    intelligence_index_version: options.indexVersion ?? null,
    models,
    swiss: FLASHVIEW_SWISS,
  }
}

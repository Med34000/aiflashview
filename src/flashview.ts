// AI-FlashView — types et outils partagés (utilisables côté navigateur : aucune clé ici).
// Réécrit le 2026-11-23 ≈14:45 (Europe/Zurich) — Claude (projet Romande-IA) — Anthropic, Claude Opus 5.5
//
// Depuis le 23.11.2026, les données viennent de l'API gratuite d'Artificial Analysis, interrogée
// CÔTÉ SERVEUR par romande-ia.ch (src/lib/flashview-server.ts, clé AA_API_KEY sur le serveur).
// Elles ne sont plus publiées sur GitHub : les conditions d'AA demandent un accord pour toute
// redistribution. Affichage autorisé avec attribution (lien vers artificialanalysis.ai).

export type FlashViewUsageId = 'general' | 'finance' | 'legal' | 'strategy' | 'engineering' | 'health'

export interface FlashViewUsage {
  id: FlashViewUsageId
  label: string
  /** Champ de l'API Artificial Analysis utilisé tel quel */
  field: string
  /** Ce que l'indice mesure, en une phrase simple */
  hint: string
}

// Un usage = un indice publié par Artificial Analysis, affiché tel quel (aucune pondération maison).
export const FLASHVIEW_USAGES: FlashViewUsage[] = [
  { id: 'general', label: 'Usage général', field: 'artificial_analysis_intelligence_index', hint: 'Indice d’intelligence d’Artificial Analysis : un score composite calculé sur plusieurs de leurs tests (détail dans leur méthodologie).' },
  { id: 'finance', label: 'Finance et comptabilité', field: 'artificial_analysis_finance_and_accounting_index', hint: 'Indice « Finance and Accounting » d’Artificial Analysis.' },
  { id: 'legal', label: 'Juridique', field: 'artificial_analysis_legal_index', hint: 'Indice « Legal » d’Artificial Analysis.' },
  { id: 'strategy', label: 'Gestion et stratégie', field: 'artificial_analysis_strategy_and_ops_index', hint: 'Indice « Strategy and Ops » d’Artificial Analysis.' },
  { id: 'engineering', label: 'Ingénierie', field: 'artificial_analysis_engineering_index', hint: 'Indice « Engineering » d’Artificial Analysis.' },
  { id: 'health', label: 'Santé', field: 'artificial_analysis_healthcare_and_medical_index', hint: 'Indice « Healthcare and Medical » d’Artificial Analysis.' },
]

export type FlashViewRegion = 'us' | 'cn' | 'eu' | 'ch' | 'other'

export const FLASHVIEW_REGIONS: { id: 'all' | FlashViewRegion | 'euch'; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'euch', label: '🇨🇭 🇪🇺 Suisse et Europe' },
  { id: 'us', label: '🇺🇸 États-Unis' },
  { id: 'cn', label: '🇨🇳 Chine' },
]

export interface FlashViewModel {
  /** slug Artificial Analysis de la variante retenue */
  id: string
  /** Nom de la famille, sans le réglage (ex. « GPT-6.2 Sol ») */
  name: string
  /** Réglage retenu (ex. « Max », « High ») : celui qui obtient le meilleur indice général */
  variant: string | null
  creator: string
  country: string
  flag: string
  region: FlashViewRegion
  release_date: string | null
  scores: Record<FlashViewUsageId, number | null>
  /** Prix en dollars par million de jetons */
  price_in: number | null
  price_out: number | null
  /** Jetons générés par seconde (médiane AA) */
  speed: number | null
}

export interface FlashViewSwissModel {
  name: string
  developer: string
  released: string
  sizes: string
  license: string
  openness: string
  inputs: string
  context: string
  languages: string
  evaluation: string
  where: { label: string; detail: string; url: string }[]
  sources: { label: string; url: string }[]
  verified: string
}

export interface FlashViewData {
  schema: 2
  /** Date de récupération des données auprès d'Artificial Analysis */
  updated_at: string
  intelligence_index_version: string | null
  models: FlashViewModel[]
  swiss: FlashViewSwissModel[]
  /** true quand Artificial Analysis est injoignable et que la page affiche la copie de secours */
  from_snapshot?: boolean
}

// Prix moyen pondéré « 3 jetons envoyés pour 1 généré » (convention d'Artificial Analysis)
export const blendedPrice = (m: Pick<FlashViewModel, 'price_in' | 'price_out'>): number | null =>
  m.price_in === null || m.price_out === null ? null : (3 * m.price_in + m.price_out) / 4

export const formatDateFr = (iso: string | null | undefined) => {
  if (!iso) return '?'
  const [y, mo, d] = iso.split('T')[0].split('-')
  return `${d}.${mo}.${y}`
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

// « novembre 2026 » : calcul sans Intl, identique côté serveur et navigateur
export const formatMonthFr = (iso: string | null | undefined) => {
  if (!iso) return '?'
  const [y, mo] = iso.split('-')
  const name = MOIS[Number(mo) - 1]
  return name ? `${name} ${y}` : '?'
}

// « 3,00 $ » : deux décimales, virgule, espace insécable avant le symbole
export const formatUsd = (v: number | null) =>
  v === null ? 'non publié' : v === 0 ? 'gratuit' : `${v.toFixed(2).replace('.', ',')}\u00a0$`

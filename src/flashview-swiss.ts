// Modèles suisses affichés dans AI-FlashView.
// 2026-11-23 ≈14:50 (Europe/Zurich) — Claude (projet Romande-IA) — Anthropic, Claude Opus 5.5
//
// Artificial Analysis n'évalue pas Apertus (absent de son API au 23.11.2026) : pas de score comparable.
// On affiche donc une fiche de faits vérifiés, avec leurs sources et la date de vérification.
// Si AA se met à évaluer un modèle suisse, il apparaît automatiquement dans le classement
// (éditeur classé « Suisse » dans flashview-build.ts).
// À revérifier à chaque nouvelle version (Apertus 2.0 annoncé par la presse pour 2027, non confirmé ici).

import type { FlashViewSwissModel } from './flashview'

export const FLASHVIEW_SWISS: FlashViewSwissModel[] = [
  {
    name: 'Apertus 1.5',
    developer: 'Swiss AI Initiative : EPFL, ETH Zurich et Centre suisse de calcul scientifique (CSCS)',
    released: '2026-07-24',
    sizes: '8 et 70 milliards de paramètres',
    license: 'Apache 2.0 : usage commercial autorisé',
    openness: 'Poids du modèle publiés, entraîné uniquement sur des données ouvertes',
    inputs: 'Texte, images et audio en entrée, réponse en texte',
    context: '262 144 jetons (environ 200 000 mots)',
    languages: 'Très multilingue. La première version comptait environ 40 % de données non anglophones, dont le suisse allemand et le romanche.',
    evaluation:
      'Pas encore évalué par Artificial Analysis : aucun score comparable aux autres modèles de ce comparateur. L’équipe annonce des performances comparables aux modèles de taille similaire.',
    where: [
      {
        label: 'Euria (Infomaniak)',
        detail: 'Assistant d’Infomaniak : les requêtes sont traitées sur ses serveurs en Suisse et ne servent pas à entraîner les modèles.',
        url: 'https://www.infomaniak.com/fr/support/faq/2924/decouvrir-euria-et-le-modele-apertus',
      },
      {
        label: 'Swisscom (entreprises)',
        detail: 'Proposé aux clients entreprises via la plateforme Swiss AI de Swisscom (annonce de septembre 2025).',
        url: 'https://www.swisscom.ch/fr/about/news/2025/09/02-apertus.html',
      },
      {
        label: 'Hugging Face',
        detail: 'Téléchargement des poids pour l’installer sur ses propres serveurs, après acceptation de la licence.',
        url: 'https://huggingface.co/swiss-ai/Apertus-v1.5-70B',
      },
    ],
    sources: [
      { label: 'Fiche officielle Apertus 1.5 (Hugging Face)', url: 'https://huggingface.co/swiss-ai/Apertus-v1.5-70B' },
      { label: 'Annonce Apertus 1.5 (CSCS, 24.07.2026)', url: 'https://www.cscs.ch/science/computer-science-hpc/2026/apertus-15-building-the-next-generation-of-open-ai-infrastructure' },
      { label: 'Euria et Apertus (Infomaniak)', url: 'https://www.infomaniak.com/fr/support/faq/2924/decouvrir-euria-et-le-modele-apertus' },
      { label: 'Lancement d’Apertus (Swisscom, 02.09.2025)', url: 'https://www.swisscom.ch/fr/about/news/2025/09/02-apertus.html' },
    ],
    verified: '2026-11-23',
  },
]

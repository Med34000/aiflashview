# AI-FlashView

Quelle IA choisir pour son métier, et à quel prix ? AI-FlashView classe les modèles d’IA récents par usage (général, finance et comptabilité, juridique, gestion et stratégie, ingénierie, santé) selon les indices d’[Artificial Analysis](https://artificialanalysis.ai), avec leur prix d’API et leur vitesse. Il présente aussi l’IA suisse Apertus.

**Le comparateur est en ligne sur [romande-ia.ch/outils/ai-flashview](https://romande-ia.ch/outils/ai-flashview).**

Mis à jour le 2026-11-23 ≈16:05 (Europe/Zurich) — Claude (projet Romande-IA) — Anthropic, Claude Opus 5.5, pour Médéric Morin.

## Ce que contient ce dépôt

- `src/flashview-build.ts` : la sélection des modèles, selon les règles ci-dessous. Fonction pure, sans réseau ni clé.
- `src/flashview.ts` : les types, les usages (l’indice d’Artificial Analysis affiché pour chacun) et les formats d’affichage.
- `src/flashview-swiss.ts` : la fiche vérifiée du modèle suisse Apertus, avec ses sources.
- `scripts/apercu.ts` : un aperçu du classement dans le terminal, avec votre propre clé.
- `site/index.html` : redirige l’ancienne adresse GitHub Pages vers le site.

La page elle-même (Next.js) vit dans le dépôt du site romande-ia.ch, qui est privé.

## D’où viennent les données

De l’API gratuite d’Artificial Analysis. Le site l’interroge côté serveur, une à deux fois par jour, avec sa propre clé, et affiche la date de récupération. Les scores sont leurs indices, affichés tels quels, sans pondération maison.

Ce dépôt ne publie aucune donnée. Les conditions de l’API gratuite demandent de citer Artificial Analysis, et une redistribution de leurs données passe par un accord avec eux. L’aperçu ci-dessous affiche les données dans votre terminal sans rien écrire sur disque.

## Règles de sélection

- Éditeurs suivis : OpenAI, Anthropic, Google, Meta, xAI, Mistral, DeepSeek, Alibaba, Kimi, Z AI, MiniMax, plus tout éditeur suisse évalué.
- Modèles sortis depuis moins de six mois (douze si l’éditeur n’a rien de plus récent), notés par Artificial Analysis et vendus à un prix public.
- Pour chaque modèle, le réglage (par exemple « Max » ou « Xhigh ») qui obtient le meilleur indice général.
- Un modèle qu’un autre modèle du même éditeur égale ou bat à la fois en indice général et en prix est écarté.
- Par éditeur : les deux meilleurs à l’indice général, plus le moins cher des autres.
- Un indice non publié reste vide : rien n’est estimé.

## Lancer l’aperçu

Il faut Node.js 20 ou plus récent et une clé de l’API gratuite d’Artificial Analysis (compte sur leur site). Leur quota est de 100 requêtes par 24 heures ; un aperçu en consomme une à trois.

```bash
npm install
AA_API_KEY=votre_cle npm run apercu            # usage général
AA_API_KEY=votre_cle npm run apercu -- legal   # general, finance, legal, strategy, engineering, health
```

## Historique

- **13 juillet 2026** : première version. Seize modèles notés par usage avec des pondérations maison, prix d’API et d’abonnement, données recalculées chaque jour par une tâche GitHub et publiées dans ce dépôt, version bilingue sur GitHub Pages.
- **5 octobre au 19 novembre 2026** : dépôt supprimé par erreur, comparateur vide pendant 45 jours, puis dépôt restauré. Le récit : [Mon comparateur d’IA est resté vide 45 jours](https://romande-ia.ch/articles/comparateur-ia-vide-45-jours).
- **4 novembre 2026** : Artificial Analysis ferme l’ancienne API utilisée par la première version.
- **23 novembre 2026** : refonte. Indices d’Artificial Analysis par métier, récupérés par le site côté serveur ; plus de prix d’abonnement ; ajout de l’IA suisse. Les anciens fichiers `data/`, `pipeline/` et la tâche quotidienne sont retirés de ce dépôt. Ils restent dans l’historique Git.

## Licence

MIT, voir [LICENSE](LICENSE). Les données appartiennent à Artificial Analysis.

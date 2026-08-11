# PREMIER_PROMPT_CODEX.md

## Mission

Créer uniquement le **socle technique CoachPulse V2** à partir de ce dépôt.

Avant toute modification, lire intégralement :

1. `AGENTS.md`
2. `docs/COACHPULSE_V2_SPEC.md`
3. `docs/DATA_MODEL.md`
4. `docs/BUSINESS_RULES.md`
5. `docs/PERMISSIONS_MODEL.md`
6. `docs/FIRESTORE_STRUCTURE.md`
7. `docs/ARCHITECTURE_DECISIONS.md`

## Objectif de cette PR

Mettre en place la fondation suivante, sans commencer les modules métier complexes :

```text
Authentication
↓
User
↓
Role / ActiveRole
↓
Permissions
↓
Team
↓
Season
↓
Player
↓
Dashboard simple
```

## À faire

- Initialiser proprement Vite + React + TypeScript.
- Installer/configurer React Router, TanStack Query, Zod, Vitest, React Testing Library, Firebase.
- Conserver l'alias `@/`.
- Créer l'infrastructure Firebase centralisée.
- Créer les types/schemas minimaux nécessaires à User, Role, UserTeamAccess, Team, Season, Player.
- Créer les repositories correspondants.
- Créer les services correspondants.
- Créer `permissionsService`.
- Créer les Context globaux limités : Auth, User, ActiveRole, Team, Season.
- Implémenter le choix de rôle actif si plusieurs rôles.
- Implémenter le choix/contexte Team.
- Implémenter le contexte Season.
- Mettre en place les guards de routing.
- Construire un Dashboard très simple servant uniquement à valider l'architecture.
- Préparer les tests unitaires et les tests Firestore Rules nécessaires au socle.
- Garder Firestore Rules en DENY BY DEFAULT et ouvrir uniquement ce qui est explicitement couvert par le modèle et les tests.
- Préparer Firebase DEV, sans toucher à PROD.
- Vérifier responsive ordinateur/tablette/mobile.
- Garder la PWA légère ; ne pas ajouter de logique métier dans le Service Worker.

## Interdictions

- Ne pas commencer Match, Tests, Attendance, RPE, Injury ou Medical.
- Ne pas copier le code CoachPulse V1.
- Aucun accès Firestore direct depuis React.
- Aucun gros Context contenant les données métier.
- Aucune nouvelle collection non prévue sans justification.
- Aucune projection/cache métier persistée.
- Aucune règle métier inventée.
- Aucun secret dans `VITE_*`.
- Ne pas modifier silencieusement les documents V1.0/V1.1.

## Architecture obligatoire

```text
UI / Pages
↓
Hooks / Controllers
↓
Services métier
↓
Repositories
↓
Firebase / Cloud Functions
```

## Definition of Done

Avant PR :

```text
npm run typecheck
npm run lint
npm test
npm run build
```

doivent passer.

La PR doit inclure :
- résumé de l'architecture créée ;
- fichiers principaux ;
- tests ajoutés ;
- Firestore Rules ajoutées ;
- éventuels points restant volontairement non implémentés.

## Git

Créer une branche feature dédiée.

Ouvrir une PR vers `dev`.

Ne rien merger directement dans `main`.

## Principe final

Cette PR doit uniquement prouver que la racine CoachPulse V2 est saine.

Ne chercher ni à reproduire toute l'application ni à avancer sur les modules complexes.

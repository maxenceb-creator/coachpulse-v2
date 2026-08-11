# CoachPulse V2

CoachPulse V2 est une réécriture complète de CoachPulse V1.

## Règle principale

On migre les fonctionnalités, les règles métier et les données, jamais le code legacy.

## Avant de développer

Lire impérativement :

1. `AGENTS.md`
2. `docs/COACHPULSE_V2_SPEC.md`
3. `docs/DATA_MODEL.md`
4. `docs/BUSINESS_RULES.md`
5. `docs/PERMISSIONS_MODEL.md`
6. `docs/FIRESTORE_STRUCTURE.md`
7. `docs/ARCHITECTURE_DECISIONS.md`
8. `docs/MIGRATION_PLAN_V1_TO_V2.md`
9. `docs/MODULES_V1_A_CONSERVER.md`

## Architecture

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

Aucun accès Firestore direct depuis React.

## Première fondation

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

## Installation et lancement

```bash
npm install
cp .env.example .env.local
npm run dev
```

Renseigner dans `.env.local` les six variables Firebase Web listées dans `.env.example`. Ce fichier est ignoré par Git. Le projet Firebase CLI de développement est `coachpulse-v2-dev` via l’alias `dev`.

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

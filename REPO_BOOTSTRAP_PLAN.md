# REPO_BOOTSTRAP_PLAN.md

## CoachPulse V2 — Racine du dépôt

### Racine cible

```text
coachpulse-v2/
├── AGENTS.md
├── README.md
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── firebase.json
├── .firebaserc
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── .env.example
├── .gitignore
├── docs/
├── src/
├── functions/
├── scripts/migration/
└── .github/workflows/
```

### Principe

La première PR ne développe pas les modules métier.

Elle valide seulement :

```text
Auth
→ User
→ Role / ActiveRole
→ Permissions
→ Team
→ Season
→ Player
→ Dashboard simple
```

### Branches

```text
main = production
dev = intégration
feature/* = fonctionnalités
fix/* = corrections
```

### Firebase

```text
coachpulse-v2-dev
coachpulse-v2-prod
```

Les noms peuvent être adaptés aux vrais IDs Firebase, mais les projets restent séparés.

### CI minimale

```text
typecheck
lint
tests
build
```

### Sécurité initiale

Firestore et Storage démarrent en :

```text
DENY BY DEFAULT
```

Les accès sont ouverts progressivement avec tests Emulator.

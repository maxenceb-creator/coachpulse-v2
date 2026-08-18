# ARCHITECTURE_DECISIONS.md

## CoachPulse V2 — Décisions d’architecture

**Version :** 1.0  
**Statut :** Référence consolidée  
**Objectif :** définir l’architecture technique officielle de CoachPulse V2 avant la création du dépôt et avant le développement des modules métier.

---

# 1. Stack principale

CoachPulse V2 utilise :

```text
Vite
React
TypeScript

Firebase Authentication
Cloud Firestore
Firebase Storage
Firebase Hosting
Cloud Functions

GitHub
GitHub Actions
```

Stack frontend complémentaire retenue :

```text
React Router
TanStack Query
Zod
Vitest
React Testing Library
```

Un outil E2E sera ajouté après stabilisation du premier Dashboard.

---

# 2. Principe architectural principal

Architecture obligatoire :

```text
UI / Pages
↓
Hooks / Controllers
↓
Services métier
↓
Repositories
↓
Firebase
```

Aucune page ou composant React ne doit accéder directement à Firestore.

Aucune couche ne doit contourner directement la couche suivante sans justification documentée.

---

# 3. Pages React

Une Page React doit principalement :

```text
composer l'interface
appeler des hooks
gérer l'état visuel local
réagir aux actions utilisateur
```

Elle ne doit pas :

```text
interroger Firestore directement
implémenter les règles métier
calculer les permissions
construire des agrégations complexes
effectuer directement une transaction Firebase
```

---

# 4. Composants UI

Les composants UI réutilisables sont passifs autant que possible.

Exemples :

```text
PlayerSelect
TeamFilter
SeasonFilter
DateRangeFilter

PlayerCard
TeamCard
StatCard
KpiCard

DataTable

RadarChart
BarChart
DonutChart
Heatmap
TrendChart
```

Ils reçoivent des props, callbacks et données prêtes à afficher.

Ils n'accèdent jamais directement à Firestore.

---

# 5. Graphiques

Les composants graphiques ne contiennent aucune règle métier.

Exemple interdit :

```text
RadarChart
↓
détermine lui-même si une valeur de sprint plus basse est meilleure
```

Correct :

```text
testsService
↓
normalisation métier
↓
RadarChart
```

---

# 6. Hooks / Controllers

Les hooks font le lien entre React et les services.

Exemples :

```text
usePlayer()
useTeamRoster()
useSessions()
useAttendance()
usePlayerTests()
useMatch()
usePermissions()
```

Ils peuvent utiliser TanStack Query pour le server state.

---

# 7. Services métier

Les services constituent la couche métier principale.

Exemples :

```text
playersService
teamsService
seasonsService

sessionsService
attendanceService
rpeService

testsService

matchesService
matchStatsService
possessionService

injuryService
medicalService

permissionsService

playerProfileService
teamAnalysisService
dashboardService
```

Ils gèrent :

```text
règles métier
validation métier
permissions
orchestration
transactions
calculs
agrégations
invalidation cache
```

---

# 8. Repositories

Les repositories gèrent uniquement la persistance et les requêtes.

Exemples :

```text
playersRepository
teamsRepository
sessionsRepository
attendanceRepository
rpeRepository
testsRepository
matchesRepository
medicalRepository
permissionsRepository
```

Ils ne doivent pas décider :

```text
si un GOAL vaut un tir cadré
si deux PRIMARY sont autorisés
comment calculer une charge
```

Ces règles appartiennent aux services.

---

# 9. Firebase SDK centralisé

La configuration Firebase est centralisée sous :

```text
src/infrastructure/firebase/
```

avec par exemple :

```text
firebaseApp.ts
auth.ts
firestore.ts
storage.ts
functions.ts
```

Une seule initialisation Firebase dans l’application.

---

# 10. Arborescence source

```text
coachpulse-v2/
│
├── src/
│   ├── app/
│   │   ├── router/
│   │   ├── providers/
│   │   └── layout/
│   │
│   ├── pages/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── players/
│   │   ├── teams/
│   │   ├── charts/
│   │   └── ...
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── players/
│   │   ├── teams/
│   │   ├── sessions/
│   │   ├── attendance/
│   │   ├── rpe/
│   │   ├── tests/
│   │   ├── matches/
│   │   ├── medical/
│   │   └── ...
│   │
│   ├── services/
│   ├── repositories/
│   │
│   ├── domain/
│   │   ├── types/
│   │   ├── schemas/
│   │   ├── enums/
│   │   └── rules/
│   │
│   ├── hooks/
│   │
│   ├── infrastructure/
│   │   └── firebase/
│   │
│   ├── utils/
│   └── test/
│
├── functions/
├── docs/
└── ...
```

---

# 11. Pas de monorepo complexe au démarrage

Décision V1.0 :

> CoachPulse V2 commence avec une structure simple `src/ + functions/`.

Pas de monorepo complexe ni de package partagé obligatoire dès la fondation.

Si le besoin devient réel, un package partagé pourra être extrait plus tard.

---

# 12. Feature folders

Les gros domaines peuvent posséder leurs composants, hooks et contrôleurs spécifiques.

Exemple :

```text
features/matches/
├── components/
├── hooks/
├── controllers/
└── utils/
```

Mais les règles métier partagées restent dans :

```text
services/
domain/
```

Un feature folder ne doit jamais devenir une application indépendante avec ses propres règles dupliquées.

---

# 13. Types TypeScript

Règle :

> 1 concept métier = 1 type TypeScript canonique.

Exemples :

```text
Player
Team
Season
Match
Attendance
```

ne doivent pas avoir plusieurs définitions incompatibles selon les modules.

---

# 14. Domain types

Les types principaux sont centralisés.

Exemples :

```text
src/domain/types/player.ts
src/domain/types/team.ts
src/domain/types/match.ts
```

---

# 15. DTO Firestore vs Domain Model

Lorsque nécessaire, CoachPulse distingue :

```text
Firestore DTO
```

de :

```text
Domain Model
```

Exemple :

```text
Firestore Timestamp
↓ mapper repository
Date / type domaine
```

Firebase ne doit pas contaminer toute la logique métier.

---

# 16. Mappers

Les repositories utilisent des mappers.

Exemple :

```text
PlayerFirestoreDocument
↓
mapPlayerFromFirestore()
↓
Player
```

et inversement.

---

# 17. Validation runtime

Décision V1.0 :

> Zod est la bibliothèque officielle de validation runtime.

Elle est utilisée aux frontières du système.

---

# 18. Utilisation de Zod

Validation notamment pour :

```text
Firestore → application
imports V1
formulaires complexes
Cloud Functions
données externes
configuration dynamique
```

Quand possible :

```text
Zod Schema
↓
z.infer
↓
TypeScript Type
```

afin d’éviter le maintien manuel de schémas et types divergents.

---

# 19. React Context

Les Context globaux doivent rester légers.

Autorisés initialement :

```text
AuthContext
UserContext
ActiveRoleContext
TeamContext
SeasonContext
```

---

# 20. Données interdites dans Context global

Ne pas stocker globalement :

```text
tous les Players
tous les Match
toutes les Sessions
tous les TestResults
toutes les blessures
```

Ces données sont du server state et relèvent du cache de requêtes.

---

# 21. Client State vs Server State

Client State :

```text
modal ouverte
onglet actif
filtre local
état visuel
```

Server State :

```text
Player
Sessions
MatchEvents
TestResults
Attendance
```

Ces deux types d’état ne doivent pas être gérés de la même manière.

---

# 22. TanStack Query

Décision V1.0 :

> TanStack Query est la couche officielle de server state/cache côté React.

Elle est utilisée pour :

```text
cache contrôlé
déduplication des lectures
loading/error state
invalidation
prefetch
mutations
```

Elle remplace le besoin d’un énorme Context contenant les données du club.

---

# 23. Query Keys

Toutes les Query Keys sont centralisées.

Exemples :

```ts
queryKeys.players.detail(playerId)

queryKeys.matches.list({
  teamId,
  seasonId,
})

queryKeys.sessions.list({
  categoryId,
  dateRange,
})
```

Les Query Keys doivent inclure tout contexte influençant réellement le résultat.

---

# 24. Cache et permissions

Si une donnée dépend de :

```text
activeRoleId
teamId
seasonId
```

la stratégie de cache doit refléter ce contexte.

Un changement de rôle actif ne doit jamais réutiliser brièvement des données qui ne sont plus autorisées.

---

# 25. Invalidation

Après une mutation réussie :

```text
service
↓
repository write
↓
invalidateQueries ciblées
```

Ne pas invalider toute l’application par défaut.

---

# 26. Prefetch

Le prefetch doit être ciblé.

Exemples :

Dashboard :

```text
dernier Match
prochaine Session
```

Fiche joueuse :

```text
identité immédiate
+
prefetch des données récentes réellement utiles
```

Pas de préchargement massif de tous les domaines.

---

# 27. Firestore cache vs TanStack Query

Deux couches peuvent coexister :

```text
Firestore local persistence
+
TanStack Query
```

Firestore gère la persistance locale des données Firestore.

TanStack Query gère le cycle de vie du server state dans React.

Elles ne doivent pas être confondues.

---

# 28. Offline

Décision V1.0 :

> Le Match doit être utilisable hors connexion dès la première version V2.

Priorités offline :

```text
Match en direct
Attendance
RPE
```

---

# 29. Offline Match

Avant le Match, l’application peut précharger :

```text
Match
participants
formation
rôles
configuration événements
```

Les MatchEvent doivent pouvoir être enregistrés malgré une connectivité temporairement mauvaise.

La source finale reste Firestore.

---

# 30. Appareil principal Match

Décision V1.0 :

> Un Match possède idéalement un appareil principal de saisie.

La collaboration multi-appareil simultanée sur un même Match n’est pas une priorité de fondation.

Cette règle vise à limiter les conflits offline et concurrents.

---

# 31. Conflits offline

CoachPulse doit minimiser les écritures concurrentes sur un même Match.

La résolution de conflit doit rester explicite.

Les opérations critiques ne doivent pas dépendre uniquement d’un modèle "last write wins" non contrôlé.

---

# 32. Offline médical

Les données MedicalRecord sensibles ne doivent pas être préchargées ou persistées massivement hors connexion.

Le médical est chargé à la demande et soumis à une politique plus restrictive.

---

# 33. React Router

Décision V1.0 :

> React Router est utilisé pour le routing SPA.

CoachPulse reste une SPA Vite.

Pas de transformation en framework full-stack.

---

# 34. Routes principales

Exemple cible :

```text
/login

/dashboard

/players
/players/:playerId

/teams
/teams/:teamId

/sessions

/tests

/matches
/matches/:matchId

/medical

/admin
```

Toutes ne seront pas implémentées dans la première fondation.

---

# 35. Route Guards

Routes protégées par :

```text
Authentication Guard
Permission Guard
Team Scope Guard
```

Les guards UI restent ergonomiques et ne remplacent jamais les Security Rules.

---

# 36. ActiveRole

Le rôle actif est un état global léger.

L’utilisateur peut posséder plusieurs rôles et changer de rôle actif à tout moment.

---

# 37. Changement de rôle

Processus :

```text
sélection nouveau rôle
↓
validation appartenance User.roleIds
↓
mise à jour ActiveRoleContext
↓
invalidation queries dépendantes des permissions
↓
recalcul navigation autorisée
↓
persistance facultative de la préférence
```

---

# 38. Changement de Team

```text
sélection Team
↓
validation UserTeamAccess
↓
mise à jour TeamContext
↓
invalidation / prefetch ciblés
```

---

# 39. permissionsService

Un unique `permissionsService` constitue la référence frontend métier pour les vérifications d’autorisation.

Exemple :

```ts
permissionsService.can({
  permission: 'matches.write',
  teamId,
  activeRoleId,
})
```

---

# 40. Permissions backend

Cloud Functions et Firestore Security Rules effectuent leurs propres contrôles.

Le frontend n’est jamais une autorité de sécurité.

---

# 41. Cloud Functions

Décision V1.0 :

> Cloud Functions fait partie du socle dès le départ.

Elle est utilisée pour les opérations nécessitant une autorité serveur.

---

# 42. Cas d’usage Cloud Functions initiaux

```text
AuditLog sensible
administration utilisateurs sensible
migrations / imports privilégiés
opérations multi-documents privilégiées
exports sensibles si nécessaire
```

Cloud Functions ne doit pas devenir un backend complet inutile pour toutes les écritures simples.

---

# 43. AuditLog côté serveur

Les audits sensibles sont créés côté serveur.

Exemple :

```text
changePrimaryAssignment()
↓
Cloud Function
↓
validation permissions
↓
transaction
↓
écriture métier
+
AuditLog
```

Le client ne doit pas être considéré comme source fiable de l’audit.

---

# 44. Validation serveur

Les Functions réutilisent autant que possible :

```text
schemas
enums
règles pures
```

pour éviter une validation frontend et backend contradictoire.

---

# 45. Package shared futur

Aucun package shared n’est obligatoire au démarrage.

Si la duplication `src/` / `functions/` devient significative, un package partagé pourra être extrait.

---

# 46. Gestion des erreurs

Les erreurs applicatives sont structurées.

Exemple :

```ts
AppError {
  code
  message
  cause?
  context?
}
```

Codes possibles :

```text
AUTH_REQUIRED
PERMISSION_DENIED
PLAYER_NOT_FOUND
TEAM_NOT_FOUND
PRIMARY_ASSIGNMENT_CONFLICT
INVALID_TEST_RESULT
MATCH_NOT_EDITABLE
NETWORK_ERROR
UNKNOWN_ERROR
```

---

# 47. Messages utilisateur

Ne jamais afficher directement :

```text
FirebaseError: Missing or insufficient permissions
```

Les erreurs techniques sont traduites en erreurs CoachPulse compréhensibles.

---

# 48. Logging

DEV :

```text
logging détaillé
```

PROD :

```text
logging contrôlé
```

Ne jamais logger :

```text
MedicalRecord sensible
tokens
secrets
données personnelles inutiles
```

---

# 49. Stratégie de tests

Stack :

```text
Vitest
React Testing Library
Firebase Emulator Suite
```

Un outil E2E sera ajouté après le premier Dashboard stabilisé.

---

# 50. Tests unitaires prioritaires

Priorité forte :

```text
calcul sous-catégorie
PRIMARY assignment
training load
test result aggregation
GOAL
SAVE
score
possession
temps de jeu
heatmap filters
permissions
medicalAccessLevel
```

---

# 51. Tests repositories

Tester notamment :

```text
mapping Firestore
query construction
IDs déterministes
gestion UNKNOWN / null
```

Utiliser l’Emulator lorsque Firestore est nécessaire.

---

# 52. Tests Firestore Security Rules

Obligatoires pour :

```text
TeamAccess
multi-role
SELF joueuse
Session Category access
TestSession Category access
medical accessTeamIds
medicalAccessLevel
AuditLog
```

---

# 53. Tests composants

Tester principalement les interactions utilisateur importantes.

Exemples :

```text
sélection Team
sélection rôle
saisie Attendance
saisie RPE
sélection joueuse
actions Match
```

Éviter les tests dépendant des détails internes d’implémentation.

---

# 54. Tests E2E

Ajout après stabilisation du premier Dashboard.

Premiers parcours recommandés :

```text
login
→ choix rôle
→ choix Team
→ Dashboard
```

```text
création Player
→ affectation PRIMARY
```

```text
Session
→ Attendance
→ RPE
```

Le moteur Match aura ensuite ses scénarios E2E dédiés.

---

# 55. CI GitHub Actions

Avant merge :

```text
install
typecheck
lint
unit tests
build
```

Puis à mesure de l’avancement :

```text
Firestore Rules tests
Functions tests
E2E
```

---

# 56. Typecheck

Vite ne remplace pas le contrôle TypeScript.

Le pipeline CI exécute un typecheck séparé.

---

# 57. Lint et format

Outils :

```text
ESLint
Prettier
```

Configuration simple et unique.

---

# 58. Imports

Alias :

```text
@/ = src/
```

Exemples :

```text
@/services/matchesService
@/domain/types/player
```

---

# 59. Gestion des dépendances

Avant ajout d’une dépendance :

```text
besoin réel ?
maintenue ?
compatible TypeScript ?
gain supérieur au coût ?
```

Éviter la dépendance inutile pour quelques lignes simples.

---

# 60. DEV / PROD

Deux projets Firebase distincts :

```text
coachpulse-v2-dev
coachpulse-v2-prod
```

ou équivalents.

DEV et PROD ne partagent jamais la même Firestore.

V1 et V2 restent séparées.

---

# 61. Branches Git

```text
main
dev
feature/*
fix/*
```

`main` = production.

`dev` = intégration.

---

# 62. Pull Requests

Workflow :

```text
feature branch
↓
PR vers dev
↓
CI
↓
review
↓
merge
```

Release :

```text
dev
↓
PR vers main
↓
production
```

---

# 63. Aucune copie du code V1

Interdit :

```text
copier un gros module V1
adapter progressivement
```

Autorisé :

```text
observer la V1
↓
extraire règles / UX / données
↓
réimplémenter selon la V2
```

---

# 64. Performance

Principe :

> Charger uniquement ce qui est nécessaire, au moment où cela est nécessaire.

Interdit :

```text
App start
↓
download database
```

---

# 65. Pagination et limites

Les listes volumineuses utilisent :

```text
limit
cursor pagination
date range
filters
```

selon le domaine.

---

# 66. MatchEvent

Une liste de Match ne charge jamais tous les MatchEvent de la saison.

Les MatchEvent sont chargés uniquement lorsque le contexte Match ou une analyse précise les nécessite.

---

# 67. Lazy loading

Les gros écrans peuvent être chargés paresseusement par route.

Exemples :

```text
Match live
Analyse équipe
Medical
```

---

# 68. Images

Photos joueuses :

```text
lazy loading
tailles adaptées
fallback
```

Ne pas charger les photos haute résolution inutilement.

---

# 69. Configuration métier

Les configurations extensibles sont chargées via services :

```text
roles
formations
matchRoles
testDefinitions
matchEventDefinitions
```

Elles peuvent utiliser un cache avec un staleTime plus long car elles changent peu.

---

# 70. Mutations optimistes

À utiliser uniquement lorsque le rollback est fiable.

Prudence particulière pour :

```text
permissions
PRIMARY
medical
audit
```

Ces opérations critiques attendent une confirmation serveur claire.

---

# 71. Accessibilité

Les composants doivent être conçus pour :

```text
clavier
labels
focus
contraste
zones tactiles
```

CoachPulse cible ordinateur, tablette et smartphone.

---

# 72. Responsive

Le responsive est une exigence de fondation, pas une correction finale.

Aucun composant ne doit supposer une largeur fixe.

---

# 73. UX terrain

Les écrans Match privilégient :

```text
grandes zones tactiles
peu de clics
feedback immédiat
```

sans déplacer les règles métier dans l’UI.

---

# 74. PWA

Décision V1.0 :

> CoachPulse V2 est préparée comme PWA légère dès la fondation.

La PWA gère principalement :

```text
installation
assets
shell applicatif
```

Elle ne remplace ni la persistance Firestore offline ni TanStack Query.

---

# 75. Service Worker

Ne pas créer un moteur de cache métier custom dans le Service Worker.

Les stratégies d’assets et de données métier restent séparées.

---

# 76. Variables d’environnement

Les variables `VITE_*` sont visibles côté client.

Aucun secret serveur n’y est stocké.

Les secrets Functions utilisent les mécanismes serveur Firebase / Google Cloud adaptés.

---

# 77. Fondation applicative — ordre de développement

Ordre validé :

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

Puis seulement les modules métier complexes.

---

# 78. Premier Dashboard

Le premier Dashboard sert à valider :

```text
authentication
permissions
ActiveRole
TeamContext
SeasonContext
routing
repositories
services
TanStack Query
responsive
Firebase DEV
PWA légère
```

Il ne doit pas reproduire immédiatement tout le Dashboard V1.

---

# 79. Definition of Done

Une fonctionnalité n’est pas terminée simplement parce que l’UI fonctionne.

Selon son importance, elle doit respecter :

```text
types
validation runtime
services
repositories
permissions
tests
errors
cache
responsive
```

---

# 80. Décisions AD consolidées

## AD-001

Vite + React + TypeScript.

## AD-002

React Router pour la SPA.

## AD-003

TanStack Query pour le server state et le cache.

## AD-004

Zod pour la validation runtime.

## AD-005

Vitest pour les tests unitaires.

## AD-006

React Testing Library pour les tests composants.

## AD-007

Firebase Emulator Suite pour les tests Firebase et Security Rules.

## AD-008

Cloud Functions dès le socle pour AuditLog et commandes sensibles.

## AD-009

Pas de Redux global pour les données métier.

## AD-010

Context global limité à Auth, User, ActiveRole, Team et Season.

## AD-011

Pas de monorepo complexe initialement.

## AD-012

Structure simple `src/ + functions/`.

## AD-013

Pas de projection métier prématurée.

## AD-014

Firestore offline utilisé de manière contrôlée.

## AD-015

Le Match est utilisable offline dès la première V2.

## AD-016

Un appareil principal est recommandé par Match.

## AD-017

Les données médicales sensibles ne sont pas préchargées massivement offline.

## AD-018

PWA légère dès la fondation.

## AD-019

Tests E2E ajoutés après stabilisation du premier Dashboard.

## AD-020

DEV et PROD Firebase sont séparés.

## AD-021

V1 et V2 restent complètement séparées.

## AD-022

Aucun accès Firestore direct depuis React.

## AD-023

Les services portent les règles métier.

## AD-024

Les repositories portent uniquement la persistance.

## AD-025

Les graphiques restent passifs.

## AD-026

Les permissions sont recalculées lors d’un changement de rôle actif ou de Team.

## AD-027

Les opérations critiques ne dépendent pas uniquement de mutations optimistes.

## AD-028

L’audit sensible est généré côté serveur.

---

# 81. Principe final

CoachPulse V2 suit la chaîne :

```text
UI
↓
Hooks / Controllers
↓
Services métier
↓
Repositories
↓
Firebase / Cloud Functions
```

Les données serveur sont gérées via :

```text
TanStack Query
+
Firestore offline contrôlé
```

La sécurité repose sur :

```text
UI guards
+
permissionsService
+
Cloud Functions lorsque nécessaire
+
Firestore Security Rules
```

La V2 doit rester modulaire, testable, explicable et capable d’évoluer sans recréer les dépendances imbriquées de la V1.

Ce document constitue la référence technique V1.0 de CoachPulse V2.

---

# Addendum PR04 — contexte de rôle vérifiable

Le rôle actif de sécurité est persisté dans `User.securityContext` avec la Team
et la saison actives. Une écriture client très limitée est autorisée uniquement
sur ce champ et entièrement revalidée par Firestore Rules contre `User.roleIds`,
`Role.isActive`, `UserTeamAccess` et la saison active.

Les custom claims ne sont pas retenus : les rôles, Teams et permissions sont
dynamiques et leur modification ne doit pas imposer de renouvellement du token
ou de redéploiement. Un contexte uniquement local n'est pas vérifiable par les
Rules. Une commande serveur à chaque changement ajouterait de la latence sans
renforcer la validation déjà exprimable dans les Rules.

La vérification d'appartenance Player utilise `playerAccessScopes`, index
d'autorisation serveur dérivé et déterministe. Firestore Rules ne peut pas
interroger `playerTeamAssignments` par recherche lors d'un `get` Player ; cet
index minimal permet un `exists/get` déterministe sans ajouter `teamId` comme
vérité permanente dans Player.

---

# Addendum de cohérence V1.1

- `TestBenchmark` utilise le même domaine Tests que `TestDefinition`, `TestSession` et `TestResult`.
- Les comparaisons inter-générations/inter-saisons/inter-joueuses sont des agrégations, pas de nouvelles sources persistantes.
- Le cache des comparaisons doit inclure les contextes de protocole/version, métrique, sous-catégorie, saison et population lorsqu'ils influencent le résultat.
- Toute écriture sur une Season `CLOSED` passe par `history.correctClosedSeason`.
- Une Team `FIRST_TEAM` ne doit pas recevoir artificiellement un `categoryId` ou `seasonId`.

## Addendum PR06 — fondation du domaine Tests

- Le catalogue `TestDefinition` est global, mais toute lecture client exige un
  contexte Team vérifié portant `tests.read`.
- `TestBenchmark` est filtré et sécurisé par saison et sous-catégorie de la
  Category de la Team active.
- Le service Tests valide version, métrique, sous-catégorie, bornes et sens de
  performance avant toute interprétation.
- Les query keys privées incluent uid, rôle, Team et saison ; les benchmarks
  ajoutent sous-catégorie et définition lorsqu'elles influencent le résultat.
- PR06 est read-only côté UI. La saisie TestSession/TestResult est réservée à
  PR07 et les comparaisons/normalisations avancées à PR08.

## Addendum PR07 — sessions et saisie de résultats

- `TestSession` fige définition/version, Team, Season, Category et date.
- Le cycle minimal est `DRAFT → COMPLETED`; `tests.write` ne corrige pas une
  session terminée. Une permission de correction dédiée sera introduite avec
  son besoin métier.
- `TestResult` utilise l'ID déterministe `{testSessionId}_{playerId}` et des
  `values` dérivées exclusivement des métriques du protocole.
- Zéro est une valeur ; l'absence de TestResult représente une joueuse non
  testée.
- L'éligibilité utilise les affectations effectives à `TestSession.date`.
- La saisie reste locale jusqu'à une sauvegarde explicite. Les résultats sont
  écrits en batch et la finalisation ajoute atomiquement le changement de
  statut de la session.
- La suppression physique d'une TestSession est une action explicite et
  confirmée, autorisée en PR07 avec `tests.write` pour `DRAFT` et `COMPLETED`.
  Tous les TestResults liés et la session sont supprimés dans un même batch ;
  une permission dédiée pourra être introduite ultérieurement.

## Addendum PR08 — analytics Tests

- Les analytics Tests sont dérivés à la lecture ; aucune collection de
  projection n'est ajoutée.
- L'historique joint les `TestResult` aux `TestSession` afin d'utiliser la date
  sportive et le contexte Team/Saison/Category figé.
- Une comparaison exige définition, version, métrique et unité identiques. Une
  incompatibilité est un état explicite, jamais une conversion silencieuse.
- Le delta directionnel vaut `current - previous` pour
  `HIGHER_IS_BETTER`, et son opposé pour `LOWER_IS_BETTER`.
- Aucun seuil de stabilité ni aucune tolérance arbitraire n'est introduit :
  l'égalité exacte est `STABLE` / `ON_TARGET`.
- Le pourcentage relatif n'est pas calculé lorsque la valeur de référence vaut
  zéro. Moyenne et médiane ignorent les absences et conservent zéro.
- Le benchmark historique est résolu depuis `Player.birthDate + Season` parmi
  les sous-catégories de la Category figée par la `TestSession`.

## Addendum PR09 — administration du catalogue Tests

- `tests.manage` est distinct de `tests.write` et couvre définitions, versions
  et benchmarks.
- Le cycle canonique est `DRAFT → ACTIVE → ARCHIVED`; `INACTIVE` est seulement
  toléré en lecture pour la compatibilité PR06.
- Chaque version est un document immutable distinct. Son ID déterministe suit
  `test-{code normalisé}-v{version}`. La création transactionnelle échoue si le
  document cible existe déjà, ce qui arbitre deux créations concurrentes.
- Le client n'effectue pas de requête globale `testSessions` pour déterminer
  l'usage d'une définition : les Rules de sessions imposent Team et saison, et
  une telle requête globale serait à la fois non prouvable et incomplète. La
  sécurité repose sur le cycle : une session ne peut référencer qu'une version
  `ACTIVE`, tandis que seule une version `DRAFT` est modifiable ou supprimable.
  Dès activation, la version devient historiquement protégée, qu'une session
  existe déjà ou non.
- L'unicité benchmark est matérialisée par un ID déterministe construit depuis
  saison, sous-catégorie, définition/version, métrique et niveau.
- PR07 et PR08 consomment toujours les métriques génériques, triées par `order` ;
  aucun protocole n'est codé en dur.

## Addendum PR10 — historique individuel des Tests

- L'historique individuel est chargé par `playerId + teamId + seasonId` ; il ne
  charge jamais tous les résultats Tests pour les filtrer dans React.
- Les versions d'un protocole restent des historiques séparés. Les métriques et
  benchmarks sont toujours interprétés avec la définition/version d'origine.
- Le service PR10 réutilise les primitives analytics PR08 pour la meilleure
  valeur, la dernière valeur, la progression et la comparaison au benchmark.
- Les clés de cache incluent utilisateur, rôle actif, Team, saison et joueuse ;
  elles sont supprimées lors d'un changement de contexte protégé.

# Addendum PR12 — Fondation de la fiche joueuse

La route `/players/:playerId` compose des sections de domaine indépendantes.
L'identité utilise le roster partagé `players.roster`, scopé par
`uid + activeRoleId + teamId + seasonId`, puis une query `players.profile`
valide le `playerId` dans ce roster. Le service vérifie `players.read` et
l'affectation effective avant d'exposer la joueuse. La taxonomie
catégorie/sous-catégorie possède une query distincte incluant l'année de
naissance ; sa latence ou son erreur ne bloque pas l'identité.

Chaque section métier possède son propre cycle de chargement et ses propres
permissions. La section Tests réutilise `useTestPlayerHistory` et les query keys
PR10/PR11 ; une erreur Tests ne remonte donc pas au chargement de l'identité.
Sur la fiche, l'identité déjà validée et la taxonomie déjà résolue sont fournies
à cette section : elle ne relit ni le roster ni la taxonomie. Les sessions et
les résultats de la joueuse peuvent alors être chargés en parallèle. Un contexte
Team sans résultat conserve sa taxonomie propre et produit immédiatement un état
vide, sans emprunter le cache d'une autre Team.
Les futures sections Présences, Matchs, charge, blessures et médical suivront ce
modèle sans transformer la fiche en nouvelle source de vérité.

Lors d'un changement rapide de Team, une réponse de persistance du contexte
devenue obsolète ne doit ni remplacer le contexte sélectionné ni purger ses
queries protégées. Seule la réponse correspondant exactement au rôle, à la Team
et à la saison actuellement sélectionnés peut appliquer la mise à jour de cache
et le nettoyage associé.

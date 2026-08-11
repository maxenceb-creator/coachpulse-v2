# AGENTS.md

## CoachPulse V2 — Instructions de travail pour Codex

**Version :** 1.0  
**Statut :** Règles obligatoires du dépôt  
**Portée :** toutes les contributions humaines ou assistées par IA sur CoachPulse V2.

---

# 1. Mission générale

CoachPulse V2 est une réécriture complète de CoachPulse V1.

La V1 sert uniquement de référence pour :
- les fonctionnalités validées ;
- les règles métier ;
- l’ergonomie utile ;
- les données existantes ;
- les cas limites.

> Ne jamais copier ou convertir directement le code legacy V1.

La règle centrale est :

```text
On migre les fonctionnalités, les règles métier et les données.
On ne migre pas le code legacy.
```

---

# 2. Ordre de lecture obligatoire avant toute modification importante

Avant de développer une fonctionnalité, lire dans cet ordre :

1. `docs/COACHPULSE_V2_SPEC.md`
2. `docs/DATA_MODEL.md`
3. `docs/BUSINESS_RULES.md`
4. `docs/PERMISSIONS_MODEL.md`
5. `docs/FIRESTORE_STRUCTURE.md`
6. `docs/ARCHITECTURE_DECISIONS.md`
7. `docs/MIGRATION_PLAN_V1_TO_V2.md`
8. `docs/MODULES_V1_A_CONSERVER.md` si la tâche concerne une fonctionnalité héritée de V1

Ne jamais implémenter une règle métier sur la base d’une supposition si elle n’est pas définie dans ces documents.

---

# 3. Hiérarchie des sources de vérité

En cas de conflit :

```text
BUSINESS_RULES.md
↓
DATA_MODEL.md
↓
PERMISSIONS_MODEL.md
↓
FIRESTORE_STRUCTURE.md
↓
ARCHITECTURE_DECISIONS.md
↓
COACHPULSE_V2_SPEC.md
```

Si deux documents normatifs se contredisent :
- ne pas choisir arbitrairement ;
- identifier explicitement le conflit ;
- proposer une correction documentaire avant d’implémenter.

---

# 4. Architecture obligatoire

Toute fonctionnalité doit respecter :

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

Interdictions absolues :

```text
Page React → Firestore direct
Component React → Firestore direct
Page React → règle métier
Graphique → règle métier
Repository → logique métier complexe
```

---

# 5. Pages React

Les Pages React peuvent :
- composer l’UI ;
- appeler des hooks ;
- gérer l’état visuel local ;
- déclencher des actions utilisateur.

Elles ne doivent pas :
- appeler `getDoc`, `getDocs`, `setDoc`, `updateDoc`, `addDoc` directement ;
- calculer une règle métier ;
- recalculer des permissions ;
- dupliquer des agrégations métier ;
- gérer une transaction Firestore directement.

---

# 6. Composants UI

Les composants génériques doivent rester passifs.

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

Un composant UI :
- reçoit des données ;
- affiche ;
- émet des callbacks.

Il ne décide pas des règles métier.

---

# 7. Graphiques

Un graphique ne doit jamais décider :
- si une valeur plus haute ou plus basse est meilleure ;
- comment normaliser un test ;
- quelle statistique est valide ;
- comment calculer un taux ;
- comment interpréter une performance.

Ces décisions doivent être prises dans les services métier avant rendu.

---

# 8. Services métier

Les services constituent la couche métier principale.

Ils doivent contenir :
- les règles métier ;
- les validations métier ;
- l’orchestration ;
- les permissions ;
- les transactions ;
- les calculs ;
- les agrégations ;
- l’invalidation ciblée du cache.

Exemples :

```text
playersService
teamsService
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

---

# 9. Repositories

Les repositories gèrent :
- les lectures Firestore ;
- les écritures Firestore ;
- les requêtes ;
- les mappers ;
- la persistance.

Ils ne doivent pas décider :
- qu’un GOAL implique un tir cadré ;
- qu’un SAVE implique un tir cadré adverse ;
- comment calculer une charge ;
- si deux PRIMARY simultanés sont autorisés.

---

# 10. Firestore

Firestore est la source de vérité persistante.

Ne jamais créer une collection simplement parce qu’un écran a besoin d’un affichage particulier.

Collections dérivées interdites par défaut :

```text
dashboardData
playerStats
teamStats
heatmaps
trainingLoads
analysisData
playerProfileData
```

Une projection n’est ajoutée que si un besoin réel de performance est démontré.

---

# 11. Données dérivées

Règle :

> Toute donnée recalculable de manière fiable reste dérivée par défaut.

Exemples :
- score ;
- taux de présence ;
- charge ;
- possession ;
- heatmap ;
- temps de jeu ;
- temps par rôle ;
- statistiques Match ;
- taux de victoire.

Ne jamais créer une seconde source de vérité.

---

# 12. Identifiants

Les identifiants structurants sont notamment :

```text
userId
playerId
teamId
seasonId
sessionId
matchId
```

Ne jamais utiliser un nom, libellé ou catégorie comme clé stable si un ID existe.

---

# 13. Player

`Player` ne doit jamais contenir comme source permanente :

```text
teamId
categoryId
subCategoryId
seasonId
poste principal
numéro de maillot
```

Les affectations d’équipe passent par `PlayerTeamAssignment`.

---

# 14. PlayerTeamAssignment

Une joueuse peut avoir plusieurs affectations simultanées.

Types :

```text
PRIMARY
SECONDARY
TEMPORARY
```

Le PRIMARY est défini manuellement.

Ne jamais le déduire automatiquement de la saison, catégorie ou sous-catégorie.

---

# 15. Session

Règle obligatoire :

```text
1 Session = 1 Category
```

Si plusieurs catégories s’entraînent ensemble, créer plusieurs Sessions.

---

# 16. TestSession

Même règle :

```text
1 TestSession = 1 Category
```

---

# 17. Match

Règle obligatoire :

```text
Match → Team
```

et non :

```text
Match → Category
```

---

# 18. MatchEvent

`MatchEvent` est la source brute principale des statistiques terrain.

Ne jamais créer deux événements pour représenter une seule action métier si une statistique peut être dérivée.

Exemples obligatoires :

```text
GOAL
→ +1 but
→ +1 tir cadré
→ score
→ assist éventuelle
→ changement immédiat de possession
```

```text
SAVE
→ +1 arrêt gardienne
→ +1 tir cadré adverse
```

Ne pas créer un `SHOT_ON_TARGET` supplémentaire pour la même action.

---

# 19. Possession

Les règles de possession doivent être implémentées une seule fois.

Ne jamais créer un compteur manuel indépendant.

La possession est dérivée des événements et du temps de Match.

---

# 20. Tests techniques et athlétiques

Ne jamais créer un nouveau module spécifique simplement pour ajouter un protocole.

Utiliser :

```text
TestDefinition
TestSession
TestResult
```

Le moteur doit rester extensible.

Les tests bilatéraux utilisent :

```text
STRONG_FOOT
WEAK_FOOT
```

en fonction de `Player.preferredFoot`.

---

# 21. Médical

Les données Injury et MedicalRecord sont distinctes.

Ne jamais exposer des données médicales par simple commodité UI.

Pour MedicalRecord, respecter :
- `accessTeamIds[]` ;
- `medical.read/write` ;
- `medicalAccessLevel` ;
- rôle actif ;
- TeamAccess.

---

# 22. Permissions

Règle :

> Permission absente = refus.

Les rôles décrivent les personnes.
Les TeamAccess définissent leur périmètre.
Les permissions définissent leurs actions.

Ne jamais déduire automatiquement qu’un rôle donne tous les droits supposés.

---

# 23. Multi-rôle

Un utilisateur peut avoir plusieurs rôles.

Il possède un rôle actif sélectionnable.

Toute requête ou mutation dépendant du rôle doit respecter ce contexte.

Lors d’un changement de rôle :
- invalider les données dépendantes des permissions ;
- recalculer la navigation autorisée ;
- ne jamais conserver de données devenues interdites dans l’UI.

---

# 24. Compte joueuse / SELF

Un compte joueuse est lié via :

```text
User.linkedPlayerId
```

Le scope SELF n’autorise l’accès qu’aux données du `playerId` lié.

Ne jamais permettre à une joueuse de lire ou écrire les données SELF d’une autre joueuse.

---

# 25. TanStack Query

TanStack Query est la couche officielle de server state/cache côté React.

Règles :
- query keys centralisées ;
- invalidation ciblée ;
- pas de gros Context de données ;
- pas de `invalidateQueries()` global sans justification ;
- intégrer `teamId`, `seasonId`, `activeRoleId` dans les clés si ces contextes changent le résultat.

---

# 26. Zod

Zod est la solution officielle de validation runtime.

Utiliser Zod notamment pour :
- Firestore → domaine ;
- formulaires complexes ;
- imports ;
- Cloud Functions ;
- configuration dynamique.

Ne jamais supposer qu’un type TypeScript suffit pour valider une donnée externe à l’exécution.

---

# 27. Offline

Le Match doit fonctionner hors connexion.

Priorités offline :
- Match ;
- Attendance ;
- RPE.

Un appareil principal de saisie est recommandé par Match.

Ne pas introduire de collaboration multi-appareil complexe sur le même Match sans décision d’architecture explicite.

---

# 28. PWA

La V2 est préparée comme PWA légère.

Le Service Worker ne doit pas devenir une couche métier parallèle.

Ne pas stocker de logique métier dans le Service Worker.

---

# 29. Cloud Functions

Utiliser Cloud Functions uniquement quand une autorité serveur est nécessaire.

Cas initiaux :
- AuditLog sensible ;
- administration utilisateur sensible ;
- commandes privilégiées ;
- migrations/imports privilégiés ;
- opérations critiques nécessitant une transaction fiable côté serveur.

Ne pas déplacer toutes les écritures dans Functions sans raison.

---

# 30. AuditLog

Les actions sensibles doivent générer un AuditLog côté serveur.

Le client standard ne doit jamais être considéré comme source fiable de l’audit.

Les utilisateurs standards ne doivent pas pouvoir modifier ou supprimer les AuditLog.

---

# 31. Erreurs

Ne jamais afficher directement une erreur Firebase brute à l’utilisateur.

Utiliser des erreurs applicatives structurées.

Exemples :

```text
AUTH_REQUIRED
PERMISSION_DENIED
PLAYER_NOT_FOUND
PRIMARY_ASSIGNMENT_CONFLICT
MATCH_NOT_EDITABLE
NETWORK_ERROR
```

---

# 32. Logs

Ne jamais logger :
- tokens ;
- secrets ;
- MedicalRecord sensibles ;
- informations personnelles inutiles.

---

# 33. Tests obligatoires

Toute modification importante d’une règle métier doit inclure ou adapter des tests.

Priorités absolues :
- sous-catégorie ;
- PRIMARY ;
- charge ;
- tests ;
- GOAL ;
- SAVE ;
- score ;
- possession ;
- temps de jeu ;
- permissions ;
- medicalAccessLevel ;
- SELF.

---

# 34. Firestore Security Rules

Toute nouvelle collection ou nouvelle permission importante doit être couverte par des tests Emulator.

Cas obligatoires :
- TeamAccess ;
- multi-rôle ;
- SELF ;
- Session Category access ;
- TestSession Category access ;
- medical accessTeamIds ;
- medicalAccessLevel ;
- AuditLog.

---

# 35. CI

Avant de considérer une tâche terminée :

```text
typecheck
lint
unit tests
build
```

doivent passer.

À mesure que les modules concernés existent, exécuter également :
- tests Functions ;
- tests Firestore Rules ;
- E2E concernés.

---

# 36. Definition of Done

Une fonctionnalité importante n’est pas terminée uniquement parce qu’elle fonctionne visuellement.

Vérifier :
- types ;
- schemas Zod ;
- service ;
- repository ;
- permissions ;
- Security Rules si nécessaire ;
- cache ;
- erreurs ;
- responsive ;
- tests ;
- documentation si la règle évolue.

---

# 37. Migration V1

Ne jamais importer directement des données V1 dans Firestore V2 sans pipeline de validation.

Pipeline obligatoire :

```text
Extract
→ Normalize
→ Validate
→ Resolve IDs
→ Detect duplicates
→ Transform
→ Dry Run
→ Write
→ Verify
→ Migration Report
```

Seule la saison en cours est migrée.

Les anciennes saisons restent dans la V1 comme archive.

---

# 38. Code V1

Si une tâche demande « reprendre » une fonctionnalité V1 :

1. inspecter la V1 ;
2. identifier ce qui fonctionne ;
3. extraire la règle métier ;
4. réimplémenter selon V2 ;
5. ne jamais recopier un gros bloc de code legacy.

---

# 39. Nouveaux fichiers ou collections

Avant d’ajouter :
- une collection Firestore ;
- un service ;
- un repository ;
- un type ;
- une projection ;
- un Context ;
- une dépendance externe ;

vérifier qu’un équivalent n’existe pas déjà.

Ne jamais créer deux implémentations concurrentes.

---

# 40. Dépendances

Avant d’ajouter une bibliothèque :
- vérifier qu’elle répond à un besoin réel ;
- vérifier qu’elle est maintenue ;
- vérifier sa compatibilité TypeScript ;
- évaluer le coût de maintenance.

Ne pas ajouter une dépendance pour quelques lignes triviales.

---

# 41. Conventions Git

Branches :

```text
main
dev
feature/*
fix/*
```

Toute modification significative passe par PR.

Workflow normal :

```text
feature/*
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
```

---

# 42. Scope d’une PR

Une PR doit rester ciblée.

Éviter :
- refonte globale non demandée ;
- nettoyage massif non lié ;
- changement d’architecture caché dans une feature ;
- renommages inutiles de centaines de fichiers.

---

# 43. Description de PR

Toute PR importante doit expliquer :
- objectif ;
- fichiers/domaine modifiés ;
- règles métier concernées ;
- impact Firestore ;
- impact permissions ;
- tests ajoutés ;
- risques ;
- éventuelles décisions à documenter.

---

# 44. Modification d’une décision V1.0

Codex ne doit jamais modifier silencieusement une décision documentée.

Si une meilleure solution est identifiée :
1. signaler la décision concernée ;
2. expliquer pourquoi elle pose problème ;
3. proposer la nouvelle décision ;
4. attendre validation fonctionnelle si elle change le métier ;
5. mettre à jour la documentation avant ou avec le code.

---

# 45. Ambiguïté

Si la demande est techniquement claire mais qu’une petite décision d’implémentation manque :
- choisir l’option la plus simple compatible avec les documents ;
- documenter le choix dans la PR si utile.

Si l’ambiguïté concerne une règle métier structurante :
- ne pas inventer ;
- signaler le point.

---

# 46. Ne pas sur-architecturer

La V2 doit être propre, mais ne doit pas devenir un exercice académique.

Éviter :
- abstractions sans usage ;
- generics complexes inutiles ;
- couches supplémentaires sans bénéfice réel ;
- monorepo complexe dès le départ ;
- projections prématurées ;
- microservices inutiles.

---

# 47. Ne pas sous-architecturer

Éviter également les raccourcis tels que :
- Firestore dans React ;
- règles métier dans les composants ;
- gros fichiers contenant tout ;
- duplication de types ;
- permissions uniquement visuelles ;
- tableaux de données hardcodés dans plusieurs modules.

---

# 48. Performance

Règle :

> Charger ce qui est nécessaire quand c’est nécessaire.

Ne jamais charger tout le club au démarrage.

Les listes volumineuses doivent prévoir :
- filtres ;
- période ;
- limit ;
- pagination/cursor si nécessaire.

---

# 49. Dashboard

Le premier Dashboard est un Dashboard de validation d’architecture.

Il ne doit pas recréer toute la V1.

Il doit surtout valider :

```text
Auth
User
ActiveRole
Permissions
Team
Season
Player
TanStack Query
Routing
Responsive
Firebase DEV
PWA
```

---

# 50. Ordre de construction initial

Respecter l’ordre :

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

Ne pas commencer par Match.

---

# 51. Environnements

Toujours respecter :

```text
V1
≠
V2 DEV
≠
V2 PROD
```

Ne jamais utiliser la base V1 PROD comme environnement de développement V2.

---

# 52. Secrets

Ne jamais mettre de secret dans :
- `VITE_*` ;
- code frontend ;
- Git ;
- PR ;
- logs.

Utiliser les mécanismes serveur adaptés pour les secrets Functions.

---

# 53. Documentation

Toute règle structurante nouvelle doit être ajoutée au bon document :

```text
DATA_MODEL.md
BUSINESS_RULES.md
PERMISSIONS_MODEL.md
FIRESTORE_STRUCTURE.md
ARCHITECTURE_DECISIONS.md
MIGRATION_PLAN_V1_TO_V2.md
COACHPULSE_V2_SPEC.md
```

Le code ne doit jamais devenir la seule source de documentation d’une décision métier importante.

---

# 54. Checklist avant implémentation

Avant de coder :

- [ ] Identifier le domaine.
- [ ] Lire les documents concernés.
- [ ] Vérifier les types existants.
- [ ] Vérifier les services existants.
- [ ] Vérifier les repositories existants.
- [ ] Vérifier les permissions.
- [ ] Vérifier si une nouvelle collection est réellement nécessaire.
- [ ] Vérifier les impacts cache/offline.
- [ ] Définir les tests nécessaires.

---

# 55. Checklist avant fin de tâche

Avant de terminer :

- [ ] Typecheck OK.
- [ ] Lint OK.
- [ ] Tests concernés OK.
- [ ] Build OK.
- [ ] Pas d’accès Firestore direct depuis React.
- [ ] Pas de règle métier dupliquée.
- [ ] Pas de nouvelle source de vérité inutile.
- [ ] Permissions respectées.
- [ ] Security Rules adaptées si nécessaire.
- [ ] Query invalidation ciblée.
- [ ] Responsive vérifié.
- [ ] Documentation mise à jour si décision modifiée.
- [ ] PR claire et ciblée.

---

# 56. Règle finale

Avant toute décision technique, se demander :

```text
Est-ce cohérent avec le modèle métier ?
Est-ce une nouvelle source de vérité ?
Est-ce sécurisé ?
Est-ce testable ?
Est-ce réutilisable ?
Est-ce vraiment nécessaire ?
```

Si la réponse à l’une de ces questions révèle un conflit avec les documents V1.0, ne pas contourner le problème.

CoachPulse V2 doit rester :

```text
simple
modulaire
explicable
sécurisé
testable
maintenable
```

La priorité n’est pas de coder vite.

La priorité est de ne pas recréer la dette structurelle de CoachPulse V1.


---

# Addendum de cohérence V1.1

## TestBenchmark
Les objectifs de tests utilisent `TestBenchmark`.

Ne jamais :
- coder les objectifs U12/U13/U14 directement dans un composant ;
- modifier un TestResult pour refléter un objectif ;
- comparer silencieusement des protocoles incompatibles.

## Saison CLOSED
Une saison clôturée est read-only par défaut. Toute correction requiert `history.correctClosedSeason` dans le contexte Team concerné.

## FIRST_TEAM
Ne jamais forcer `seasonId` ou `categoryId` sur une Team `FIRST_TEAM`.

## PlayerProfile
Enum canonique :

```text
GOALKEEPER
DEFENDER
MIDFIELDER
FORWARD
```

Ne pas créer `ATTACKER` comme valeur concurrente.

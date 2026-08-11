# COACHPULSE_V2_SPEC.md

## CoachPulse V2 — Spécification maître

**Version :** 1.0  
**Statut :** Référence produit et technique  
**Rôle :** document d’entrée principal pour comprendre CoachPulse V2.

---

# 1. Vision

CoachPulse V2 est une application de suivi sportif destinée aux équipes, staffs et joueuses de football.

La V2 repart de zéro sur le code.

CoachPulse V1 sert uniquement de référence pour :
- les fonctionnalités validées ;
- les règles métier ;
- l’ergonomie utile ;
- les données existantes ;
- les besoins utilisateurs.

> On migre les fonctionnalités, les règles métier et les données, jamais le code legacy.

---

# 2. Objectifs V2

CoachPulse V2 doit être :

```text
modulaire
maintenable
testable
performante
sécurisée
responsive
extensible
compréhensible
```

Un module doit pouvoir évoluer sans casser les autres.

---

# 3. Documents normatifs

Cette spécification doit être lue avec :

```text
DATA_MODEL.md
BUSINESS_RULES.md
MODULES_V1_A_CONSERVER.md
PERMISSIONS_MODEL.md
FIRESTORE_STRUCTURE.md
ARCHITECTURE_DECISIONS.md
MIGRATION_PLAN_V1_TO_V2.md
AGENTS.md
```

En cas de doute, Codex ne doit jamais inventer une règle métier absente de ces documents.

---

# 4. Principes fondamentaux

```text
1 donnée = 1 source de vérité
1 règle métier = 1 implémentation
1 concept métier = 1 type canonique
1 composant UI générique = réutilisable
```

Interdictions structurelles :

```text
aucun accès Firestore directement depuis une Page React
aucune duplication volontaire de logique métier
aucun chargement massif de la base au démarrage
aucune permission reposant uniquement sur l'UI
aucune copie directe du code V1
```

---

# 5. Stack

```text
Vite
React
TypeScript
React Router
TanStack Query
Zod

Firebase Authentication
Cloud Firestore
Firebase Storage
Firebase Hosting
Cloud Functions

Vitest
React Testing Library
Firebase Emulator Suite

GitHub
GitHub Actions
```

CoachPulse est préparée comme PWA légère.

---

# 6. Architecture

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
Firebase / Cloud Functions
```

Les règles métier vivent principalement dans les services/domain rules.

Les repositories gèrent la persistance.

Les composants graphiques ne contiennent aucune règle métier.

---

# 7. Context globaux

Les Context globaux restent limités à des états réellement globaux, notamment :

```text
AuthContext
UserContext
ActiveRoleContext
TeamContext
SeasonContext
```

Les Players, Matches, Sessions, Tests et autres données métier ne sont pas chargés dans un énorme Context global.

---

# 8. Server state

TanStack Query est la couche officielle de gestion du server state côté React.

Elle gère notamment :

```text
cache
query lifecycle
mutations
invalidation ciblée
prefetch
loading/error states
```

Firestore reste la source de vérité persistante.

---

# 9. Identifiants centraux

CoachPulse V2 repose notamment sur :

```text
userId
playerId
teamId
seasonId
sessionId
matchId
```

Les IDs sont stables et indépendants des libellés affichés.

---

# 10. Player

`Player` représente l’identité sportive durable d’une joueuse.

Il contient notamment :
- identité ;
- date de naissance ;
- nationalité éventuelle ;
- date d'arrivée au club éventuelle ;
- dernier club quitté éventuel ;
- photo éventuelle ;
- profil de joueuse ;
- pied fort ;
- statut.

Il ne contient pas comme vérité permanente :
- teamId ;
- categoryId ;
- subCategoryId ;
- seasonId ;
- poste principal ;
- numéro de maillot.

---

# 11. Profil joueuse

Le profil général d’une joueuse remplace la notion de poste principal permanent.

Profils initiaux :

```text
GOALKEEPER
DEFENDER
MIDFIELDER
FORWARD
```

Ce profil appartient au Player.

Les rôles précis occupés pendant un Match appartiennent au contexte Match.

---

# 12. Pied fort

Le Player définit son pied fort.

Les tests techniques utilisent des concepts tels que :

```text
STRONG_FOOT
WEAK_FOOT
ALTERNATING
```

et non une logique métier figée "pied droit/pied gauche".

---

# 13. Saison, sous-catégorie et catégorie

La sous-catégorie effective dépend de :

```text
Player.birthDate
+
Season
```

Puis :

```text
SubCategory
→ Category
```

Une catégorie peut être reliée à une ou plusieurs Teams selon le modèle défini.

---

# 14. Team

Team est une entité sportive centrale.

Les permissions sportives sont principalement évaluées dans un contexte Team.

Un utilisateur peut avoir accès à plusieurs Teams.

Les Teams de développement peuvent être rattachées à une Season et une Category.

L'équipe première est une exception validée : elle n'est automatiquement reliée ni à une Season ni à une Category ; son contexte est défini manuellement.

---

# 15. Affectations joueuse / équipe

Une joueuse peut appartenir simultanément à plusieurs Teams.

La relation est portée par :

```text
PlayerTeamAssignment
```

Types initiaux :

```text
PRIMARY
SECONDARY
TEMPORARY
```

Les affectations sont temporelles :

```text
startDate
endDate?
```

L’équipe principale est définie manuellement et n’est pas déduite automatiquement de la catégorie.

---

# 16. Authentication / User

Firebase Authentication gère l’authentification.

`User` représente le profil applicatif.

Un User peut avoir :
- plusieurs rôles ;
- plusieurs accès Team ;
- un rôle actif ;
- éventuellement un `linkedPlayerId` s’il s’agit d’un compte joueuse.

---

# 17. Rôles initiaux

CoachPulse propose initialement :

```text
Admin
Responsable Formation
Responsable de pôle Formation
Responsable de pôle Pré-formation
Responsable de pôle École de foot
Responsable de pôle Préparateur physique
Coach principal
Coach adjoint
Préparateur physique
Dirigeant
Analyste vidéo
Kiné
Médecin
```

Les rôles restent ajoutables, modifiables et désactivables.

---

# 18. Multi-rôle

Un utilisateur peut posséder plusieurs rôles.

Après connexion, il peut sélectionner son rôle actif et le modifier à tout moment.

Les permissions effectives sont recalculées selon :
- User ;
- rôle actif ;
- Team ;
- permission demandée ;
- niveau médical éventuel.

---

# 19. Permissions

Les permissions sont explicites.

Exemples :

```text
players.read
players.write

matches.read
matches.write

attendance.read
attendance.write

tests.read
tests.write

medical.read
medical.write
```

Les niveaux/permissions restent configurables selon le modèle défini dans `PERMISSIONS_MODEL.md`.

---

# 20. Team scope

Les autorisations sont liées aux Teams accessibles.

Pour les domaines collectifs basés sur Category, l’accès suit le principe validé :

```text
UserTeamAccess.teamId
→ Team.categoryId
→ données de la Category
```

avec permission adéquate.

---

# 21. Compte joueuse / SELF

Les joueuses peuvent posséder un compte.

Le lien est :

```text
User.linkedPlayerId
→ Player.playerId
```

Le scope SELF limite strictement l’utilisateur à ses propres données lorsque la permission utilise ce scope.

Exemple : une joueuse ne peut saisir son RPE que pour elle-même et pour une Session à laquelle elle participe.

---

# 22. Saison active

CoachPulse utilise un contexte de saison active.

Une saison `CLOSED` est en lecture seule par défaut. Une correction historique nécessite une permission spécifique et un audit lorsque l'opération est sensible.

Les requêtes doivent être limitées à la saison utile lorsque le domaine est saisonnier.

---

# 23. Session

Règle structurante :

> 1 Session = 1 Category.

Si plusieurs catégories s’entraînent au même moment :

```text
Category A → Session A
Category B → Session B
```

Même lieu et même horaire n’impliquent pas une Session unique.

---

# 24. SessionParticipant

`SessionParticipant` fige les joueuses attendues/invitées pour une Session.

Il évite que l’évolution future des affectations Team modifie artificiellement l’historique de la séance.

---

# 25. Attendance

Une Attendance relie :

```text
Session
+
Player
```

Il ne peut exister qu’une Attendance canonique par couple Session/Player.

---

# 26. RPE

Un RPE relie :

```text
Session
+
Player
```

Le modèle prend en charge la perception de qualité de séance et la perception d’effort selon les règles validées.

---

# 27. Training Load

La charge d’entraînement n’est pas une source indépendante.

Elle est dérivée à partir de données telles que :

```text
Session
Attendance
RPE
```

Les formules exactes sont centralisées dans les règles métier.

---

# 28. Tests

Le système de tests doit être extensible.

Architecture :

```text
TestDefinition
TestSession
TestResult
```

Cela permet d’ajouter de nouveaux tests sans créer une nouvelle architecture ou collection par test.

Exemples :

```text
jongles
sprint
Cooper
conduite
passe
```

---

# 29. TestDefinition

Décrit le protocole :
- nom ;
- version ;
- mesures ;
- unités ;
- règles d’interprétation ;
- nombre éventuel de tentatives.

Les changements importants de protocole doivent être versionnés.

---

# 30. TestSession

Règle :

> 1 TestSession = 1 Category.

L’accès suit le même principe Team → Category que les Sessions.

---

# 31. TestResult

Relie :

```text
TestSession
+
Player
```

Les valeurs manquantes ou inconnues ne doivent jamais être transformées en `0` si zéro est une valeur métier valide.

## TestBenchmark

Les objectifs/références de tests sont configurables par sous-catégorie.

Ils permettent :
- comparaison joueuse ↔ objectif ;
- comparaison de générations différentes ;
- comparaison d'une même joueuse entre saisons ;
- comparaison de plusieurs joueuses sur une même saison.

Les comparaisons utilisent uniquement des protocoles/versions et métriques compatibles.

---

# 32. Match

Un Match est relié à :

```text
Team
```

et non directement à une Category.

Il possède également son contexte Season et sa configuration sportive.

---

# 33. Formats Match

Le système doit prendre en charge plusieurs formats, notamment le foot à 8 et le foot à 11.

Les rôles et dispositifs sont configurables et extensibles.

---

# 34. Rôles foot à 8

Catalogue initial :

```text
GB
DG
DCG
DC
DCD
DD
MG
MCG
MC
MCD
MD
AG
ACG
AC
ACD
AD
```

Dispositifs initiaux validés :

```text
3-3-1
3-2-2
2-4-1
3-1-3
2-3-2
2-2-3
```

Chaque dispositif définit ses slots/rôles.

---

# 35. Rôles foot à 11

Catalogue initial :

```text
GB
LG
DCG
DC
DCD
LD
MG
MCG
MC
MCD
MD
AG
ACG
AC
ACD
BU
```

Dispositifs initiaux :

```text
4-4-2
4-2-3-1
4-3-1-2
3-5-2
3-4-2-1
```

Les rôles et systèmes restent modifiables/ajoutables.

---

# 36. MatchParticipant

Fige les joueuses participant au Match.

---

# 37. MatchPlayerPeriod

Source de vérité pour :
- temps de jeu ;
- temps par rôle ;
- titularisation ;
- périodes de présence ;
- gardienne active.

Les statistiques de temps ne doivent pas être saisies manuellement si elles peuvent être dérivées de ces périodes.

---

# 38. MatchEvent

`MatchEvent` est la source brute principale des statistiques terrain.

Un événement représente une action métier réellement saisie.

Les statistiques et agrégations sont dérivées à partir de ces événements.

---

# 39. Événements extensibles

Les types d’événements doivent pouvoir évoluer.

La configuration initiale peut contenir notamment :

```text
GOAL
SHOT_ON_TARGET
SHOT_OFF_TARGET
CROSS
PROGRESSION
RECOVERY
DUEL_WON
DUEL_LOST
DUEL_NEUTRAL
SAVE
OUT_OF_BOUNDS
...
```

La liste exacte est définie dans le modèle/règles métier et peut être étendue proprement.

---

# 40. GOAL

GOAL est un événement principal.

Il dérive notamment :
- un but ;
- un tir cadré ;
- la buteuse ;
- éventuellement une passe décisive ;
- le score ;
- un changement immédiat de possession.

Quand un but est enregistré, la possession passe immédiatement à l’équipe qui vient d’encaisser.

---

# 41. Assist

La passe décisive est une propriété du GOAL lorsqu’elle existe.

Lors de la saisie d’un but, l’application peut demander :
1. passe décisive ?
2. si oui, par quelle joueuse ?

---

# 42. SAVE

Un arrêt gardienne implique nécessairement un tir cadré adverse.

Il ne faut donc pas saisir deux événements indépendants pour représenter la même action.

SAVE permet de dériver :
- arrêt gardienne ;
- tir cadré adverse.

---

# 43. Coordonnées terrain

La source spatiale est :

```text
coordinates.x
coordinates.y
```

normalisée.

`pitchZoneId` est dérivé des coordonnées et de la grille active.

Les heatmaps utilisent les mêmes données source.

---

# 44. Possession

La possession fait partie de l’état du Match.

Elle commence au coup d’envoi.

Elle change lorsque les événements métier indiquent un changement de possession, par exemple selon les règles validées :
- but ;
- duel ;
- ballon sorti ;
- autres événements configurés.

Les règles de possession doivent être centralisées.

---

# 45. Blessures

`Injury` représente un épisode de blessure.

Il contient les informations utiles au suivi sportif :
- zone ;
- côté ;
- douleur ;
- disponibilité ;
- dates ;
- statut ;
- retour estimé éventuel.

---

# 46. InjuryUpdate

Permet de suivre l’évolution d’une blessure dans le temps sans écraser l’historique.

---

# 47. CareAppointment

Permet de représenter les rendez-vous de prise en charge associés ou non à une blessure.

---

# 48. MedicalRecord

Les informations médicales sensibles sont séparées du simple suivi sportif.

Elles disposent de règles d’accès spécifiques.

---

# 49. Accès médical

Un MedicalRecord peut utiliser :

```text
accessTeamIds[]
```

pour autoriser plusieurs contextes Team sans dupliquer le dossier.

L’accès dépend notamment de :
- User actif ;
- rôle actif ;
- TeamAccess ;
- permission médicale ;
- niveau d’accès médical.

---

# 50. Niveaux médicaux initiaux

Hiérarchie initiale :

```text
NONE
SPORT
RESTRICTED
MEDICAL
```

Les niveaux doivent rester modifiables/configurables.

---

# 51. Fiche joueuse

La fiche joueuse n’est pas une nouvelle source de données.

Elle agrège les domaines reliés au même `playerId`.

Exemples :

```text
identité
affectations
présences
RPE / charge
tests
Match stats
blessures
données médicales autorisées
évolution
```

Chaque bloc est chargé progressivement selon le besoin et les permissions.

---

# 52. Fiche équipe

La fiche équipe agrège les données reliées au même `teamId`.

Elle peut présenter :
- résultats ;
- statistiques ;
- évolution ;
- effectif ;
- indicateurs collectifs.

Elle ne duplique pas les données sources.

---

# 53. Analyse équipe

L’analyse équipe utilise des agrégations calculées depuis les sources métier.

Les projections persistées ne sont ajoutées que si un besoin de performance réel est démontré.

---

# 54. Données dérivées

Principe :

> Une donnée calculable de manière fiable depuis les sources canoniques reste dérivée par défaut.

Exemples :
- charge ;
- score ;
- statistiques Match ;
- heatmaps ;
- temps par rôle ;
- synthèses.

Pas de projection prématurée.

---

# 55. Firestore

Firestore est la source de vérité persistante commune.

Collections racine principales prévues :

```text
users
roles
userTeamAccess

seasons
subCategories
categories
teams

players
playerTeamAssignments

sessions
sessionParticipants
attendance
rpe

testDefinitions
testBenchmarks
testSessions
testResults

matches
matchParticipants
matchLineups
matchPlayerPeriods
matchEvents
matchRoles
formations
matchEventDefinitions
pitchGridDefinitions
dangerZoneDefinitions

injuries
injuryUpdates
careAppointments
medicalRecords

auditLogs
```

La structure détaillée est définie dans `FIRESTORE_STRUCTURE.md`.

---

# 56. Security Rules

Les permissions sont respectées à trois niveaux :

```text
UI
Services
Firestore Security Rules
```

et dans les Cloud Functions lorsque celles-ci sont utilisées.

Les Security Rules ne doivent jamais supposer que l’interface a déjà sécurisé l’action.

---

# 57. Audit

Les actions sensibles nécessitant un audit fiable utilisent une autorité serveur.

`AuditLog` sensible est généré côté serveur.

Le client standard ne peut ni modifier ni supprimer librement les logs d’audit.

---

# 58. Cloud Functions

Utilisées lorsqu’une autorité serveur est nécessaire, notamment :
- audit sensible ;
- administration utilisateur sensible ;
- opérations privilégiées ;
- migrations/imports privilégiés ;
- certaines transactions critiques.

Elles ne remplacent pas inutilement tous les services frontend.

---

# 59. Cache et chargement

Démarrage cible :

```text
Authentication
↓
User
↓
Roles
↓
UserTeamAccess
↓
ActiveRole
↓
Season active
↓
Dashboard minimal
```

Aucun téléchargement massif de toute la base.

---

# 60. Chargement progressif

Exemple fiche joueuse :

```text
Player
↓
bloc visible
↓
données nécessaires
↓
autres domaines selon navigation
```

Le médical n’est chargé que si autorisé et nécessaire.

---

# 61. Offline

Priorités offline :

```text
Match live
Attendance
RPE
```

Le Match doit être utilisable hors connexion dès la première V2.

---

# 62. Match offline

Avant un Match, précharger les données nécessaires :
- Match ;
- participantes ;
- formation ;
- rôles ;
- configuration événements.

Les événements peuvent être enregistrés malgré une perte temporaire de réseau.

Un appareil principal de saisie par Match est recommandé afin de réduire les conflits.

---

# 63. Données médicales offline

Les données médicales sensibles ne doivent pas être préchargées massivement pour un usage offline.

---

# 64. PWA

CoachPulse V2 est préparée comme PWA légère dès la fondation.

La PWA gère principalement :
- installation ;
- shell ;
- assets.

Elle ne remplace pas Firestore offline ni TanStack Query.

---

# 65. Responsive

CoachPulse doit être utilisable sur :

```text
ordinateur
tablette
smartphone
```

Le responsive est une exigence structurelle.

Les écrans terrain privilégient les grandes zones tactiles et un nombre limité d’actions.

---

# 66. Gestion des erreurs

Les erreurs techniques sont converties en erreurs applicatives structurées.

Exemples :

```text
AUTH_REQUIRED
PERMISSION_DENIED
PLAYER_NOT_FOUND
PRIMARY_ASSIGNMENT_CONFLICT
MATCH_NOT_EDITABLE
NETWORK_ERROR
```

Les messages Firebase bruts ne doivent pas être affichés directement à l’utilisateur.

---

# 67. Tests

Fondation :

```text
Vitest
React Testing Library
Firebase Emulator Suite
```

Les tests E2E sont ajoutés après stabilisation du premier Dashboard.

Les règles métier critiques et Security Rules doivent avoir des tests.

---

# 68. CI/CD

Workflow de développement :

```text
feature/*
↓
PR dev
↓
CI
↓
review
↓
merge dev
```

Release :

```text
dev
↓
PR main
↓
production
```

CI minimale :

```text
install
typecheck
lint
unit tests
build
```

---

# 69. Environnements

CoachPulse V2 dispose de Firebase DEV et PROD séparés.

```text
V1 Firebase
≠
V2 DEV
≠
V2 PROD
```

La V1 et la V2 ne partagent pas leur base de code.

---

# 70. Migration

La migration V1 → V2 concerne uniquement la saison en cours.

Sont notamment concernés pour cette saison :
- Players utiles ;
- affectations ;
- Sessions ;
- Attendance ;
- RPE ;
- Tests ;
- Matches ;
- MatchEvents ;
- blessures ;
- médical.

Les saisons précédentes restent dans la V1 comme archive.

---

# 71. Pipeline migration

```text
Extract
→ Normalize
→ Validate
→ Resolve IDs
→ Detect duplicates
→ Transform
→ Dry Run
→ Import DEV
→ Verify
→ Migration Report
→ Shadow Mode
→ Freeze V1
→ Delta final
→ Cutover
```

Pas de synchronisation bidirectionnelle permanente.

---

# 72. Comptes V2

Les profils utilisateurs sont recréés dans le modèle V2 puis les utilisateurs sont invités à activer leur accès.

Les comptes joueuses sont activés progressivement.

---

# 73. Première fondation à développer

L’ordre de développement initial est verrouillé :

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

Le Match n’est pas le premier module développé.

---

# 74. Objectif du premier Dashboard

Le premier Dashboard sert principalement à valider :
- Authentication ;
- User ;
- multi-rôle ;
- permissions ;
- TeamContext ;
- SeasonContext ;
- repositories ;
- services ;
- TanStack Query ;
- routing ;
- Firebase DEV ;
- responsive ;
- PWA légère.

Il ne doit pas chercher à reproduire immédiatement tout le Dashboard V1.

---

# 75. Modules fonctionnels cibles

À terme, CoachPulse V2 doit pouvoir couvrir :

```text
Dashboard utilisateur
Gestion équipes
Gestion joueuses
Saisons

Sessions
Présences
RPE
Charge

Tests techniques
Tests athlétiques

Match
Statistiques Match

Fiche joueuse
Fiche équipe
Analyse équipe

Blessures
Suivi médical

Rôles
Permissions

Imports
Exports contrôlés
Migration
Administration
```

L’ordre d’implémentation est décidé progressivement.

---

# 76. Réutilisabilité UI

Composants génériques envisagés :

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

Les composants ne doivent pas embarquer les règles métier du domaine qui les utilise.

---

# 77. Definition of Done

Une fonctionnalité n’est pas terminée uniquement parce que son interface fonctionne.

Selon sa criticité, elle doit respecter :
- modèle de données ;
- types ;
- schemas runtime ;
- architecture ;
- services ;
- repositories ;
- permissions ;
- Security Rules ;
- cache ;
- gestion d’erreurs ;
- responsive ;
- tests.

---

# 78. Règle pour Codex

Avant toute implémentation importante, Codex doit :
1. lire `AGENTS.md` ;
2. identifier les documents métier concernés ;
3. vérifier le modèle existant ;
4. éviter toute nouvelle source de vérité ;
5. éviter toute duplication ;
6. proposer explicitement toute modification d’architecture avant de l’implémenter.

Codex ne doit pas modifier silencieusement une décision V1.0.

---

# 79. Gestion des décisions futures

Lorsqu’une décision validée évolue :
1. modifier le document normatif concerné ;
2. documenter la nouvelle décision ;
3. adapter le code ;
4. adapter les tests ;
5. vérifier les migrations éventuelles.

Le code ne doit jamais devenir la seule documentation d’une règle importante.

---

# 80. Références par domaine

Pour comprendre le modèle :
```text
DATA_MODEL.md
```

Pour comprendre les comportements :
```text
BUSINESS_RULES.md
```

Pour comprendre les choix issus de V1 :
```text
MODULES_V1_A_CONSERVER.md
```

Pour comprendre les autorisations :
```text
PERMISSIONS_MODEL.md
```

Pour comprendre Firestore :
```text
FIRESTORE_STRUCTURE.md
```

Pour comprendre l’architecture :
```text
ARCHITECTURE_DECISIONS.md
```

Pour comprendre la migration :
```text
MIGRATION_PLAN_V1_TO_V2.md
```

Pour savoir comment travailler dans le dépôt :
```text
AGENTS.md
```

---

# 81. Décisions SPEC consolidées

## SPEC-001
CoachPulse V2 repart de zéro sur le code.

## SPEC-002
La V1 est une référence fonctionnelle et une archive, pas une base technique.

## SPEC-003
Firestore est la source de vérité persistante commune.

## SPEC-004
playerId, teamId, seasonId, sessionId, matchId et userId sont des identifiants structurants.

## SPEC-005
Player ne contient pas d’équipe permanente.

## SPEC-006
Les affectations Team sont temporelles et peuvent être multiples.

## SPEC-007
Le PRIMARY est défini manuellement.

## SPEC-008
La sous-catégorie dépend de la naissance et de la saison.

## SPEC-009
Une Session appartient à une seule Category.

## SPEC-010
Une TestSession appartient à une seule Category.

## SPEC-011
Un Match appartient à une Team.

## SPEC-012
MatchEvent est la source brute principale des statistiques Match.

## SPEC-013
GOAL dérive le tir cadré et change immédiatement la possession.

## SPEC-014
SAVE dérive le tir cadré adverse.

## SPEC-015
Les coordonnées x/y sont la source spatiale Match.

## SPEC-016
Les rôles et dispositifs Match sont extensibles.

## SPEC-017
Les tests sont configurables via TestDefinition.

## SPEC-018
Les tests utilisent pied fort/pied faible.

## SPEC-019
Les joueuses peuvent posséder un compte SELF.

## SPEC-020
Les utilisateurs peuvent avoir plusieurs rôles et choisir leur rôle actif.

## SPEC-021
Les permissions sont liées au contexte Team.

## SPEC-022
Le médical possède une protection et des niveaux d’accès spécifiques.

## SPEC-023
Les données dérivées ne sont pas persistées prématurément.

## SPEC-024
Aucun accès Firestore direct depuis les Pages React.

## SPEC-025
TanStack Query gère le server state React.

## SPEC-026
Zod gère la validation runtime.

## SPEC-027
Cloud Functions fournit l’autorité serveur lorsque nécessaire.

## SPEC-028
Le Match doit fonctionner offline.

## SPEC-029
Un appareil principal de saisie Match est recommandé.

## SPEC-030
CoachPulse V2 est préparée comme PWA légère.

## SPEC-031
DEV et PROD Firebase sont séparés.

## SPEC-032
Seule la saison en cours est migrée depuis V1.

## SPEC-033
Les saisons historiques restent consultables dans V1.

## SPEC-034
La première fondation est Auth → User → Role → Permissions → Team → Season → Player → Dashboard.

## SPEC-035
Le module Match ne doit pas être le premier module migré.

---

# 82. Principe directeur final

Toute décision future doit favoriser simultanément :

```text
COHÉRENCE MÉTIER
+
SOURCE DE VÉRITÉ UNIQUE
+
SÉCURITÉ
+
MODULARITÉ
+
PERFORMANCE
+
TESTABILITÉ
+
MAINTENABILITÉ
```

CoachPulse V2 ne doit pas rechercher la vitesse de développement au prix d’une dette structurelle identique à celle de la V1.

La fondation doit être suffisamment claire pour qu’un développeur ou Codex puisse savoir :
- où placer une donnée ;
- où placer une règle ;
- comment obtenir une permission ;
- comment charger une information ;
- comment la tester ;
- comment la migrer ;
- et quelles décisions il n’a pas le droit d’inventer.

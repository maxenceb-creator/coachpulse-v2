# CoachPulse V2 — DATA_MODEL.md

**Version : 1.0**  
**Statut : Référence consolidée validée**  
**Projet : CoachPulse V2**

## 1. Principes fondamentaux

CoachPulse V2 est reconstruit de zéro. La V1 sert uniquement de référence fonctionnelle et métier.

Règles structurantes :

- 1 donnée = 1 source de vérité.
- 1 règle métier = 1 implémentation.
- Les identifiants partagés sont utilisés dans tous les domaines.
- Firestore est la source de vérité persistante.
- Les agrégations, statistiques, tendances, heatmaps et synthèses sont dérivées des données sources.
- Les changements futurs d'équipe, de catégorie ou de configuration ne réécrivent jamais l'historique.
- Les modèles doivent rester extensibles sans modification du cœur de l'architecture.

Identifiants centraux :

- `userId`
- `playerId`
- `teamId`
- `seasonId`
- `categoryId`
- `subCategoryId`
- `sessionId`
- `matchId`

---

## 2. User

```ts
User {
  userId
  firstName
  lastName
  email
  status
  createdAt
  updatedAt
}
```

L'utilisateur possède des accès à une ou plusieurs équipes et des permissions fonctionnelles. Le modèle détaillé est défini dans `PERMISSIONS_MODEL.md`.

---

## 3. Season

```ts
Season {
  seasonId
  name
  startDate
  endDate

  status
  isActive

  createdAt
  updatedAt
}
```

Statuts initiaux :

```text
PLANNED
ACTIVE
CLOSED
```

Une Season `CLOSED` est en lecture seule par défaut. Toute correction historique nécessite une autorisation explicite et une traçabilité adaptée.

```ts
```

Une saison sert de contexte temporel principal aux catégories, affectations, séances, tests, matchs et analyses.

---

## 4. Player

`playerId` est l'identifiant unique d'une joueuse dans tous les modules CoachPulse.

```ts
Player {
  playerId
  firstName
  lastName
  birthDate

  nationality?
  clubArrivalDate?
  previousClub?

  photoPath?

  playerProfile
  preferredFoot
  status

  createdAt
  updatedAt
}
```

### PlayerProfile

Le poste principal n'est pas conservé. La joueuse possède un profil général :

```text
GOALKEEPER
DEFENDER
MIDFIELDER
FORWARD
```

Ce profil est distinct du rôle réellement occupé pendant un match.

### PreferredFoot

```text
LEFT
RIGHT
UNKNOWN
```

`preferredFoot` représente le pied fort. Le pied faible est le pied opposé et n'est pas stocké comme seconde donnée indépendante.

Aucun numéro de maillot permanent n'est stocké dans `Player`.

---

## 5. SubCategory

La sous-catégorie est liée à la date de naissance de la joueuse et à la saison.

Exemples : U12, U13, U14.

```ts
SubCategory {
  subCategoryId
  seasonId
  name
  birthYearRule
  createdAt
  updatedAt
}
```

La sous-catégorie d'une joueuse est dérivée depuis :

```text
Player.birthDate + Season -> SubCategory
```

Elle ne doit pas être dupliquée dans chaque module.

---

## 6. Category

Une catégorie regroupe une ou plusieurs sous-catégories pour une saison.

Exemples : U12-U13, U14-U15.

```ts
Category {
  categoryId
  seasonId
  name
  subCategoryIds[]
  status
  createdAt
  updatedAt
}
```

Une catégorie peut être reliée à une ou plusieurs équipes.

---

## 7. Team

```ts
Team {
  teamId

  seasonId?
  categoryId?

  teamType

  name
  status

  createdAt
  updatedAt
}
```

Types initiaux :

```text
DEVELOPMENT
FIRST_TEAM
OTHER
```

Pour une Team `DEVELOPMENT`, `seasonId` et `categoryId` sont renseignés selon le contexte sportif.

L'équipe première (`FIRST_TEAM`) constitue une exception validée : elle n'est automatiquement rattachée ni à une Season ni à une Category. Son contexte est défini manuellement.

L'effectif n'est jamais stocké dans `Team.players[]`. Il est reconstruit à partir des affectations.

---

## 8. PlayerTeamAssignment

Une joueuse peut appartenir à plusieurs équipes simultanément : une affectation principale et des affectations secondaires ou temporaires.

Les affectations dépendent de la saison et d'une période temporelle.

```ts
PlayerTeamAssignment {
  assignmentId
  playerId
  teamId
  seasonId
  assignmentType
  startDate
  endDate?
  createdAt
  updatedAt
}
```

Types :

```text
PRIMARY
SECONDARY
TEMPORARY
```

Une joueuse ne doit pas avoir plusieurs affectations `PRIMARY` actives simultanément dans un même contexte métier incompatible.

Les affectations historiques ne sont jamais réécrites lorsqu'une joueuse change d'équipe.

---

# Domaine Entraînement

## 9. Session

Une Session représente une séance d'entraînement.

**Règle fondamentale : 1 Session = 1 Category.**

```ts
Session {
  sessionId
  seasonId
  categoryId
  title?
  sessionType
  startDateTime
  endDateTime?
  plannedDurationMinutes
  actualDurationMinutes?
  status
  createdByUserId
  createdAt
  updatedAt
}
```

Si plusieurs catégories s'entraînent au même moment, une Session distincte est créée pour chaque catégorie, même si le lieu, l'horaire ou le staff sont identiques.

La population théorique est déterminée par :

```text
Session.categoryId
+ Session.seasonId
+ date
-> Teams de la Category
-> PlayerTeamAssignments actives
-> Players dédupliquées par playerId
```

---

## 10. SessionParticipant

Permet de figer/adapter les participantes réelles et notamment les invitations ponctuelles sans modifier les affectations structurelles.

```ts
SessionParticipant {
  sessionParticipantId
  sessionId
  playerId
  participationType
  addedByUserId?
  createdAt
  updatedAt
}
```

Types initiaux :

```text
EXPECTED
INVITED
```

Une joueuse peut donc participer ponctuellement à une séance d'une autre catégorie sans changer son affectation normale.

---

## 11. Attendance

```ts
Attendance {
  attendanceId
  sessionId
  playerId
  status
  arrivalDelayMinutes?
  participationDurationMinutes?
  reason?
  note?
  recordedByUserId
  createdAt
  updatedAt
}
```

Contrainte d'unicité :

```text
sessionId + playerId
```

Statuts initiaux :

```text
PRESENT
LATE
ABSENT_JUSTIFIED
ABSENT_UNJUSTIFIED
INJURED
SICK
EXTERNAL_PROGRAM
EXCUSED
```

`Attendance.status = INJURED` ne remplace pas une `Injury`.

---

## 12. RPE

```ts
RPE {
  rpeId
  sessionId
  playerId
  perceivedQuality
  perceivedExertion
  comment?
  submittedAt
  source
  createdAt
  updatedAt
}
```

Contrainte d'unicité :

```text
sessionId + playerId
```

`perceivedQuality` : note de 1 à 10.  
`perceivedExertion` : RPE de 1 à 10.

Sources :

```text
PLAYER
STAFF
IMPORT
```

### Charge d'entraînement

La charge est dérivée :

```text
effectiveDuration × perceivedExertion
```

Priorité de durée :

1. `Attendance.participationDurationMinutes`
2. `Session.actualDurationMinutes`
3. `Session.plannedDurationMinutes`

La charge calculée n'est pas une seconde source de vérité.

---

# Domaine Tests

## 13. Architecture commune

Tests techniques et athlétiques utilisent le même moteur :

```text
TestDefinition -> TestSession -> TestResult -> Player
```

Il ne doit pas exister deux architectures indépendantes pour les tests techniques et physiques.

---

## 14. TestDefinition

```ts
TestDefinition {
  testDefinitionId
  name
  code
  description?
  domain
  status
  version
  metrics[]
  attemptPolicy?
  createdAt
  updatedAt
}
```

Domaines :

```text
TECHNICAL
PHYSICAL
```

Statuts :

```text
ACTIVE
INACTIVE
ARCHIVED
```

Un protocole fortement modifié incrémente `version` et possède un identifiant de
définition/version stable. Il ne réécrit jamais la version utilisée par
l'historique.

---

## 15. MetricDefinition

```ts
MetricDefinition {
  metricKey
  label
  valueType
  unit
  direction
  precision?
  minValue?
  maxValue?
  required
}
```

Directions :

```text
HIGHER_IS_BETTER
LOWER_IS_BETTER
NEUTRAL
```

Type initial PR06 :

```text
NUMBER
```

Les unités initiales sont normalisées : `COUNT`, `SECOND`, `METER`,
`CENTIMETER`, `KM_H`.

---

## 16. Tests pied fort / pied faible

Lorsqu'un test compare les deux pieds, les métriques sont relatives au profil de la joueuse :

```text
strongFoot
weakFoot
```

et non `rightFoot` / `leftFoot`.

Exemple Jongles :

```ts
metrics: [
  { metricKey: "strongFoot", label: "Pied fort", unit: "repetitions", performanceDirection: "HIGHER_IS_BETTER" },
  { metricKey: "weakFoot", label: "Pied faible", unit: "repetitions", performanceDirection: "HIGHER_IS_BETTER" },
  { metricKey: "alternating", label: "Alternés", unit: "repetitions", performanceDirection: "HIGHER_IS_BETTER" }
]
```

L'interprétation droite/gauche est dérivée de `Player.preferredFoot`.

---

## 17. Tests extensibles

Un nouveau test (conduite, passe, frappe, sprint, etc.) doit être ajouté par une nouvelle `TestDefinition`, sans créer une nouvelle architecture, collection ou service principal.

Exemples :

```text
Jongles -> strongFoot / weakFoot / alternating
Conduite -> time / errors
Passe -> strongFootSuccessful / weakFootSuccessful
Sprint -> time
```

Les ratios et pourcentages dérivables sont calculés depuis les mesures sources.

---

## 18. TestBenchmark

Les objectifs/références de performance sont configurables et reliés à une sous-catégorie.

```ts
TestBenchmark {
  testBenchmarkId

  testDefinitionId
  testDefinitionVersion
  metricKey
  subCategoryId

  benchmarkLevel
  targetType
  targetValue

  seasonId?
  validFrom?
  validTo?

  label?
  status

  createdAt
  updatedAt
}
```

Exemples de niveaux :

```text
TARGET
GOOD
VERY_GOOD
REFERENCE
```

Les niveaux restent configurables.

Un TestBenchmark ne modifie jamais un TestResult. Il sert uniquement de référence d'interprétation/comparaison.

CoachPulse doit permettre :
- comparaison joueuse ↔ benchmark de sa sous-catégorie ;
- comparaison de générations différentes à sous-catégorie équivalente ;
- comparaison d'une même joueuse entre plusieurs saisons ;
- comparaison de plusieurs joueuses sur une même saison.

Les comparaisons nécessitent des protocoles/versions, métriques et unités compatibles.

Un benchmark saisonnier est sécurisé dans le contexte Team actif : sa
`subCategoryId` doit appartenir à la Category de la Team et son `seasonId` doit
correspondre à la saison active.

---

## 19. TestSession

```ts
TestSession {
  testSessionId
  testDefinitionId
  testDefinitionVersion
  teamId
  seasonId
  categoryId
  date
  status
  createdBy
  createdAt
  updatedAt
}
```

**1 TestSession = 1 Category.**

Si deux catégories réalisent le même test le même jour, deux TestSession sont créées.

Statuts PR07 :

```text
DRAFT
COMPLETED
```

La Team, la Season et la Category sont figées à la création. `DRAFT` autorise
la saisie et la correction ; `COMPLETED` est verrouillé. Une correction future
d'une session terminée nécessitera une permission dédiée. Aucun champ vide de
présentation (`title`, `location`, `notes`) n'est ajouté sans besoin métier.

---

## 20. TestResult

```ts
TestResult {
  testResultId
  testSessionId
  testDefinitionId
  testDefinitionVersion
  playerId
  teamId
  seasonId
  values
  contextSnapshot.preferredFoot
  createdBy
  createdAt
  updatedAt
}
```

Contrainte :

```text
testSessionId + playerId
```

est unique.

Exemple :

```ts
values: {
  STRONG_FOOT: 42,
  WEAK_FOOT: 31,
  ALTERNATING: 55
}
```

Une valeur `0` est persistée et affichée comme un résultat réel. Une joueuse
non testée n'a pas de TestResult ; aucun document vide ni zéro artificiel n'est
créé. Le snapshot minimal de pied conserve l'interprétation historique des
métriques relatives sans recopier le protocole.

Meilleures performances, moyennes, médianes, progressions et classements sont dérivés.

---

# Domaine Blessures et Médical

## 20. Séparation fondamentale

```text
Injury = suivi sportif d'un épisode physique
MedicalRecord = contenu médical/paramédical plus sensible
```

L'accès à Injury ne donne pas automatiquement accès aux MedicalRecord.

---

## 21. Injury

```ts
Injury {
  injuryId
  playerId
  seasonId
  startDate
  endDate?
  bodyArea
  side?
  injuryType?
  description?
  painLevel?
  availabilityStatus
  expectedReturnDate?
  status
  reportedByUserId?
  createdAt
  updatedAt
}
```

`painLevel` : 1 à 10.

Zones corporelles structurées, par exemple :

```text
HEAD, NECK, SHOULDER, ARM, ELBOW, WRIST, HAND,
BACK, HIP, GROIN,
THIGH, KNEE, CALF, ANKLE, FOOT, OTHER
```

Côtés :

```text
LEFT
RIGHT
BILATERAL
CENTER
NOT_APPLICABLE
```

Disponibilité :

```text
FULL_AVAILABLE
LIMITED
NO_TRAINING
NO_MATCH
UNAVAILABLE
RETURN_TO_PLAY
```

Cycle de vie :

```text
OPEN
MONITORING
RECOVERING
CLOSED
```

La visualisation corporelle utilise `bodyArea + side` mais ne contient aucune logique médicale.

---

## 22. InjuryUpdate

L'évolution ne doit pas écraser l'historique.

```ts
InjuryUpdate {
  injuryUpdateId
  injuryId
  date
  painLevel?
  availabilityStatus?
  note?
  createdByUserId
  createdAt
}
```

---

## 23. MedicalRecord

```ts
MedicalRecord {
  medicalRecordId
  playerId
  injuryId?

  accessTeamIds[]

  recordType
  date
  providerType?
  summary?
  recommendations?
  restrictions?
  nextReviewDate?
  confidentialityLevel
  createdByUserId
  createdAt
  updatedAt
}
```

Types possibles :

```text
CONSULTATION
PHYSIO
MEDICAL_VISIT
FOLLOW_UP
RESTRICTION
RETURN_TO_PLAY
OTHER
```

Professionnels :

```text
DOCTOR
PHYSIOTHERAPIST
OSTEOPATH
CLUB_MEDICAL_STAFF
OTHER
```

Niveaux de confidentialité proposés :

```text
SPORT
RESTRICTED
MEDICAL
```

---

## 24. CareAppointment

Le suivi organisationnel d'un rendez-vous est séparé de son contenu médical.

```ts
CareAppointment {
  careAppointmentId
  playerId
  injuryId?

  accessTeamIds[]

  providerType
  status
  scheduledDate?
  completedDate?
  createdAt
  updatedAt
}
```

Statuts :

```text
TO_SCHEDULE
SCHEDULED
COMPLETED
CANCELLED
```

---

# Domaine Match

## 25. Principe du moteur Match

Le Match V2 est un moteur événementiel, pas une page contenant ses propres compteurs.

Sources principales :

```text
Match
MatchParticipant
MatchLineup
MatchPlayerPeriod
MatchEvent
MatchEventDefinition
MatchRoleDefinition
FormationDefinition
```

Les statistiques sont dérivées.

---

## 26. Match

```ts
Match {
  matchId
  seasonId
  teamId
  date
  startDateTime?
  competitionType
  competitionName?
  opponent
  venue?
  locationType
  format
  periodConfiguration
  pitchOrientation
  status
  createdByUserId
  createdAt
  updatedAt
}
```

**1 Match = 1 Team.**

Formats initiaux :

```text
FOOTBALL_8
FOOTBALL_11
FUTSAL
OTHER
```

La durée est configurable :

```ts
PeriodConfiguration {
  numberOfPeriods
  durationMinutesPerPeriod
}
```

Statuts :

```text
PLANNED
READY
IN_PROGRESS
PAUSED
COMPLETED
CANCELLED
ARCHIVED
```

Le score n'est pas stocké comme source indépendante : il est dérivé des `GOAL`.

---

## 27. MatchParticipant

```ts
MatchParticipant {
  matchParticipantId
  matchId
  playerId
  participantStatus
  playerProfileSnapshot?
  createdAt
}
```

Les participantes sont figées pour préserver l'historique du groupe, indépendamment des affectations futures.

---

## 28. MatchRoleDefinition

Le rôle Match est distinct du profil général Player.

```ts
MatchRoleDefinition {
  matchRoleId
  code
  label
  matchFormat
  roleFamily
  isActive
  createdAt
  updatedAt
}
```

### Catalogue initial Foot à 8

```text
GB
DG, DCG, DC, DCD, DD
MG, MCG, MC, MCD, MD
AG, ACG, AC, ACD, AD
```

### Catalogue initial Foot à 11

```text
GB
LG, DCG, DC, DCD, LD
MG, MCG, MC, MCD, MD
AG, ACG, AC, ACD, BU
```

Les rôles sont configurables et extensibles. De nouveaux rôles doivent pouvoir être ajoutés ou modifiés ultérieurement.

---

## 29. FormationDefinition

```ts
FormationDefinition {
  formationId
  name
  matchFormat
  slots[]
  isActive
  createdAt
  updatedAt
}
```

```ts
FormationSlot {
  slotId
  matchRoleId
  normalizedX
  normalizedY
  displayOrder?
}
```

Les dispositifs ne sont pas codés en dur dans l'UI.

### Foot à 8 — dispositifs initiaux

**3-3-1**

```text
GB | DG DC DD | MG MC MD | AC
```

**3-2-2**

```text
GB | DG DC DD | MCG MCD | ACG ACD
```

**2-4-1**

```text
GB | DCG DCD | MG MCG MCD MD | AC
```

**3-1-3**

```text
GB | DG DC DD | MC | AG AC AD
```

**2-3-2**

```text
GB | DCG DCD | MG MC MD | ACG ACD
```

**2-2-3**

```text
GB | DCG DCD | MCG MCD | AG AC AD
```

### Foot à 11 — dispositifs initiaux

```text
4-4-2
4-2-3-1
4-3-1-2
3-5-2
3-4-2-1
```

Le détail des slots Foot à 11 sera configuré dans les FormationDefinition. Les dispositifs doivent pouvoir être ajoutés ou modifiés plus tard.

---

## 30. MatchLineup

```ts
MatchLineup {
  matchLineupId
  matchId
  formationId
  validFromGameSecond
  validToGameSecond?
  createdAt
}
```

Un dispositif peut changer pendant le match.

---

## 31. MatchPlayerPeriod

Source de vérité du temps de jeu et du temps par rôle.

```ts
MatchPlayerPeriod {
  matchPlayerPeriodId
  matchId
  playerId
  matchRoleId
  startGameSecond
  endGameSecond?
  createdByEventId?
  createdAt
}
```

Un changement de joueuse ferme la période de la sortante et ouvre celle de l'entrante.

Un changement de rôle ferme la période courante et en ouvre une nouvelle.

Le temps de jeu n'est jamais calculé à partir du nombre d'événements réalisés.

---

## 32. Temps logique du Match

Les événements utilisent :

```text
gameSecond
```

et non uniquement l'heure réelle de l'appareil.

Cela permet pause, reprise, mi-temps, corrections et durées variables.

---

## 33. MatchEvent

```ts
MatchEvent {
  matchEventId
  matchId
  gameSecond
  periodNumber
  eventType
  teamSide
  playerId?
  coordinates?
  metadata?
  createdByUserId
  createdAt
  updatedAt?
  deletedAt?
}
```

`teamSide` :

```text
COACHPULSE
OPPONENT
```

Le même moteur est utilisé pour CoachPulse et l'adversaire.

---

## 34. MatchEventDefinition

Les événements sont centralisés et extensibles.

```ts
MatchEventDefinition {
  eventTypeId
  code
  label
  isActive
  requiresPlayer
  allowsOpponentWithoutPlayer
  requiresCoordinates
  possessionEffect
  statisticalEffects[]
  allowedMetadata[]
  createdAt
  updatedAt
}
```

Liste initiale validée :

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
DANGER_ZONE_ENTRY
SAVE
```

Des événements supplémentaires doivent pouvoir être ajoutés plus tard sans reconstruire l'architecture.

`BALL_OUT` et `KICKOFF` peuvent être utilisés par le moteur de possession selon les règles métier finales.

---

## 35. GOAL

Un `GOAL` :

- augmente automatiquement le score ;
- compte automatiquement comme tir cadré ;
- peut contenir une passe décisive ;
- change immédiatement la possession en faveur de l'équipe qui a encaissé.

Exemple :

```ts
MatchEvent {
  eventType: "GOAL"
  teamSide: "COACHPULSE"
  playerId: scorerPlayerId
  metadata: {
    assistPlayerId?: string
  }
}
```

Lors de la saisie d'un but CoachPulse, l'interface demande :

```text
Y a-t-il une passe décisive ?
```

Si oui, elle demande la joueuse concernée.

La passe décisive est une propriété du GOAL et non un événement indépendant.

Un seul événement `GOAL` est enregistré : le moteur statistique sait qu'il contribue également aux tirs cadrés.

---

## 36. Spatialisation

La donnée spatiale primaire est constituée de coordonnées normalisées :

```ts
coordinates: {
  x: number // 0..1
  y: number // 0..1
}
```

Le référentiel normalisé est toujours :

```text
but CoachPulse à gauche
attaque CoachPulse vers la droite
```

L'interface applique le miroir nécessaire lors des changements physiques de côté.

`pitchZoneId` est dérivé des coordonnées via une grille.

---

## 37. PitchGridDefinition

```ts
PitchGridDefinition {
  pitchGridId
  name
  matchFormat
  rows
  columns
  version
  isActive
}
```

Grille initiale : `GRID_3X3_V1`.

Organisation historique 3 × 3 :

```text
3 | 6 | 9
2 | 5 | 8
1 | 4 | 7
```

Les coordonnées originales permettent de recalculer les zones si la grille évolue.

Heatmaps, compteurs, tooltips et analyses utilisent les mêmes MatchEvent. Il n'existe aucune liste parallèle dédiée aux heatmaps.

---

## 38. Danger Zone

L'ancienne notion « entrée dans les 20 m » devient une notion générique :

```text
DANGER_ZONE_ENTRY
```

La définition de la zone dépend du format.

```ts
DangerZoneDefinition {
  dangerZoneId
  matchFormat
  minNormalizedX
  maxNormalizedX
  label
}
```

---

## 39. Possession

La possession fait partie du moteur Match et est dérivée des événements.

États :

```text
COACHPULSE
OPPONENT
UNKNOWN
```

Les événements pouvant provoquer un changement comprennent notamment :

```text
KICKOFF
GOAL
RECOVERY
DUEL_WON
DUEL_LOST
BALL_OUT
```

La liste et les règles exactes sont centralisées dans `BUSINESS_RULES.md`.

### Règle GOAL validée

```text
GOAL par COACHPULSE -> possession OPPONENT immédiatement
GOAL par OPPONENT -> possession COACHPULSE immédiatement
```

Aucun événement KICKOFF supplémentaire n'est nécessaire après un but pour effectuer ce changement.

### PossessionEffect

Valeurs conceptuelles :

```text
NONE
TEAM_GAINS_POSSESSION
TEAM_LOSES_POSSESSION
OPPOSITE_TEAM_GAINS_POSSESSION
RESET_REQUIRED
```

Les segments de possession sont dérivés :

```ts
PossessionSegment {
  startGameSecond
  endGameSecond
  teamSide
}
```

Le pourcentage est calculé à partir des durées de possession connues. Un cache temps réel peut être utilisé, mais il doit être entièrement recalculable depuis les événements.

---

## 40. Statistiques Match dérivées

Les MatchEvent permettent notamment de reconstruire :

- score ;
- buts ;
- passes décisives ;
- tirs cadrés ;
- tirs non cadrés ;
- centres ;
- progressions ;
- récupérations ;
- duels gagnés/perdus/neutres ;
- entrées en zone dangereuse ;
- arrêts ;
- possession ;
- heatmaps.

Les MatchPlayerPeriod permettent de reconstruire :

- temps de jeu ;
- temps par rôle ;
- composition initiale ;
- changements ;
- historique tactique.

Les buts encaissés d'une gardienne sont attribuables à la gardienne active via MatchPlayerPeriod au moment du GOAL adverse.

Le clean sheet est dérivé des buts adverses.

Les concepts `ballons touchés` et `ballons bonifiés` restent `TO_REVIEW` et ne font pas partie du modèle V1.0 validé.

Le xG reste `TO_REVIEW` tant qu'un véritable modèle n'est pas défini.

---

# Fiche individuelle et Analyse équipe

## 41. Principe

Ces domaines sont des agrégations et non de nouvelles sources de vérité.

---

## 42. PlayerProfileView

Contexte minimal :

```text
playerId + seasonId
```

Filtres optionnels : `categoryId`, `dateRange`.

```ts
PlayerProfileView {
  player
  season
  currentAssignments[]
  attendanceSummary
  trainingSummary
  technicalTestsSummary
  physicalTestsSummary
  matchSummary
  roleSummary
  injurySummary
  trends
}
```

C'est un Read Model, pas une entité métier persistante principale.

La fiche consolide notamment :

- identité ;
- sous-catégorie calculée ;
- affectations ;
- présences ;
- RPE et charge ;
- tests configurables ;
- statistiques Match ;
- temps de jeu et temps par rôle ;
- heatmaps ;
- blessures selon permissions ;
- tendances.

Les nouveaux TestDefinition doivent pouvoir apparaître automatiquement dans la fiche sans modification spécifique.

---

## 43. TeamProfile et TeamAnalysis

`TeamProfile` = vue synthétique.  
`TeamAnalysis` = vue analytique détaillée.

Contexte :

```text
teamId + seasonId
```

ou selon le besoin :

```text
categoryId + seasonId
```

avec `dateRange` optionnel.

```ts
TeamAnalysisView {
  team
  season
  rosterSummary
  attendanceSummary
  trainingSummary
  testSummary
  matchSummary
  playerLeaders
  injurySummary
  trends
}
```

L'effectif est dérivé de PlayerTeamAssignment à la date demandée.

L'analyse peut calculer :

- présence ;
- charge ;
- tests ;
- matchs joués ;
- victoires/nuls/défaites ;
- taux de victoire ;
- buts marqués/encaissés ;
- tirs ;
- récupérations ;
- duels ;
- centres ;
- progressions ;
- danger zone entries ;
- possession ;
- heatmaps ;
- leaders individuels ;
- tendances.

WIN/DRAW/LOSS est dérivé du score et n'est pas une source indépendante.

---

## 44. Services d'agrégation

Les services d'analyse peuvent dépendre des services métier spécialisés :

```text
playerProfileService
  -> attendanceService
  -> testsService
  -> matchesService
  -> medicalService
```

```text
teamAnalysisService
  -> attendanceService
  -> testsService
  -> matchesService
```

Mais les services métier spécialisés ne dépendent jamais des services d'analyse.

Les projections/cache éventuels (`MatchSummary`, `PlayerSeasonSummary`, `TeamSeasonSummary`) sont recalculables et ne constituent jamais la source originale.

---

# 45. Règles métier consolidées DATA MODEL

- **DM-001** — `playerId` est l'identité unique d'une joueuse dans tous les domaines.
- **DM-002** — La sous-catégorie est dérivée de la date de naissance et de la saison.
- **DM-003** — Une Category regroupe une ou plusieurs SubCategory.
- **DM-004** — Une Category peut contenir une ou plusieurs Team.
- **DM-005** — Une joueuse peut avoir plusieurs PlayerTeamAssignment simultanées.
- **DM-006** — Les affectations sont saisonnières et temporelles.
- **DM-007** — Les affectations distinguent PRIMARY, SECONDARY et TEMPORARY.
- **DM-008** — Le Player stocke un profil général et non un poste principal Match.
- **DM-009** — Aucun numéro de maillot permanent n'est requis dans Player.
- **DM-010** — Player possède `preferredFoot`; les tests utilisent pied fort/pied faible lorsque pertinent.
- **DM-011** — Les historiques ne sont pas réécrits par les changements futurs d'affectation.
- **DM-012** — Chaque Session possède un sessionId.
- **DM-013** — Chaque Session appartient à une Season.
- **DM-014** — Chaque Session appartient exactement à une Category.
- **DM-015** — Deux catégories s'entraînant simultanément produisent deux Session distinctes.
- **DM-016** — Une joueuse peut être invitée à une Session extérieure à sa catégorie normale.
- **DM-017** — `sessionId + playerId` est unique pour Attendance.
- **DM-018** — `sessionId + playerId` est unique pour RPE.
- **DM-019** — Qualité perçue et RPE sont deux mesures différentes.
- **DM-020** — La charge d'entraînement est calculée depuis durée × RPE.
- **DM-021** — Les changements futurs n'altèrent pas les anciennes séances.
- **DM-022** — Tests techniques et athlétiques utilisent la même architecture.
- **DM-023** — TestDefinition décrit le protocole.
- **DM-024** — TestSession représente une réalisation datée du protocole.
- **DM-025** — Une TestSession appartient à une seule Category.
- **DM-026** — Un test peut contenir plusieurs métriques.
- **DM-027** — Chaque métrique définit son unité et son sens de performance.
- **DM-028** — `testSessionId + playerId` est unique pour TestResult.
- **DM-029** — Les résultats historiques ne dépendent pas de l'équipe actuelle.
- **DM-030** — Moyennes, records, progressions et classements sont dérivés.
- **DM-031** — Un protocole fortement modifié crée une nouvelle TestDefinition.
- **DM-032** — Player.preferredFoot utilise LEFT/RIGHT/UNKNOWN.
- **DM-033** — Les tests relatifs utilisent strongFoot/weakFoot lorsque pertinent.
- **DM-034** — Un nouveau protocole doit pouvoir être ajouté sans changer l'architecture centrale.
- **DM-035** — Chaque TestDefinition définit librement ses métriques.
- **DM-036** — Ratios et pourcentages dérivables ne sont pas des sources indépendantes.
- **DM-037** — Injury appartient à Player.
- **DM-038** — Injury et MedicalRecord sont séparés.
- **DM-039** — Une Injury utilise une zone corporelle structurée et éventuellement un côté.
- **DM-040** — La douleur peut être enregistrée de 1 à 10.
- **DM-041** — InjuryUpdate conserve l'évolution sans écraser l'historique.
- **DM-042** — La disponibilité sportive est structurée.
- **DM-043** — Attendance INJURED ne crée pas automatiquement une Injury.
- **DM-044** — MedicalRecord peut être lié optionnellement à Injury.
- **DM-045** — Les données médicales ont des niveaux d'accès renforcés.
- **DM-046** — Organisation d'un rendez-vous et contenu médical sont séparés.
- **DM-047** — Une blessure terminée est historisée, pas supprimée par défaut.
- **DM-048** — Chaque Match appartient à une Category.
- **DM-049** — Les participantes Match sont figées via MatchParticipant.
- **DM-050** — MatchEvent est la source des statistiques événementielles.
- **DM-051** — MatchPlayerPeriod est la source du temps de jeu.
- **DM-052** — Les changements de rôle sont historisés par de nouvelles périodes.
- **DM-053** — Le score est dérivé des GOAL.
- **DM-054** — GOAL compte automatiquement comme tir cadré.
- **DM-055** — CoachPulse et adversaire utilisent le même moteur avec teamSide.
- **DM-056** — Les heatmaps exploitent les MatchEvent spatialisés.
- **DM-057** — Le référentiel spatial normalisé attaque vers la droite.
- **DM-058** — Compteur et tooltip Heatmap utilisent le même ensemble d'événements filtrés.
- **DM-059** — Les statistiques agrégées ne deviennent pas des sources indépendantes.
- **DM-060** — Les matchs historiques sont indépendants des affectations futures.
- **DM-061** — Un MatchEvent possède un identifiant stable et peut être corrigé.
- **DM-062** — La suppression logique d'un événement est possible.
- **DM-063** — MatchRole est distinct de PlayerProfile.
- **DM-064** — Les rôles Match sont configurables et extensibles.
- **DM-065** — Les dispositifs sont des FormationDefinition configurables.
- **DM-066** — Aucun dispositif n'est codé directement dans l'UI.
- **DM-067** — Les MatchEventDefinition sont extensibles.
- **DM-068** — La passe décisive est une propriété optionnelle du GOAL.
- **DM-069** — Les coordonnées x/y normalisées sont la source spatiale primaire.
- **DM-070** — PitchZone est dérivée des coordonnées.
- **DM-071** — L'entrée dans les 20 m devient une Danger Zone générique.
- **DM-072** — La possession est dérivée des événements de changement de possession.
- **DM-073** — La possession doit être entièrement recalculable.
- **DM-074** — Ballons touchés/bonifiés restent hors modèle tant que non définis.
- **DM-075** — GOAL transfère immédiatement la possession à l'équipe ayant encaissé.
- **DM-076** — La fiche joueuse est une agrégation, pas une nouvelle source.
- **DM-077** — Les analyses individuelles importantes sont contextualisées par seasonId.
- **DM-078** — Les nouveaux TestDefinition sont supportés dynamiquement dans la fiche joueuse.
- **DM-079** — Le temps par rôle provient uniquement de MatchPlayerPeriod.
- **DM-080** — Heatmaps individuelles et collectives utilisent le même moteur.
- **DM-081** — L'analyse équipe est une agrégation.
- **DM-082** — L'effectif d'une équipe est dérivé de PlayerTeamAssignment.
- **DM-083** — WIN/DRAW/LOSS est dérivé du score.
- **DM-084** — Aucun xG n'est implémenté avant définition d'un vrai modèle.
- **DM-085** — Les projections de performance peuvent être mises en cache si recalculables.
- **DM-086** — Les services d'analyse dépendent des domaines, jamais l'inverse.

---

# 46. Vue d'ensemble du modèle V1.0

```text
User
└── TeamAccess / Permissions

Season
├── SubCategory
├── Category
│   ├── Team
│   ├── Session
│   │   ├── SessionParticipant
│   │   ├── Attendance
│   │   └── RPE
│   ├── TestSession
│   │   └── TestResult
│   └── Match
│       ├── MatchParticipant
│       ├── MatchLineup -> FormationDefinition -> FormationSlot -> MatchRoleDefinition
│       ├── MatchPlayerPeriod -> MatchRoleDefinition
│       └── MatchEvent -> MatchEventDefinition + coordinates
└── PlayerTeamAssignment

Player
├── PlayerTeamAssignment
├── Attendance
├── RPE
├── TestResult
├── Injury
│   ├── InjuryUpdate
│   ├── CareAppointment
│   └── MedicalRecord
├── MedicalRecord
├── MatchParticipant
├── MatchPlayerPeriod
└── MatchEvent

TestDefinition
└── TestSession
    └── TestResult
```

Read models :

```text
PlayerProfileService -> PlayerProfileView
TeamAnalysisService  -> TeamProfile / TeamAnalysisView
```

---

# 47. Points volontairement laissés à définir dans les documents suivants

`DATA_MODEL.md` définit les entités et relations. Les décisions suivantes doivent être détaillées ailleurs avant implémentation :

### BUSINESS_RULES.md

- calcul exact de sous-catégorie ;
- contraintes d'affectation principale ;
- taux de présence ;
- calculs de charge ;
- règles précises de possession pour chaque événement ;
- règles de statistiques Match ;
- définition exacte des Danger Zones ;
- règles de validation des événements ;
- traitement des périodes UNKNOWN de possession.

### PERMISSIONS_MODEL.md

- accès par teamId ;
- permissions par domaine ;
- niveaux Injury/Medical ;
- écriture/correction Match ;
- administration des TestDefinition, MatchRoleDefinition et FormationDefinition.

### FIRESTORE_STRUCTURE.md

- collections et sous-collections ;
- indexes ;
- clés d'unicité ;
- stratégie de projections/cache ;
- règles de sécurité Firestore ;
- séparation DEV / PROD.

### MIGRATION_PLAN_V1_TO_V2.md

- correspondance V1 -> V2 ;
- nettoyage des identifiants ;
- import historique ;
- validation des données migrées.

---

# 48. Statut de cette version

Cette **V1.0 consolidée** remplace les drafts DATA_MODEL V0.x construits pendant la phase de conception.

Toute évolution future doit :

1. conserver la compatibilité historique autant que possible ;
2. être documentée ;
3. éviter toute duplication de source de vérité ;
4. être accompagnée d'une nouvelle version du document si elle modifie le modèle métier.

# FIRESTORE_STRUCTURE.md

## CoachPulse V2 — Structure Firestore
**Version :** 1.0
**Statut :** Référence consolidée

Ce document traduit DATA_MODEL.md, BUSINESS_RULES.md et PERMISSIONS_MODEL.md en structure Firestore.

## Principes
- Firestore est la source de vérité persistante.
- Collections organisées par domaine métier, jamais par écran.
- IDs stables, indépendants des libellés.
- Données dérivées recalculables.
- Permissions sportives évaluées par Team et rôle actif.
- Scope SELF limité au linkedPlayerId.
- Aucune page React n'accède directement à Firestore.
- Architecture : React → Hooks/Controllers → Services → Repositories → Firestore.

## Collections racine
```text
users/
roles/
userTeamAccess/
seasons/
subCategories/
categories/
teams/
players/
playerTeamAssignments/
playerAccessScopes/
sessions/
sessionParticipants/
attendance/
rpe/
testDefinitions/
testBenchmarks/
testSessions/
testResults/
matches/
matchParticipants/
matchLineups/
matchPlayerPeriods/
matchEvents/
matchRoles/
formations/
matchEventDefinitions/
pitchGridDefinitions/
dangerZoneDefinitions/
injuries/
injuryUpdates/
careAppointments/
medicalRecords/
auditLogs/
```

## users
`users/{userId}` : identité utilisateur, status, linkedPlayerId?, roleIds[], preferredActiveRoleId?, timestamps. `userId` = Firebase Auth UID.

### Contexte de sécurité actif

`users/{userId}.securityContext` contient `activeRoleId`, `activeTeamId` et
`activeSeasonId`. Le client ne peut modifier que ce champ, sur son propre
document. Les Security Rules vérifient que le rôle est attribué et actif, que
le TeamAccess est actif et temporellement valide, et que la saison est active.
Ce contexte sélectionne des droits déjà accordés ; il n'en crée aucun.

## roles
`roles/{roleId}` : code, label, description?, isActive, defaultPermissions[], timestamps. Les rôles sont ajoutables, modifiables et désactivables.

## userTeamAccess
`userTeamAccess/{userId}_{teamId}` :
```ts
{
  userId,
  teamId,
  status,
  startDate?,
  endDate?,
  rolePermissions: {
    [roleId]: {
      permissions: string[],
      medicalAccessLevel: string
    }
  }
}
```
Un document maximum par couple User + Team. Les permissions effectives dépendent du rôle actif et du contexte Team.

## seasons / subCategories / categories / teams
- `seasons/{seasonId}` : saison, période, status (`PLANNED | ACTIVE | CLOSED`) et indicateur actif. Une saison CLOSED est read-only par défaut.
- `subCategories/{subCategoryId}` : référentiel U12/U13/etc.
- `categories/{categoryId}` : regroupement sportif et subCategoryIds[].
- `teams/{teamId}` : identité Team + `teamType` + `seasonId?` + `categoryId?`. Les Teams `FIRST_TEAM` ne sont pas automatiquement rattachées à Season/Category.

La sous-catégorie effective d'une joueuse reste dérivée de Player.birthDate + Season.

## players
`players/{playerId}` contient identité, birthDate, nationality?, clubArrivalDate?, previousClub?, photoPath?, playerProfile, preferredFoot, status et timestamps.

Player ne contient jamais comme vérité permanente : teamId, categoryId, subCategoryId, seasonId, poste principal ou numéro de maillot.

## playerTeamAssignments
`playerTeamAssignments/{assignmentId}` contient playerId, teamId, assignmentType, startDate, endDate?, status et audit technique.

Types : PRIMARY, SECONDARY, TEMPORARY. PRIMARY est défini manuellement et reste temporel.

## playerAccessScopes

`playerAccessScopes/{playerId}_{teamId}_{seasonId}` est un index d'autorisation
dérivé de `PlayerTeamAssignment`. Il contient `playerId`, `teamId`, `seasonId`,
`status`, `startDate`, `endDate?` et `source = PLAYER_TEAM_ASSIGNMENT`.

Cet index n'est pas une seconde source métier : il est illisible et non
inscriptible par les clients et sert uniquement aux Security Rules pour un
`get()` déterministe lors de la lecture de `players/{playerId}`. Toute future
mutation d'affectation devra le maintenir dans la même commande serveur ou
transaction privilégiée.

## sessions
`sessions/{sessionId}` contient seasonId, categoryId, dates/heures, durées, type et status.

Règle : 1 Session = 1 Category. Plusieurs catégories simultanées = plusieurs Sessions.

### Accès Category
Un utilisateur ayant accès à une Team obtient, avec la permission adéquate, accès aux données collectives de toute la Category de cette Team.

## sessionParticipants
`sessionParticipants/{sessionId}_{playerId}` fige les participantes EXPECTED/INVITED.

## attendance
`attendance/{sessionId}_{playerId}` garantit 1 Attendance par Player et Session.

## rpe
`rpe/{sessionId}_{playerId}` garantit 1 RPE par Player et Session.

### Scope SELF
Pour une joueuse : `users/{uid}.linkedPlayerId == resource.playerId`. Pour créer son RPE, elle doit également participer réellement à la Session. Elle ne peut jamais agir sur le playerId d'une autre joueuse.

TrainingLoad n'a pas de collection source : il est dérivé de Session + Attendance + RPE.

## testDefinitions
`testDefinitions/{testDefinitionId}` contient `code`, `version`, le protocole
et ses `metrics[]` structurées. Une métrique PR06 contient `metricKey`, `label`,
`valueType = NUMBER`, une unité normalisée, `direction`, `required` et ses
bornes/précision éventuelles.

## testBenchmarks
`testBenchmarks/{testBenchmarkId}` contient `testDefinitionId`,
`testDefinitionVersion`, `metricKey`, `subCategoryId`, niveau de référence,
cible, `seasonId` pour les benchmarks saisonniers et statut.

Les benchmarks sont des références, jamais une copie de TestResult.

PR06 autorise leur lecture uniquement avec `tests.read` dans le contexte de
sécurité actif. Pour un benchmark, la Team active doit être DEVELOPMENT, sa
Category doit contenir `subCategoryId` et la saison doit correspondre. Les
écritures client restent refusées ; les seeds DEV utilisent Firebase Admin.

## testSessions
`testSessions/{testSessionId}` contient testDefinitionId, seasonId, categoryId, date et status.

Règle : 1 TestSession = 1 Category. L'accès suit le même principe Team → Category que Session.

## testResults
`testResults/{testSessionId}_{playerId}` contient valeurs, tentatives, status et contextSnapshot?.

Le contextSnapshot peut figer preferredFoot pour préserver l'interprétation STRONG_FOOT / WEAK_FOOT.

## matches
`matches/{matchId}` contient seasonId, teamId, date, adversaire, format, configuration des périodes, orientation, status et possession initiale.

Règle : Match → Team, jamais Category comme relation principale.

## matchParticipants
`matchParticipants/{matchId}_{playerId}`.

## matchLineups
Stocke les périodes de validité d'un dispositif.

## matchPlayerPeriods
Source de vérité du temps de jeu, temps par rôle, titularisation et gardienne active.

## matchEvents
`matchEvents/{matchEventId}` contient matchId, gameSecond, periodNumber, eventType, teamSide, playerId?, coordinates?, metadata?, timestamps et deletedAt?.

Un événement terrain = une saisie brute principale.

GOAL dérive score, tir cadré, buteuse, assist et changement immédiat de possession vers l'équipe ayant encaissé.

SAVE dérive arrêt gardienne + tir cadré adverse, sans événement SHOT_ON_TARGET dupliqué.

Les coordonnées x/y normalisées sont la source spatiale. pitchZoneId est dérivé.

## Configuration Match
- `matchRoles/{matchRoleId}` : rôles extensibles.
- `formations/{formationId}` : dispositifs extensibles et slots[].
- `matchEventDefinitions/{eventTypeId}` : règles des événements.
- `pitchGridDefinitions/{pitchGridId}` : grilles versionnées.
- `dangerZoneDefinitions/{dangerZoneId}` : zones de danger versionnées.

## injuries
`injuries/{injuryId}` contient playerId, dates, bodyArea, side, douleur initiale, disponibilité, retour estimé et status. Injury reste orientée suivi sportif.

## injuryUpdates
`injuryUpdates/{injuryUpdateId}` contient injuryId, playerId, date, douleur, disponibilité, restrictions et note. playerId est une dénormalisation contrôlée.

## careAppointments
`careAppointments/{careAppointmentId}` contient playerId, injuryId?, accessTeamIds[], providerType, status et dates.

## medicalRecords
`medicalRecords/{medicalRecordId}` contient playerId, injuryId?, accessTeamIds[], recordType, date, providerType?, confidentialityLevel, résumé/recommandations/restrictions et nextReviewDate?.

### accessTeamIds[]
Un MedicalRecord peut être autorisé dans plusieurs contextes Team sans être dupliqué.

L'accès exige : User actif + rôle actif + TeamAccess compatible avec accessTeamIds[] + medical.read/write + medicalAccessLevel suffisant.

Niveaux initiaux : NONE < SPORT < RESTRICTED < MEDICAL. Ils restent configurables.

## auditLogs
`auditLogs/{auditLogId}` contient userId, activeRoleId?, teamId?, action, resourceType, resourceId, timestamp et metadata?.

Les audits sensibles sont générés côté serveur (backend sécurisé / Cloud Function), pas par confiance dans le client. Les utilisateurs standards ne peuvent ni modifier ni supprimer les AuditLog.

## Projections
Aucune projection métier n'est obligatoire au démarrage.

Pas de playerSeasonSummaries, teamSeasonSummaries, trainingLoads, heatmaps, playerStats ou teamStats persistés par défaut.

Une projection future n'est ajoutée qu'en cas de besoin mesurable de performance, doit être entièrement reconstruisible et versionnée. MatchSummary est la première candidate éventuelle.

## Indexes
Les index nécessaires sont versionnés dans `firestore.indexes.json` et découlent des vraies requêtes des repositories.

Requêtes prioritaires : affectations Player/Team/date, Sessions Category/période, Attendance Player/Session, RPE Player/Session, Tests Player/protocole, Matches Team/saison/date, MatchEvents match/temps/type, Injuries player/status.

## Security Rules
Les requêtes doivent être compatibles avec les Security Rules : celles-ci ne sont pas un filtre post-requête.

Pour Session/TestSession :
UserTeamAccess.teamId → Team.categoryId → Session/TestSession.categoryId.

Si l'utilisateur possède un TeamAccess actif vers une Team de cette Category et la permission requise, l'accès collectif Category est autorisé.

## Dénormalisation
Autorisée uniquement pour requêtes, sécurité ou performance avec source canonique documentée. Ne pas recopier inutilement playerName/teamName/categoryName/seasonName dans chaque document.

## Atomicité
Les invariants multi-documents passent par services + transaction/écriture atomique adaptée : changement PRIMARY, substitutions Match, échanges de rôles, finalisation Match, écritures sensibles avec audit.

## Suppression / archivage
La suppression logique peut utiliser deletedAt/deletedByUserId. Les entités structurelles utilisent plutôt INACTIVE/ARCHIVED que la suppression physique.

## Storage
Firebase Storage contient les fichiers binaires (photos, documents autorisés). Firestore conserve storagePath + métadonnées. Les pièces médicales nécessiteront des règles Storage spécifiques avant activation.

## Environnements
CoachPulse V2 DEV et PROD utilisent des projets Firebase séparés. V1 et V2 restent totalement séparées.

Le dépôt prévoit notamment :
```text
.env.development
.env.production
firebase.json
.firebaserc
firestore.rules
firestore.indexes.json
storage.rules
```
Les secrets serveur ne sont jamais exposés via Vite.

Firebase Emulator Suite doit être utilisé pour les tests de règles et permissions.

## Chargement et cache
Démarrage : Auth → User → roles → UserTeamAccess → rôle actif → saison active → Dashboard minimal.

Aucun chargement massif de toute la base.

La fiche joueuse charge progressivement ses domaines. Le médical n'est chargé que si autorisé. Les listeners temps réel Match sont limités au Match courant.

Le cache client n'est jamais source de vérité et respecte Team, saison, rôle actif et permissions.

## Migration
Pipeline V1 → V2 :
```text
Extract
→ Normalize
→ Validate
→ Resolve IDs
→ Detect duplicates
→ Dry run
→ Write V2
→ Migration report
```

## Décisions V1.0 figées
1. Firestore est la source de vérité commune.
2. Collections racine par domaine métier.
3. Player ne contient pas d'équipe permanente.
4. Affectations via playerTeamAssignments.
5. Session = une Category.
6. TeamAccess donne, avec permission, accès aux données collectives de toute la Category.
7. Même principe pour TestSession.
8. Attendance/RPE : IDs déterministes sessionId_playerId.
9. TestResult : ID déterministe possible testSessionId_playerId.
10. Match appartient à une Team.
11. MatchEvent est la source brute des statistiques.
12. GOAL et SAVE ne dupliquent pas les événements.
13. x/y est la source spatiale.
14. Rôles, dispositifs et événements restent extensibles.
15. SELF repose sur User.linkedPlayerId.
16. Une joueuse ne saisit son RPE que pour elle-même et une Session à laquelle elle participe.
17. MedicalRecord utilise accessTeamIds[].
18. Les niveaux médicaux restent configurables.
19. AuditLog sensible généré côté serveur.
20. Aucune projection obligatoire au démarrage.
21. Toute projection future est reconstruisible.
22. Permissions évaluées par Team et rôle actif.
23. Firestore Rules protègent indépendamment de l'UI.
24. Aucun accès Firestore direct depuis React.
25. DEV et PROD sont séparés.
26. V1 et V2 restent totalement séparés.

## Suite
Ce document sert de base à `ARCHITECTURE_DECISIONS.md`, `MIGRATION_PLAN_V1_TO_V2.md`, `COACHPULSE_V2_SPEC.md` et `AGENTS.md`.

Principe final :
```text
MÉTIER + SÉCURITÉ + REQUÊTES + PERFORMANCE + MAINTENABILITÉ
```


## Saison clôturée
Toute écriture métier dans une `Season.status = CLOSED` est refusée par défaut.

Une correction exceptionnelle exige :

```text
history.correctClosedSeason
+
TeamAccess compatible
+
AuditLog lorsque nécessaire
```

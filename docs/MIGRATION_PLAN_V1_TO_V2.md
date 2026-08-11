# MIGRATION_PLAN_V1_TO_V2.md

## CoachPulse V2 — Plan de migration V1 vers V2

**Version :** 1.0  
**Statut :** Référence consolidée

## 1. Principe fondamental

> On migre les données, règles métier et fonctionnalités validées, jamais le code legacy.

La V1 reste une application indépendante et une référence fonctionnelle pendant la construction de la V2.

```text
CoachPulse V1
≠
CoachPulse V2 DEV
≠
CoachPulse V2 PROD
```

Aucune synchronisation bidirectionnelle permanente V1 ↔ V2 n'est prévue.

---

## 2. Périmètre historique retenu

Décision V1.0 :

> La V2 migre uniquement la saison en cours au moment de la migration.

Cela s'applique notamment à :

- affectations sportives pertinentes ;
- séances ;
- présences ;
- RPE ;
- tests techniques ;
- tests athlétiques ;
- matchs ;
- MatchEvent ;
- blessures ;
- suivi médical.

Les saisons antérieures restent consultables dans CoachPulse V1 comme archive historique.

Elles ne sont pas importées dans la fondation V2.

---

## 3. Classification

Chaque élément V1 est classé :

```text
KEEP
TRANSFORM
DROP
```

- **KEEP** : comportement ou donnée conceptuellement compatible.
- **TRANSFORM** : besoin conservé mais structure V2 différente.
- **DROP** : donnée, doublon ou décision legacy inutile.

KEEP ne signifie jamais copier le code.

---

## 4. Pipeline de migration

```text
EXTRACT
↓
NORMALIZE
↓
VALIDATE
↓
RESOLVE IDs
↓
DETECT DUPLICATES
↓
TRANSFORM
↓
DRY RUN
↓
IMPORT V2 DEV
↓
VERIFY
↓
MIGRATION REPORT
↓
SHADOW MODE
↓
FREEZE V1
↓
DELTA FINAL
↓
CUTOVER V2
```

---

## 5. Sources V1

Avant migration, inventorier :

```text
Firestore
JSON
Excel / CSV
Firebase Storage
anciens exports
données locales éventuelles
```

Pour chaque source : format, volume, date, qualité et source de vérité supposée.

La migration ne doit jamais supposer que les différentes listes V1 sont cohérentes.

---

## 6. Player comme fondation

Player est la première entité métier à normaliser.

Toutes les autres données reposent sur `playerId`.

Créer un dataset de mapping contenant au minimum :

```text
ancienne clé V1
nom
prénom
date de naissance
nouveau playerId
statut
niveau de confiance
```

Un rapprochement ambigu produit :

```text
MATCH_REVIEW_REQUIRED
```

et nécessite une décision humaine.

---

## 7. IDs V2

Les IDs V2 sont stables et générés une seule fois :

```text
playerId
teamId
seasonId
sessionId
matchId
...
```

Les noms ou libellés ne servent pas d'identifiants permanents.

Les mappings V1 → V2 sont archivés avec les artefacts de migration.

---

## 8. Teams, Categories et SubCategories

Chaque Team V1 retenue est mappée vers un `teamId` V2.

La catégorie d'une joueuse n'est pas importée comme propriété permanente de Player.

Le modèle V2 reste :

```text
birthDate + Season
→ SubCategory
→ Category
```

Team reste une entité indépendante identifiée par `teamId`.

---

## 9. PlayerTeamAssignment

Les associations Player → Team V1 deviennent des `PlayerTeamAssignment`.

Chaque affectation pertinente à la saison en cours contient notamment :

```text
playerId
teamId
assignmentType
startDate
endDate?
```

Types :

```text
PRIMARY
SECONDARY
TEMPORARY
```

Le PRIMARY est défini manuellement.

La migration ne doit pas inventer un PRIMARY lorsqu'il n'est pas identifiable de manière fiable.

Dans ce cas :

```text
PRIMARY_REVIEW_REQUIRED
```

---

## 10. Sessions

Règle cible :

> 1 Session = 1 Category.

Une séance V1 regroupant plusieurs catégories doit être séparée en plusieurs Sessions V2.

Seules les Sessions de la saison en cours sont migrées.

---

## 11. Attendance

Chaque Attendance est reliée à :

```text
sessionId
playerId
```

ID déterministe recommandé :

```text
{sessionId}_{playerId}
```

Les anciens statuts sont convertis via une table de mapping documentée.

Un statut non reconnu produit :

```text
UNMAPPED_ATTENDANCE_STATUS
```

---

## 12. RPE

Seuls les RPE de la saison en cours sont migrés.

Ils sont reliés à :

```text
sessionId
playerId
```

Les valeurs doivent respecter les règles V2, notamment les échelles 1–10 définies.

Une valeur invalide n'est jamais corrigée arbitrairement.

---

## 13. Tests techniques et athlétiques

Les anciens tests sont transformés vers :

```text
TestDefinition
TestSession
TestResult
```

Ils ne sont pas recréés sous forme de collections spécifiques par type.

Seule la saison en cours est migrée.

---

## 14. Pied fort / pied faible

Les anciens résultats PD/PG sont transformés en fonction de `Player.preferredFoot`.

Exemple :

```text
preferredFoot = RIGHT

PD → STRONG_FOOT
PG → WEAK_FOOT
```

Si `preferredFoot` est inconnu :

```text
TEST_FOOT_MAPPING_REVIEW_REQUIRED
```

Aucune conversion silencieuse n'est autorisée.

---

## 15. Protocoles de tests

Chaque protocole historique nécessaire doit correspondre à une `TestDefinition`.

Exemples :

```text
Jongles
Sprint
Cooper
Conduite
Passe
```

Deux protocoles réellement différents ne doivent jamais être fusionnés sous une même définition simplement parce qu'ils portent un nom similaire.

---

## 16. Match — périmètre

Seuls les Match et MatchEvent de la saison en cours sont migrés.

Le domaine Match n'est migré qu'après stabilisation de :

```text
Player
Team
Season
MatchRole
Formation
```

Chaque Match V2 est relié à une Team, jamais directement à une Category.

---

## 17. Participants et temps de jeu

Les compositions disponibles deviennent des `MatchParticipant`.

Les `MatchPlayerPeriod` ne sont reconstruits que si la V1 possède des informations suffisamment fiables.

Si la V1 ne contient qu'un temps total, la migration conserve uniquement ce qui peut être démontré.

Aucune fausse période de jeu n'est inventée.

---

## 18. MatchEvent

Les événements V1 sont transformés vers les types V2.

Exemple :

```text
but → GOAL
```

Les événements inconnus produisent :

```text
UNMAPPED_MATCH_EVENT
```

---

## 19. Déduplication GOAL

Si V1 contient pour la même action :

```text
GOAL
+
SHOT_ON_TARGET
```

la V2 produit :

```text
1 GOAL
```

Le tir cadré est dérivé du GOAL.

---

## 20. Déduplication SAVE

Si V1 contient :

```text
SAVE
+
SHOT_ON_TARGET adverse
```

pour la même action, la V2 conserve :

```text
1 SAVE
```

Le tir cadré adverse est dérivé du SAVE.

---

## 21. Assist

Lorsqu'elle peut être reconstruite de manière fiable, la passe décisive est une propriété du GOAL :

```text
metadata.assistPlayerId
```

Elle n'est pas dupliquée sous forme d'un second événement métier.

---

## 22. Données spatiales legacy

La V2 utilise des coordonnées x/y normalisées comme source spatiale.

Si la V1 ne possède qu'une zone, par exemple 1–9, cette donnée ne doit pas devenir artificiellement une coordonnée précise.

La migration doit conserver la provenance legacy.

Les heatmaps agrégées V1 ne sont pas migrées comme source de vérité.

Elles sont recalculées depuis les événements lorsqu'ils permettent de le faire.

---

## 23. Validation des scores

Le score final V1 sert de contrôle.

Après transformation :

```text
score dérivé des MatchEvent V2
```

doit être comparé au score V1.

Une incohérence produit :

```text
MATCH_REVIEW_REQUIRED
```

---

## 24. Possession

La possession V2 est dérivée du moteur d'événements et des changements de possession.

Les anciens pourcentages V1 ne deviennent pas la source de vérité V2.

S'ils ne peuvent pas être reconstruits, ils ne sont pas mélangés à la métrique V2.

---

## 25. Blessures et médical

Décision V1.0 :

> Seules les données de la saison en cours sont candidates à la migration.

Les blessures sont transformées vers :

```text
Injury
InjuryUpdate
```

et, lorsque nécessaire :

```text
CareAppointment
MedicalRecord
```

Chaque donnée médicale doit respecter :

```text
playerId
confidentialityLevel
accessTeamIds[]
```

Les données médicales ne sont jamais migrées aveuglément.

Une revue spécifique précède l'import PROD.

---

## 26. Firebase Storage

Les fichiers utiles sont inventoriés.

Exemples :

```text
photos joueuses
documents autorisés
```

Les fichiers inutiles ou orphelins ne sont pas copiés automatiquement.

Les photos retenues sont remappées vers le nouveau `playerId` et un nouveau `storagePath`.

---

## 27. Utilisateurs

Décision V1.0 :

> Les profils utilisateurs V2 sont recréés selon le nouveau modèle puis les utilisateurs sont invités à activer leur accès V2.

Les permissions V1 ne sont jamais copiées aveuglément.

Chaque utilisateur V2 reçoit selon les règles validées :

```text
User
roleIds[]
UserTeamAccess
rolePermissions
medicalAccessLevel
```

---

## 28. Rôles

Une table de correspondance V1 → V2 peut aider à préparer les profils.

Mais les droits effectifs sont reconstruits selon `PERMISSIONS_MODEL.md`.

Un rôle portant le même nom en V1 et V2 n'implique pas automatiquement les mêmes permissions.

---

## 29. Comptes joueuses

Décision V1.0 :

> Les comptes joueuses sont activés progressivement.

La présence d'un Player ne crée pas automatiquement l'obligation d'activer immédiatement un compte Auth.

Lorsqu'un compte joueuse est activé :

```text
User.linkedPlayerId
→ Player.playerId
```

doit être établi explicitement.

---

## 30. Audit historique

Les anciens AuditLog ne sont migrés que s'ils existent, sont fiables et présentent une réelle valeur.

Le système d'audit V2 devient surtout la référence à partir de la mise en service V2.

---

## 31. Staging

Les données intermédiaires ne sont pas écrites directement dans les collections métier finales.

Utiliser :

```text
scripts de migration
JSON de staging
datasets temporaires contrôlés
```

---

## 32. Scripts

Structure recommandée :

```text
scripts/migration/
├── extract-v1.ts
├── normalize-players.ts
├── map-teams.ts
├── migrate-assignments.ts
├── migrate-attendance.ts
├── migrate-rpe.ts
├── migrate-tests.ts
├── migrate-matches.ts
├── migrate-medical.ts
└── validate-migration.ts
```

Ces scripts ne font pas partie du runtime frontend.

---

## 33. Idempotence

Les scripts doivent être idempotents autant que possible.

Un second lancement contrôlé ne doit pas créer de doublons incontrôlés.

---

## 34. Dry Run obligatoire

Toute migration importante doit supporter un mode Dry Run.

Le Dry Run produit :

```text
documents à créer
documents à modifier
doublons
warnings
erreurs
review required
```

sans écrire dans la base cible.

---

## 35. Migration Report

Chaque migration produit un rapport.

Exemple :

```text
Players
124 détectés
121 VALID
3 REVIEW_REQUIRED

Attendance
5420 lignes
5397 VALID
23 WARNING/REJECTED

Matches
84 détectés
79 VALID
5 REVIEW_REQUIRED
```

---

## 36. Statuts de validation

Chaque élément peut être classé :

```text
VALID
WARNING
REVIEW_REQUIRED
REJECTED
```

- `VALID` : migration automatique possible.
- `WARNING` : anomalie non bloquante documentée.
- `REVIEW_REQUIRED` : validation humaine nécessaire.
- `REJECTED` : migration impossible dans l'état actuel.

---

## 37. Ordre de migration

```text
1. Season en cours
2. SubCategories
3. Categories
4. Teams
5. Players
6. PlayerTeamAssignments
7. Roles / Users / UserTeamAccess

8. Sessions
9. SessionParticipants
10. Attendance
11. RPE

12. TestDefinitions
13. TestSessions
14. TestResults

15. Match configuration
16. Matches
17. MatchParticipants
18. MatchPlayerPeriods
19. MatchEvents

20. Injuries
21. InjuryUpdates
22. CareAppointments
23. MedicalRecords

24. Storage files
```

Les entités parentes sont toujours migrées avant leurs dépendances.

---

## 38. Contrôles post-migration

### Players

```text
aucun playerId dupliqué
birthDate cohérente
preferredFoot valide
aucun teamId permanent dans Player
```

### Assignments

```text
playerId valide
teamId valide
dates cohérentes
aucun conflit PRIMARY invalide
```

### Attendance

```text
1 Attendance / Session / Player
status valide
relations valides
```

### Tests

```text
TestDefinition valide
mesures compatibles
unités cohérentes
UNKNOWN ≠ 0
```

### Match

```text
teamId valide
participants valides
périodes cohérentes
score cohérent
pas de double GOAL/SHOT
pas de double SAVE/SHOT adverse
données spatiales cohérentes
```

### Medical

```text
playerId valide
confidentialityLevel valide
accessTeamIds valides
aucune exposition hors scope
```

---

## 39. Comparaison V1 / V2

Après import DEV, comparer notamment :

```text
nombre de Players concernés
nombre de Sessions
Attendance
RPE
résultats Tests
nombre de Match
scores
statistiques Match clés
blessures actives
```

L'objectif n'est pas d'obtenir la même structure technique.

L'objectif est de conserver correctement l'information métier utile de la saison en cours.

---

## 40. Shadow mode

Décision V1.0 :

> Une courte période de fonctionnement parallèle V1 / V2 est prévue avant la bascule finale.

Objectif :

```text
V1 = référence existante
V2 = validation réelle
```

Cette période doit rester courte.

La double saisie permanente est interdite.

---

## 41. Freeze V1

Décision V1.0 :

> Une courte fenêtre de freeze V1 est acceptée avant la migration PROD finale.

Pendant cette fenêtre, les modifications métier V1 concernées par la migration sont arrêtées ou strictement contrôlées.

---

## 42. Delta final

Si une première extraction a été réalisée avant le freeze :

```text
migration initiale
↓
validation
↓
freeze V1
↓
extraction des changements récents
↓
delta migration
↓
validation finale
```

---

## 43. Cutover

Une date explicite de bascule est définie.

```text
avant date X
→ V1 production

à partir de date X
→ V2 production
```

La V1 reste disponible comme archive pendant la période de sécurisation.

---

## 44. Rollback

Avant le cutover, définir :

```text
conditions de rollback
responsable
procédure
sauvegardes nécessaires
```

La V1 ne doit pas être détruite lors de la bascule.

---

## 45. Conditions migration PROD

La migration PROD ne peut être lancée qu'après :

```text
tests DEV validés
rapports de migration validés
Security Rules testées
Cloud Functions nécessaires testées
backup V1
validation fonctionnelle V2
validation utilisateurs clés
```

---

## 46. Backups

Avant migration finale :

```text
export Firestore V1
archive sources de migration
archive mappings V1 → V2
archive rapports
```

---

## 47. Documentation des transformations

Toute donnée transformée doit être documentée.

Exemple :

```text
V1 PD / PG
↓
V2 STRONG_FOOT / WEAK_FOOT
```

Toute donnée volontairement abandonnée doit également être listée avec sa justification.

---

## 48. Artefacts de mapping

Prévoir :

```text
docs/migration/
```

avec selon les besoins :

```text
PLAYER_MAPPING
TEAM_MAPPING
STATUS_MAPPING
EVENT_MAPPING
TEST_MAPPING
MIGRATION_REPORTS
```

Ces mappings ne doivent pas polluer le runtime frontend.

---

## 49. Sécurité des scripts

Les scripts privilégiés utilisent des credentials serveur dans un environnement sécurisé.

Jamais dans :

```text
frontend
variables VITE_*
code client
```

---

## 50. Traçabilité

Chaque batch important conserve :

```text
date
version du script
source
destination
nombre de documents
warnings
errors
```

Les scripts sont versionnés dans Git.

---

## 51. Tests de migration

Les transformations critiques ont des tests automatisés.

Priorités :

```text
Player matching
PRIMARY mapping
Attendance status mapping
PD/PG → STRONG/WEAK
GOAL dedup
SAVE dedup
score validation
```

Les données médicales réelles ne sont pas utilisées inutilement comme fixtures de tests.

---

## 52. Migration progressive

Tous les domaines ne doivent pas être migrés simultanément.

La migration suit l'ordre de développement de la V2.

Exemple :

```text
Fondation
↓
Players
↓
Sessions / Attendance / RPE
↓
Tests
↓
Match
↓
Medical
```

---

## 53. Condition de migration d'un domaine

Un domaine n'est migrable que lorsque :

```text
DATA_MODEL validé
BUSINESS_RULES validées
Firestore structure prête
service V2 implémenté
Security Rules testées
script de migration testé
```

---

## 54. Pas de synchronisation bidirectionnelle

Décision V1.0 :

```text
V1
→
V2
```

Jamais :

```text
V1
↔
V2
```

Une synchronisation bidirectionnelle créerait une double source de vérité et une complexité inutile.

---

## 55. Critères de réussite

La migration est réussie si :

```text
données utiles de la saison en cours présentes
IDs cohérents
aucun doublon critique
relations valides
règles V2 respectées
permissions correctes
rapports validés
```

Elle ne cherche pas à conserver :

```text
même structure Firestore
mêmes fichiers
mêmes noms de champs
même code
```

---

## 56. Décisions MIG consolidées

### MIG-001
La migration va uniquement de V1 vers V2.

### MIG-002
Aucun code legacy n'est migré.

### MIG-003
Seule la saison en cours est migrée dans la V2.

### MIG-004
Les saisons antérieures restent disponibles dans la V1 comme archive.

### MIG-005
Seuls les Match et MatchEvent de la saison en cours sont migrés.

### MIG-006
Seules les données blessures/médical de la saison en cours sont candidates à la migration.

### MIG-007
Player est normalisé avant les données qui en dépendent.

### MIG-008
Les nouveaux IDs V2 sont stables et mappés explicitement.

### MIG-009
Les ambiguïtés ne sont jamais résolues silencieusement.

### MIG-010
Les anciennes associations Player/Team deviennent des PlayerTeamAssignment.

### MIG-011
Le PRIMARY n'est jamais inventé sans donnée fiable ou validation humaine.

### MIG-012
Une Session multi-catégories V1 est divisée selon la règle V2 `1 Session = 1 Category`.

### MIG-013
Les tests utilisent TestDefinition/TestSession/TestResult.

### MIG-014
PD/PG est transformé vers STRONG_FOOT/WEAK_FOOT selon Player.preferredFoot.

### MIG-015
GOAL et SAVE sont dédupliqués selon les règles métier V2.

### MIG-016
Les agrégations et heatmaps legacy ne deviennent pas des sources de vérité V2.

### MIG-017
Les utilisateurs reçoivent un nouveau profil V2 et activent leur accès par invitation.

### MIG-018
Les comptes joueuses sont activés progressivement.

### MIG-019
Les permissions V1 ne sont pas copiées aveuglément.

### MIG-020
Toute migration importante possède un Dry Run.

### MIG-021
Toute migration importante produit un Migration Report.

### MIG-022
Une courte période de shadow mode V1/V2 est prévue.

### MIG-023
Une courte fenêtre de freeze V1 est prévue avant le cutover.

### MIG-024
Un delta final peut être appliqué après le freeze.

### MIG-025
La V1 reste disponible comme archive et solution de sécurisation pendant la bascule.

---

# 57. Principe final

```text
V1
=
référence fonctionnelle
+
source de données de la saison en cours
+
archive des anciennes saisons
```

```text
V2
=
nouvelle architecture
+
nouvelle source de vérité
+
données normalisées de la saison en cours
```

La migration n'est pas une copie.

Elle constitue une transformation contrôlée vers le nouveau modèle CoachPulse V2.


---

# Addendum de cohérence V1.1

## Champs Player
Lorsque disponibles et fiables, normaliser aussi :

```text
nationality
clubArrivalDate
previousClub
```

Une valeur absente n'est jamais inventée.

## TestBenchmark
Les benchmarks/objectifs ne sont pas déduits automatiquement des résultats V1. Ils sont configurés séparément en V2.

## Équipe première
Le mapping Team reconnaît `FIRST_TEAM` et ne lui invente pas de `seasonId` ou `categoryId`.

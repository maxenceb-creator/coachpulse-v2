# PERMISSIONS_MODEL.md

## CoachPulse V2 — Modèle de permissions

**Version :** 1.0  
**Statut :** Référence consolidée  
**Objectif :** définir le modèle d'autorisation de CoachPulse V2 avant l'implémentation de `permissionsService`, des guards UI et des Firestore Security Rules.

---

# 1. Principes fondamentaux

CoachPulse V2 distingue quatre concepts :

```text
AUTHENTICATION
ROLE
TEAM ACCESS
PERMISSION
```

Ils ne doivent jamais être fusionnés.

Firebase Authentication répond à :

> Qui est connecté ?

Le rôle répond à :

> Quelle fonction cette personne occupe-t-elle ?

Le TeamAccess répond à :

> Sur quelles équipes peut-elle agir ?

La permission répond à :

> Que peut-elle faire sur ces équipes ?

Règle fondamentale :

> Les rôles décrivent les personnes.  
> Les TeamAccess définissent leur périmètre.  
> Les permissions définissent leurs actions.

---

# 2. Authentication

Firebase Authentication fournit l'identité technique de connexion.

Le `uid` Firebase correspond au `userId` CoachPulse.

Être authentifié ne donne aucun droit métier automatiquement.

Un utilisateur authentifié mais inactif doit être refusé par CoachPulse.

---

# 3. User

Structure conceptuelle :

```ts
User {
  userId

  firstName
  lastName
  email

  status

  linkedPlayerId?

  roleIds[]

  preferredActiveRoleId?

  createdAt
  updatedAt
}
```

Statuts initiaux :

```text
ACTIVE
INACTIVE
SUSPENDED
```

`linkedPlayerId` est utilisé lorsqu'un compte utilisateur correspond à une joueuse.

---

# 4. Rôles initiaux

CoachPulse propose initialement les rôles suivants :

```text
ADMIN

RESPONSABLE_FORMATION

RESPONSABLE_POLE_FORMATION
RESPONSABLE_POLE_PRE_FORMATION
RESPONSABLE_POLE_ECOLE_DE_FOOT
RESPONSABLE_POLE_PREPARATEUR_PHYSIQUE

COACH_PRINCIPAL
COACH_ADJOINT

PREPARATEUR_PHYSIQUE

DIRIGEANT

ANALYSTE_VIDEO

KINE
MEDECIN
```

Les libellés affichés peuvent être en français.

---

# 5. Rôles configurables

Les rôles ne sont pas codés en dur comme structure définitive.

CoachPulse doit permettre à un administrateur autorisé de :

```text
ajouter un rôle
modifier un rôle
renommer un rôle
désactiver un rôle
modifier son template de permissions
```

Un rôle déjà utilisé historiquement ne doit pas être supprimé physiquement par défaut.

---

# 6. RoleDefinition

Structure conceptuelle :

```ts
RoleDefinition {
  roleId

  code
  label

  description?

  isActive

  defaultPermissions[]

  createdAt
  updatedAt
}
```

`defaultPermissions` sert de template et non de source définitive d'autorisation.

---

# 7. Plusieurs rôles par utilisateur

Un utilisateur peut posséder :

```text
1..N rôles
```

Exemple :

```text
Coach principal
+
Analyste vidéo
```

ou :

```text
Responsable Formation
+
Coach principal
```

Les rôles ne doivent pas être exclusifs.

---

# 8. Rôle actif

Après connexion, si l'utilisateur possède plusieurs rôles, CoachPulse lui permet de sélectionner son :

```text
activeRoleId
```

Ce rôle actif définit le contexte fonctionnel courant de l'interface.

L'utilisateur peut changer de rôle actif à tout moment sans se déconnecter.

---

# 9. Rôle actif ≠ nouvelle identité

Changer de rôle actif :

- ne change pas le `userId` ;
- ne change pas l'authentification ;
- ne modifie pas les données historiques ;
- ne crée pas une nouvelle session Firebase.

Il change uniquement le contexte de permissions et d'interface.

---

# 10. Sélection automatique du rôle

Si l'utilisateur possède un seul rôle actif, CoachPulse peut le sélectionner automatiquement.

S'il en possède plusieurs, CoachPulse peut :

1. proposer un sélecteur après connexion ;
2. mémoriser le dernier rôle utilisé ;
3. permettre de le changer ensuite à tout moment.

Le dernier rôle sélectionné peut être stocké comme préférence utilisateur.

---

# 11. Permissions du rôle actif

Les permissions effectives doivent être calculées dans le contexte du rôle actif.

Exemple :

```text
User
roles:
- COACH_PRINCIPAL
- ANALYSTE_VIDEO
```

En mode `COACH_PRINCIPAL`, l'utilisateur voit les fonctions prévues pour ce rôle.

En mode `ANALYSTE_VIDEO`, l'interface et les permissions effectives peuvent être plus limitées ou différentes.

---

# 12. Pas d'union silencieuse de tous les rôles

CoachPulse ne doit pas automatiquement fusionner toutes les permissions de tous les rôles d'un utilisateur dans l'interface active.

Le rôle sélectionné sert de contexte explicite.

Cela évite qu'un utilisateur utilise involontairement des droits provenant d'un autre rôle.

Les règles administratives globales pourront toutefois définir certaines permissions indépendantes du rôle actif si nécessaire.

---

# 13. TeamAccess

Toutes les permissions métier sportives sont liées à une `Team`.

Structure conceptuelle :

```ts
UserTeamAccess {
  userTeamAccessId

  userId
  teamId

  status

  startDate?
  endDate?

  rolePermissions

  createdAt
  updatedAt
}
```

---

# 14. Permissions toujours liées à une Team

Décision V1.0 :

> Les permissions métier sont toujours évaluées dans le contexte d'une Team.

Exemple : `matches.write` ne signifie jamais « écrire sur tous les Match de CoachPulse ».

Il signifie « écrire sur les Match des Team pour lesquelles cette permission est accordée ».

---

# 15. Multi-Team

Un utilisateur peut avoir accès à plusieurs Team.

Chaque Team peut avoir des permissions différentes.

---

# 16. TeamAccess actif

Un TeamAccess est valide uniquement si `status = ACTIVE` et si ses dates de validité éventuelles incluent la date courante.

---

# 17. TeamAccess expiré

Un accès expiré cesse immédiatement d'autoriser les opérations métier.

Les données historiques créées pendant la période d'accès restent inchangées.

---

# 18. PermissionKey

Format :

```text
domain.action
```

Exemples :

```text
players.read
players.write
attendance.read
attendance.write
matches.read
matches.write
```

---

# 19. DENY by default

> Permission absente = opération refusée.

CoachPulse ne doit jamais déduire qu'un utilisateur connecté possède implicitement des droits.

---

# 20. Autorisation générale

Une opération métier Team-scope est autorisée si :

```text
authenticated
AND
User.status = ACTIVE
AND
activeRole autorisé
AND
TeamAccess actif
AND
permission présente
AND
règles métier satisfaites
```

---

# 21. RoleTemplate

Chaque RoleDefinition peut fournir des permissions par défaut.

Ces permissions servent de point de départ et restent configurables ensuite.

---

# 22. Overrides Team

Les permissions d'un utilisateur peuvent être ajustées Team par Team, même pour un rôle identique.

---

# 23. Permissions Players

```text
players.read
players.write
players.manageAssignments
```

`players.manageAssignments` est distinct car la gestion des affectations PRIMARY / SECONDARY / TEMPORARY est structurelle.

---

# 24. Permissions Sessions

```text
sessions.read
sessions.write
```

---

# 25. Permissions Attendance

```text
attendance.read
attendance.write
```

---

# 26. Permissions RPE

```text
rpe.read
rpe.write
rpe.staffWrite
```

`rpe.write` peut être utilisé pour la saisie personnelle d'une joueuse.

`rpe.staffWrite` permet au staff autorisé de saisir ou corriger avec `source = STAFF`.

---

# 27. Comptes joueuses

Les joueuses possèdent un compte utilisateur dans CoachPulse V2.

Relation :

```text
User.linkedPlayerId
↔
Player.playerId
```

---

# 28. SelfAccess joueuse

Le compte d'une joueuse est limité par défaut à son propre périmètre.

Une joueuse ne doit jamais pouvoir utiliser son compte pour lire les données d'une autre joueuse.

---

# 29. PermissionScope

Le modèle doit pouvoir représenter au minimum :

```text
TEAM
SELF
```

`TEAM` est le périmètre staff.

`SELF` est le périmètre des comptes joueuses.

---

# 30. Permissions Tests

```text
tests.read
tests.write
tests.manage
```

---

# 31. Permissions Match

```text
matches.read
matches.write
matches.correct
formations.manage
matchRoles.manage
matchEventDefinitions.manage
```

---

# 32. Permissions Injury

```text
injuries.read
injuries.write
```

Elles concernent le suivi sportif de blessure et ne donnent pas automatiquement accès aux MedicalRecord.

---

# 33. Permissions Medical

Modèle validé :

```text
medical.read
medical.write
```

combiné avec :

```text
medicalAccessLevel
```

---

# 34. MedicalAccessLevel

Niveaux initiaux :

```text
NONE
SPORT
RESTRICTED
MEDICAL
```

Ils représentent le niveau maximal de confidentialité accessible.

---

# 35. Niveaux médicaux configurables

Les niveaux initiaux ne sont pas figés techniquement pour toujours.

CoachPulse doit permettre ultérieurement de :

```text
ajouter un niveau
renommer un niveau
modifier son ordre
désactiver un niveau
```

sans refondre l'architecture des permissions.

---

# 36. Hiérarchie médicale

Ordre initial :

```text
NONE < SPORT < RESTRICTED < MEDICAL
```

---

# 37. Permission + niveau

Pour lire un MedicalRecord :

```text
medical.read = true
AND
medicalAccessLevel >= record.confidentialityLevel
```

Pour écrire, `medical.write` et le niveau approprié sont nécessaires.

---

# 38. Injury vs Medical

Un utilisateur peut avoir accès aux informations sportives de blessure sans accéder aux notes médicales détaillées.

---

# 39. Kiné / Médecin

Un Kiné ou Médecin peut recevoir `medical.read`, `medical.write` et un niveau MEDICAL sur certaines Teams.

Le rôle seul ne crée jamais automatiquement ces permissions.

---

# 40. CareAppointment

```text
careAppointments.read
careAppointments.write
```

La logistique de rendez-vous reste séparée du contenu médical.

---

# 41. Permissions exports

Les exports sont explicitement limités.

```text
exports.basic
exports.sensitive
```

---

# 42. exports.basic

Permet uniquement d'exporter des données que l'utilisateur est déjà autorisé à lire.

---

# 43. exports.sensitive

Autorise certains exports sensibles et doit être fortement limitée.

---

# 44. Export = intersection des droits

Un export est autorisé uniquement si :

```text
permission export
AND
permission read sur chaque donnée
AND
TeamAccess valide
```

---

# 45. Permissions Import

```text
imports.data
imports.manage
```

---

# 46. Administration utilisateurs

```text
users.read
users.manage
```

`users.manage` permet notamment création, désactivation, rôles, TeamAccess et permissions.

---

# 47. Administration structure

```text
teams.read
teams.manage
categories.read
categories.manage
seasons.read
seasons.manage
roles.manage
```

---

# 48. Gestion des rôles

`roles.manage` permet de créer, modifier et désactiver les RoleDefinition et leurs templates.

---

# 49. Fiche joueuse

La fiche joueuse ne possède pas une permission universelle.

Elle charge uniquement les domaines autorisés.

---

# 50. Fiche équipe / Analyse équipe

Une agrégation ne peut jamais contourner les permissions de ses sources.

---

# 51. Pas d'escalade par agrégation

> Dashboard, KPI, graphiques, rapports et analyses ne peuvent révéler une information que l'utilisateur ne peut pas lire directement.

---

# 52. Dashboard

Le Dashboard charge uniquement les widgets autorisés pour le rôle actif et les Team accessibles.

---

# 53. UI guards

L'UI masque ou désactive les actions interdites, mais ceci n'est qu'une couche ergonomique.

---

# 54. Service guards

Toute opération métier sensible appelle `permissionsService`.

Conceptuellement :

```text
permissionsService.can({
  userId,
  activeRoleId,
  teamId,
  permissionKey,
  scope
})
```

---

# 55. Repositories

Les repositories ne doivent pas offrir de chemin simple permettant de contourner les contrôles métier.

---

# 56. Firestore Security Rules

Les Security Rules constituent la dernière barrière de sécurité.

Elles doivent vérifier l'authentification, l'utilisateur actif, le TeamAccess, la permission, le scope et les contraintes sensibles nécessaires.

---

# 57. Cohérence des couches

La même décision d'autorisation doit être cohérente dans :

```text
UI
Services
Firestore Security Rules
```

---

# 58. Rôle actif et Security Rules

Firestore ne doit pas faire confiance à un simple rôle actif stocké uniquement côté client.

La stratégie technique de représentation vérifiable du rôle actif sera définie dans `FIRESTORE_STRUCTURE.md` et `ARCHITECTURE_DECISIONS.md`.

---

# 59. AuditLog obligatoire

CoachPulse V2 intègre un système d'audit dès la fondation.

```ts
AuditLog {
  auditLogId
  userId
  activeRoleId?
  teamId?
  action
  resourceType
  resourceId
  timestamp
  metadata?
}
```

---

# 60. Actions sensibles auditées

Au minimum :

```text
modification User
modification RoleDefinition
modification TeamAccess
modification permissions
changement PRIMARY
modification MedicalRecord
modification Injury sensible
correction Match COMPLETED
correction TestResult historique
export sensible
```

---

# 61. Audit immuable

Un AuditLog ne doit normalement pas être modifiable par les utilisateurs standards.

---

# 62. Rôle dans l'audit

L'audit enregistre le rôle actif au moment de l'action lorsqu'il est pertinent.

---

# 63. User inactif

`User.status != ACTIVE` entraîne un refus des actions métier.

---

# 64. Admin

Le rôle `ADMIN` peut recevoir un template étendu, mais il ne contourne jamais les invariants métier.

---

# 65. Permissions effectives

Les permissions effectives résultent du contexte :

```text
User
+
activeRoleId
+
TeamAccess
+
permissions configurées
+
scope
+
medicalAccessLevel
+
règles métier
```

---

# 66. Exemple Coach principal

Exemple de template initial possible :

```text
players.read
sessions.read
sessions.write
attendance.read
attendance.write
rpe.read
tests.read
matches.read
matches.write
injuries.read
```

Ce template reste configurable.

---

# 67. Exemple Analyste vidéo

Exemple possible :

```text
players.read
matches.read
tests.read
```

---

# 68. Exemple Préparateur physique

Exemple possible :

```text
players.read
sessions.read
attendance.read
rpe.read
tests.read
tests.write
injuries.read
```

---

# 69. Exemple joueuse

Le compte joueuse utilise un contexte SELF.

Exemple :

```text
players.read SELF
rpe.write SELF
rpe.read SELF
attendance.read SELF
tests.read SELF
```

Les droits exacts seront configurables.

---

# 70. Exemple Kiné

Exemple possible :

```text
players.read
injuries.read
injuries.write
medical.read
medical.write
medicalAccessLevel = MEDICAL
careAppointments.read
careAppointments.write
```

---

# 71. Exemple Responsable Formation

Un Responsable Formation peut avoir plusieurs TeamAccess avec le même rôle actif.

Les permissions restent évaluées Team par Team.

---

# 72. Catalogue initial consolidé

## Administration

```text
users.read
users.manage
teams.read
teams.manage
categories.read
categories.manage
seasons.read
seasons.manage
roles.manage
```

## Players

```text
players.read
players.write
players.manageAssignments
```

## Sessions

```text
sessions.read
sessions.write
```

## Attendance

```text
attendance.read
attendance.write
```

## RPE

```text
rpe.read
rpe.write
rpe.staffWrite
```

## Tests

```text
tests.read
tests.write
tests.manage
```

## Match

```text
matches.read
matches.write
matches.correct
formations.manage
matchRoles.manage
matchEventDefinitions.manage
```

## Injury

```text
injuries.read
injuries.write
```

## Medical

```text
medical.read
medical.write
careAppointments.read
careAppointments.write
```

## Data

```text
imports.data
imports.manage
exports.basic
exports.sensitive
```

---

# 73. Modèle logique

```text
Firebase Auth
      ↓
    User
      │
      ├── roleIds[]
      ├── activeRoleId
      ├── linkedPlayerId?
      └── UserTeamAccess[]
               │
               ├── teamId
               ├── permissions par rôle/contexte
               └── medicalAccessLevel
```

Puis :

```text
AUTHENTICATED?
↓
USER ACTIVE?
↓
ACTIVE ROLE VALID?
↓
SCOPE?
↓
TEAM ACCESS?
↓
PERMISSION?
↓
MEDICAL LEVEL si nécessaire?
↓
BUSINESS RULES?
↓
ALLOW / DENY
```

---

# 74. Règles de conception

1. Aucun rôle n'accorde directement un accès sans permission effective.
2. Toutes les permissions sportives sont liées à une Team.
3. Un utilisateur peut avoir plusieurs rôles.
4. Un seul rôle est actif dans le contexte UI courant.
5. Le rôle actif est modifiable à tout moment.
6. Les rôles sont extensibles et modifiables.
7. Les comptes joueuses utilisent un scope SELF.
8. Les niveaux médicaux sont configurables.
9. Les exports nécessitent une permission spécifique.
10. Toute action sensible laisse une trace d'audit.
11. UI, services et Firestore Rules appliquent la même politique.
12. Permission absente = refus.

---

# 75. Points à préciser dans les documents suivants

`FIRESTORE_STRUCTURE.md` devra définir :

- structure physique des UserTeamAccess ;
- stockage des permissions par rôle actif ;
- index nécessaires ;
- stockage de medicalAccessLevel ;
- structure AuditLog ;
- représentation sûre du rôle actif ;
- règles d'accès aux comptes joueuses.

`ARCHITECTURE_DECISIONS.md` devra préciser :

- stratégie de résolution des permissions effectives ;
- cache des permissions ;
- changement de rôle actif ;
- comportement offline ;
- invalidation des droits ;
- séparation client / Firebase Rules.

---

# 76. Statut V1.0

Ce document constitue la référence V1.0 du modèle de permissions CoachPulse V2.

Décisions figées :

- rôles initiaux définis ;
- rôles configurables ;
- multi-rôles ;
- rôle actif sélectionnable après connexion ;
- changement de rôle actif à tout moment ;
- permissions toujours liées à une Team ;
- comptes joueuses dès la V2 ;
- scope SELF pour les joueuses ;
- permissions médicales simples `medical.read/write` ;
- `medicalAccessLevel` initial NONE / SPORT / RESTRICTED / MEDICAL ;
- niveaux médicaux extensibles ;
- exports limités ;
- AuditLog intégré dès la fondation.


---

# Addendum de cohérence V1.1

## Saison clôturée
La correction de données sportives d'une saison `CLOSED` requiert :

```text
history.correctClosedSeason
```

Cette permission est évaluée dans le contexte Team concerné et ne permet pas de contourner les invariants métier.

## Benchmarks Tests
La gestion des `TestBenchmark` est initialement couverte par :

```text
tests.manage
```

Une permission dédiée pourra être ajoutée ultérieurement si le besoin opérationnel le justifie.

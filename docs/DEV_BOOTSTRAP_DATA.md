# Données de bootstrap DEV

Ce seed crée uniquement des données fictives marquées DEV/DEMO pour valider le socle Auth → User → rôles → permissions → Team → Season → Player → Dashboard. Il ne crée aucune donnée médicale ni aucun module métier supplémentaire.

## Prérequis

- utiliser exclusivement le projet Firebase `coachpulse-v2-dev` ;
- disposer d'un accès Firebase Admin via Application Default Credentials ou un fichier de service account local non versionné ;
- installer les dépendances avec `npm ci` ;
- créer manuellement un compte dans Firebase Authentication sur le projet DEV.

## Préparer le compte Auth

Dans Firebase Console, ouvrir Authentication pour `coachpulse-v2-dev`, créer un compte fictif et relever son UID. Ne jamais committer son mot de passe, son UID ou des credentials.

Définir ensuite les variables dans le terminal :

```bash
export DEV_FIREBASE_PROJECT_ID=coachpulse-v2-dev
export DEV_AUTH_UID='UID_AUTH_LOCAL'
export DEV_AUTH_EMAIL='staff.demo@example.test'
```

Pour une exécution réelle, authentifiez Firebase Admin avec `gcloud auth application-default login` ou définissez `GOOGLE_APPLICATION_CREDENTIALS` vers un fichier local ignoré par Git.

## Vérifier puis lancer

Le dry-run valide le projet, le dataset Zod et les invariants sans initialiser Firebase ni écrire :

```bash
npm run seed:dev:dry
```

Après contrôle de la liste des documents :

```bash
npm run seed:dev
```

Le seed vérifie que l'UID existe dans Firebase Authentication et que son email correspond à `DEV_AUTH_EMAIL`. Il réalise ensuite des upserts déterministes avec Firebase Admin SDK.

## Résultat attendu

Le projet contient une saison active `2026-2027`, deux catégories/sous-catégories, deux Teams DEVELOPMENT, une FIRST_TEAM sans Season/Category forcée, cinq joueuses fictives, des affectations PRIMARY/SECONDARY/TEMPORARY, une joueuse sans affectation, trois rôles, un User multi-rôle et trois TeamAccess.

Après démarrage de l'application, le compte permet de tester le Dashboard, le changement de rôle, les Teams accessibles, la saison active et le nombre de joueuses par Team.

## Relancer sans risque

Les IDs sont stables et le script utilise des upserts : une relance met à jour les mêmes documents sans doublon. Il ne supprime aucune collection ni aucun document. Les documents DEV ciblés sont listés dans la sortie.

La garde est stricte : toute valeur absente ou différente de `DEV_FIREBASE_PROJECT_ID=coachpulse-v2-dev`, y compris un projectId PROD, arrête le script avant toute initialisation Firebase.

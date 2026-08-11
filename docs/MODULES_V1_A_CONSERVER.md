# MODULES_V1_A_CONSERVER.md

## CoachPulse V2 — Audit fonctionnel de CoachPulse V1

**Version :** 1.0  
**Statut :** Référence consolidée  
**Objectif :** identifier ce qui doit être conservé, amélioré ou abandonné lors du passage de CoachPulse V1 à CoachPulse V2.

> La V1 sert de référence fonctionnelle. Le code V1 n'est pas migré.

---

# 1. Règle de lecture

Chaque domaine est classé selon trois catégories :

```text
À CONSERVER
→ fonctionnalité, comportement ou besoin validé

À AMÉLIORER
→ principe utile, mais conception, UX, données ou architecture à revoir

À ABANDONNER
→ doublon, mauvaise décision technique, source de vérité parallèle ou fonctionnalité inutile
```

Un élément marqué « À CONSERVER » ne signifie jamais que son implémentation V1 doit être copiée.

---

# 2. Dashboard

## À CONSERVER

- Dashboard personnalisé selon l'utilisateur connecté.
- Informations issues des Teams accessibles à l'utilisateur.
- Prochaines séances.
- Derniers résultats.
- Derniers tests utiles.
- Informations récentes pertinentes.
- Navigation rapide vers les modules autorisés.
- Respect du rôle actif et des permissions.

## À AMÉLIORER

- Le Dashboard multi-équipe doit résumer les différentes Teams accessibles.
- Éviter d'imposer une seule Team active pour comprendre l'activité globale de l'utilisateur.
- Permettre ensuite de filtrer ou d'ouvrir une Team précise.
- Contextualiser les données par saison.
- Charger progressivement les blocs.
- Limiter les KPI aux informations réellement utiles.
- Chaque bloc possède ses propres états loading / empty / error.
- Prévoir un Dashboard spécifique ou adapté aux comptes joueuses SELF.
- Utiliser des services d'agrégation communs.

## À ABANDONNER

- Chargement de toute la base au démarrage.
- Données métier codées dans la page Dashboard.
- Calculs métier dans les cartes.
- Widgets possédant leur propre copie des données.
- Dashboard dépendant directement de la structure interne des autres pages.

**Décision : CONSERVER + RECONCEVOIR.**

---

# 3. Équipes

## À CONSERVER

- Fiche équipe.
- Effectif.
- Résultats.
- Statistiques collectives.
- Accès aux joueuses liées à l'équipe.
- Analyse de l'évolution.
- V/N/D.
- Taux de victoire.
- Accès central par `teamId`.

## À AMÉLIORER

- Team devient une entité centrale.
- L'effectif est obtenu depuis `PlayerTeamAssignment`.
- Distinguer effectif actuel et historique.
- Permettre de consulter l'effectif d'une Team à une date historique précise.
- Permettre plusieurs Teams pour une même Category.
- Charger progressivement la fiche.
- Dériver les statistiques depuis les sources métier.
- Ne pas coder les systèmes ou dispositifs directement dans la fiche.

## À ABANDONNER

- Listes de joueuses propres à chaque module.
- Nom de Team utilisé comme identifiant stable.
- Statistiques collectives stockées indépendamment lorsqu'elles sont recalculables.
- Duplication des Match dans la fiche équipe.
- Association permanente `Player.teamId`.

**Décision : CONSERVER FORTEMENT + RECONSTRUIRE.**

---

# 4. Joueuses

## À CONSERVER

- Identité unique.
- Photo.
- Date de naissance.
- Pied fort.
- Profil de joueuse.
- Fiche individuelle.
- Présences.
- RPE / charge.
- Tests.
- Match.
- Blessures.
- Informations médicales autorisées.
- `playerId` comme identifiant transversal.

## À AMÉLIORER

- Une seule source canonique `players`.
- Affectations Team séparées et temporelles.
- Sous-catégorie déterminée selon date de naissance + saison.
- Category obtenue depuis la sous-catégorie.
- Plusieurs Teams simultanées possibles.
- Affectations PRIMARY / SECONDARY / TEMPORARY.
- Compte joueuse éventuellement relié via `linkedPlayerId`.
- Fiche joueuse chargée progressivement.
- Historique reconstruit depuis les données sources.
- Ajouter la nationalité de la joueuse.
- Ajouter la date d'arrivée au club.
- Ajouter le dernier club quitté.

## À ABANDONNER

- Listes Player dupliquées par module.
- Team permanente dans Player.
- Category permanente dans Player.
- SubCategory permanente dans Player.
- Poste principal permanent.
- Numéro de maillot permanent.
- Statistiques stockées directement dans Player.
- Objet Player contenant tout son historique.

**Décision : CONSERVER LE CONCEPT + RECONSTRUIRE LE MODÈLE.**

---

# 5. Saisons

## À CONSERVER

- Notion de saison.
- Saison active.
- Filtres par saison.
- Historique saisonnier.

## À AMÉLIORER

- `seasonId` transversal.
- Une seule définition canonique de la saison active.
- Changement de saison contrôlé.
- Requêtes saisonnières explicites.
- Saison clôturée en lecture seule par défaut.
- Correction d'une saison clôturée uniquement avec autorisation spéciale.
- Toute correction sensible doit pouvoir être auditée.
- Préparer proprement le passage de saison.

## À ABANDONNER

- Saison définie séparément dans plusieurs modules.
- Année codée en dur.
- Déduction de saison implémentée à plusieurs endroits.
- Duplication des Players pour créer une nouvelle saison.
- Modification du Player pour représenter le changement de saison.

**Décision : CONSERVER + CENTRALISER.**

---

# 6. Sessions / Présences

## À CONSERVER

- Planning des séances.
- Filtrage par période.
- Suivi individuel des présences.
- Statuts de présence.
- Historique par joueuse.
- Vue collective.
- Invitations ponctuelles.
- Distinction séance prévue / terminée / annulée.

## À AMÉLIORER

- `1 Session = 1 Category`.
- Plusieurs catégories au même moment = plusieurs Sessions.
- Population attendue figée via `SessionParticipant`.
- Une Attendance canonique par `sessionId + playerId`.
- Gestion des retards et participations partielles.
- Calcul du taux de présence centralisé.
- Distinguer présence et justification d'absence.
- Requêtes limitées aux périodes utiles.
- Historique indépendant de l'effectif actuel.
- Saison clôturée en lecture seule.

## À ABANDONNER

- Session unique regroupant plusieurs Categories.
- Population historique recalculée uniquement depuis l'effectif actuel.
- Statuts divergents entre modules.
- Calculs de présence dans les composants.
- Valeur manquante transformée automatiquement en absence ou zéro.
- Chargement de tout l'historique au lancement.

**Décision : CONSERVER + NORMALISER FORTEMENT.**

---

# 7. RPE / Charge

## À CONSERVER

- RPE 1–10.
- Note de qualité de séance 1–10.
- Commentaire libre.
- Historique individuel.
- Durée de participation.
- Suivi hebdomadaire et mensuel.

## À AMÉLIORER

- Un RPE canonique par Player et Session.
- Saisie SELF pour le compte joueuse.
- Conserver la provenance PLAYER / STAFF / IMPORT.
- Distinguer absence de RPE et valeur nulle.
- Formule de charge centralisée.
- Charge basée sur durée effective × RPE selon les règles métier.
- Afficher la complétude des données.
- Agrégations collectives explicites : moyenne, médiane, distribution.
- Chargement par période utile.

## À ABANDONNER

- RPE sans lien fiable avec Session.
- Charge manuelle lorsqu'elle est recalculable.
- RPE manquant = 0.
- Formules différentes selon l'écran.
- Remplacement silencieux d'un RPE joueuse par une estimation staff.

**Décision : CONSERVER + CENTRALISER.**

---

# 8. Tests techniques

## À CONSERVER

- Jonglerie.
- Historique.
- Comparaison individuel / collectif.
- Dernier résultat.
- Meilleure performance.
- Graphiques d'évolution.
- Ajout futur de conduite, passe, frappe et autres protocoles.

## À AMÉLIORER

- Moteur configurable `TestDefinition / TestSession / TestResult`.
- `STRONG_FOOT / WEAK_FOOT` selon `Player.preferredFoot`.
- Plusieurs mesures par protocole.
- Plusieurs tentatives.
- `HIGHER_IS_BETTER / LOWER_IS_BETTER`.
- Versionnement des protocoles.
- États UNKNOWN / INVALID / NOT_PERFORMED.
- `1 TestSession = 1 Category`.
- Objectifs/références reliés à la sous-catégorie.
- Prévoir un modèle de benchmark configurable.
- Permettre plusieurs niveaux de référence si nécessaire.
- Comparer un résultat aux objectifs de sa sous-catégorie.
- Comparer différentes générations à sous-catégorie équivalente.
- Comparer une même joueuse sur plusieurs saisons.
- Comparer plusieurs joueuses sur une même saison.
- Filtres explicites par saison, sous-catégorie, joueuse et protocole.
- Afficher la population réellement comparée.
- Comparer uniquement des protocoles/version compatibles.

## À ABANDONNER

- Test technique codé en dur dans une page.
- Colonnes spécifiques par test.
- PD/PG comme logique métier principale.
- Meilleur résultat saisi manuellement.
- Comparaisons de protocoles incompatibles.
- Valeur manquante = 0.
- Nouveau module technique pour chaque nouveau test.

**Décision : CONSERVER LES USAGES + ABANDONNER L'ARCHITECTURE SPÉCIFIQUE PAR TEST.**

---

# 9. Tests athlétiques

## À CONSERVER

- Sprint.
- Cooper / endurance.
- VMA et autres protocoles physiques.
- Historique individuel.
- Comparaisons temporelles.
- Meilleure performance.
- Moyennes et distributions.
- Graphiques d'évolution.

## À AMÉLIORER

- Utiliser le même moteur générique que les tests techniques.
- Protocoles configurables.
- Unités explicites.
- Règles d'interprétation dans TestDefinition.
- Conservation des tentatives brutes.
- Résultats dérivés recalculables.
- Versionnement des protocoles.
- Complétude du groupe.
- Objectifs/références par sous-catégorie.
- Comparaison de générations différentes.
- Comparaison d'une même joueuse entre saisons.
- Comparaison de plusieurs joueuses sur une même saison.
- Comparaison résultat ↔ benchmark.
- Afficher moyenne, médiane, distribution et positionnement.
- Comparer uniquement des protocoles compatibles.

## À ABANDONNER

- Architecture de données séparée uniquement parce que le test est athlétique.
- Formules cachées dans les graphiques.
- Valeurs dérivées comme seule source.
- Protocoles différents comparés uniquement parce qu'ils portent le même nom.
- Radar mélangeant des unités sans normalisation documentée.

**Décision : CONSERVER + FUSIONNER DANS LE MOTEUR DE TEST UNIQUE.**

---

# 10. Match / prise de statistiques

## À CONSERVER

- Prise de statistiques live.
- Usage tablette / smartphone / ordinateur.
- Score live.
- Chronomètre configurable.
- Composition.
- Remplacements.
- Statistiques individuelles et collectives.
- Actions CoachPulse et adversaires.
- Terrain interactif.
- Timeline.
- Annulation/correction d'une action.
- Bilans post-Match.
- Exports autorisés.

## À AMÉLIORER

- Match relié à Team.
- Moteur unique MatchEvent.
- Événements extensibles.
- Score dérivé des GOAL.
- GOAL implique un tir cadré.
- SAVE implique un tir cadré adverse.
- Assist comme propriété du GOAL.
- Possession reconstruite depuis les événements.
- Une seule implémentation des statistiques.
- Correction d'événement = recalcul des données dérivées.
- Match live offline.
- Appareil principal de saisie recommandé.
- Chargement limité au Match utile.

## À ABANDONNER

- Compteurs indépendants des événements.
- Moteurs CoachPulse/adversaire parallèles.
- Double saisie GOAL + SHOT_ON_TARGET.
- Double saisie SAVE + tir cadré adverse.
- Score indépendant.
- Stats Match copiées dans plusieurs modules.
- Calculs différents entre live, bilan et fiches.
- Gros fichier Match mélangeant UI, Firebase et règles métier.

**Décision : CONSERVER FORTEMENT L'USAGE TERRAIN + RECONSTRUIRE LE MOTEUR.**

---

# 11. Composition / rôles / dispositifs

## À CONSERVER

- Composition visuelle.
- Foot à 8.
- Foot à 11.
- Plusieurs systèmes.
- Drag & drop.
- Banc.
- Temps de jeu.
- Temps par rôle.

## À AMÉLIORER

- Séparer PlayerProfile et rôle Match.
- Rôles configurables.
- Formations configurables.
- Ajouter/modifier rôles et systèmes sans modifier le moteur.
- Remplacement = fermeture/ouverture de périodes.
- Changement de rôle = nouvelle période.
- Échange de deux joueuses = opération métier cohérente.
- Historiser les changements de dispositif si nécessaire.

## À ABANDONNER

- Positions uniquement visuelles.
- Poste Match dans Player.
- Temps de jeu estimé depuis les actions.
- Formations codées dans les composants.
- Drag & drop sans écriture métier correspondante.

**Décision : CONSERVER L'UX + STRUCTURER LES PÉRIODES DE JEU.**

---

# 12. Chronomètre Match

## À CONSERVER

- Chronomètre central.
- Durée configurable.
- Pause/reprise.
- Plusieurs périodes si nécessaire.

## À AMÉLIORER

- `gameSecond` comme référence sportive.
- Distinguer temps sportif et timestamp technique.
- Chaque événement connaît sa période.
- Pause réelle exclue du temps sportif.
- Fin de Match ferme les périodes joueuses ouvertes.

## À ABANDONNER

- Durée codée en dur.
- Temps de jeu dérivé uniquement de l'heure réelle.
- Chronomètres parallèles.

**Décision : CONSERVER + CENTRALISER.**

---

# 13. Terrain / spatialisation

## À CONSERVER

- Terrain horizontal.
- Interaction tactile.
- Localisation des actions.
- Sens d'attaque lisible.
- Exploitation pour heatmaps.

## À AMÉLIORER

- Coordonnées normalisées x/y.
- Référentiel canonique unique.
- CoachPulse attaque vers la droite dans le modèle canonique.
- Transformation UI selon le sens physique réel.
- `pitchZoneId` dérivé.
- Grilles configurables.
- Zones dangereuses configurables.
- Même moteur spatial partout.

## À ABANDONNER

- Zone 1–9 comme seule source spatiale.
- Coordonnées propres à chaque écran.
- Sens d'attaque incohérent entre live et bilans.
- Plusieurs moteurs terrain.

**Décision : CONSERVER + NORMALISER.**

---

# 14. Heatmaps

## À CONSERVER

- Heatmaps collectives.
- Heatmaps individuelles.
- Filtres par action.
- Agrandissement.
- Tooltip détaillé.
- Comparaison CoachPulse / adversaire.

## À AMÉLIORER

- Source unique `MatchEvent.coordinates`.
- Moteur unique de filtrage.
- Même dataset filtré pour compteur et tooltip.
- Agrégation multi-Match.
- Filtres Player, side, eventType, Match, Season, période.
- Réutilisation future pour comparaisons saison/génération.

## À ABANDONNER

- Moteurs collectif/individuel différents.
- Compteur et tooltip calculés séparément.
- Heatmap persistée comme source métier.
- Zones dupliquées.

**Décision : CONSERVER FORTEMENT + MOTEUR UNIQUE.**

---

# 15. Possession

## À CONSERVER

- Possession live.
- Initialisation au coup d'envoi.
- Changement lié aux événements.

## À AMÉLIORER

- État temporel COACHPULSE / OPPONENT / UNKNOWN.
- Reconstruction depuis événements.
- GOAL change immédiatement la possession.
- RECOVERY et DUEL influencent la possession selon règles.
- Sorties de balle précisent la prochaine possession.
- Calcul en secondes puis pourcentage.
- Affichage de complétude en présence de UNKNOWN.

## À ABANDONNER

- Pourcentage saisi manuellement.
- Bascule indépendante sans justification métier.
- Compteurs parallèles.

**Décision : CONSERVER + RECONSTRUIRE LE MOTEUR TEMPOREL.**

---

# 16. Bilans Match

## À CONSERVER

- Score.
- V/N/D.
- Stats collectives.
- Stats individuelles.
- Temps de jeu.
- Heatmaps.
- Timeline.
- Comparaisons avec l'adversaire.
- Données gardienne.
- Synthèse visuelle.

## À AMÉLIORER

- Tout reconstruire depuis les sources Match.
- Ratios recalculés depuis les volumes.
- Gardienne active depuis MatchPlayerPeriod.
- Score uniquement depuis GOAL.
- Corrections répercutées automatiquement.
- Même moteur pour bilan, fiche joueuse et analyse équipe.
- Insights futurs explicables depuis les données sources.

## À ABANDONNER

- Bilan comme deuxième source de vérité.
- Stats ressaisies après Match.
- Calculs différents du live.
- Exports/PDF recalculant leurs propres statistiques.

**Décision : CONSERVER L'EXPÉRIENCE + ABANDONNER LA LOGIQUE PARALLÈLE.**

---

# 17. Points Match volontairement ouverts

À définir ultérieurement sans bloquer la fondation :

- ballons touchés / ballons bonifiés ;
- modèle xG ;
- règle exacte de clean sheet avec plusieurs gardiennes ;
- UX ultra-rapide des sorties de balle et changements de possession.

Ces sujets ne doivent pas être inventés par Codex avant décision métier.

---

# 18. Fiche joueuse

## À CONSERVER

- Vue centrale.
- Identité.
- Photo.
- Date de naissance.
- Nationalité.
- Date d'arrivée au club.
- Dernier club quitté.
- Profil.
- Pied fort.
- Affectations.
- Présences.
- RPE / charge.
- Tests.
- Stats Match.
- Blessures.
- Médical autorisé.
- Évolution.

## À AMÉLIORER

- Agrégation par `playerId`.
- Chargement par sections.
- Saison sélectionnable.
- Historique multi-saison.
- Comparaison de la même joueuse entre saisons.
- Comparaison avec d'autres joueuses de la même saison.
- Comparaison avec des générations/références pertinentes.
- Services métier communs.
- Médical chargé uniquement si autorisé.
- Insights explicables.

## À ABANDONNER

- Objet playerProfile servant de deuxième base.
- Tests codés en dur.
- Historique basé sur l'équipe actuelle.
- Médical chargé par défaut.
- Règles métier spécifiques à la fiche.
- Page géante contenant récupération, calcul et affichage.

**Décision : CONSERVER FORTEMENT COMME VUE D'AGRÉGATION.**

---

# 19. Fiche équipe

## À CONSERVER

- Identité Team.
- Effectif.
- Résultats.
- V/N/D.
- Taux de victoire.
- Stats Match.
- Tests collectifs.
- Présences.
- Charge.
- Tendances.
- Visuels.

## À AMÉLIORER

- Basée sur `teamId`.
- Effectif actuel ou historique à une date précise.
- Reconstruction via PlayerTeamAssignment.
- PRIMARY / SECONDARY / TEMPORARY visibles si utile.
- Stats dérivées.
- Filtres saison/période.
- Complétude visible.
- Comparaisons historiques pertinentes.
- Chargement progressif.

## À ABANDONNER

- Effectif copié.
- Effectif actuel appliqué rétroactivement.
- V/N/D stockés indépendamment.
- Ratios manuels.
- Duplication des autres modules.

**Décision : CONSERVER + RECONSTRUIRE AUTOUR DE teamId.**

---

# 20. Analyse équipe

## À CONSERVER

- Analyse multi-domaines.
- Résultats.
- Tendances.
- Présences.
- Charge.
- Tests.
- Stats Match.
- Heatmaps.
- Comparaisons temporelles.
- Classements/podiums utiles.

## À AMÉLIORER

- Couche d'agrégation.
- Contexte explicite teamId + seasonId + dateRange.
- Comparaisons inter-générations.
- Comparaisons multi-saisons.
- Population comparée explicitement.
- Ratios recalculés.
- Possession multi-Match calculée depuis le temps connu.
- Tests comparés uniquement si compatibles.
- Médical exclu par défaut.

## À ABANDONNER

- `analysisData` comme source de vérité.
- Formules propres à l'écran.
- UNKNOWN traité comme zéro.
- Comparaisons de populations différentes sans avertissement.
- Podiums manuels.

**Décision : CONSERVER FORTEMENT COMME SERVICE D'AGRÉGATION.**

---

# 21. Blessures

## À CONSERVER

- Épisode de blessure.
- Zone corporelle.
- Côté.
- Douleur 1–10.
- Date de début.
- Retour estimé.
- Disponibilité.
- Historique.
- Corps humain interactif.
- Historique par zone.

## À AMÉLIORER

- Injury distinct de Attendance.
- Une Injury = un épisode.
- InjuryUpdate pour l'évolution.
- Disponibilité structurée.
- Restrictions sportives structurées.
- Historique non écrasé.
- Affichage limité aux informations autorisées.
- Indisponibilité dérivée.

## À ABANDONNER

- Nouvelle Injury à chaque absence.
- Diagnostic automatique.
- Valeurs anciennes écrasées.
- Médical sensible dans Injury.
- Suppression de l'historique au retour.

**Décision : CONSERVER + SÉPARER SPORTIF ET MÉDICAL.**

---

# 22. Suivi médical

## À CONSERVER

- Rendez-vous kiné/médecin.
- Date.
- Suivi.
- Recommandations/restrictions.
- Lien avec Injury si nécessaire.
- Historique.

## À AMÉLIORER

- CareAppointment distinct de MedicalRecord.
- Niveaux de confidentialité.
- Permissions médicales.
- medicalAccessLevel.
- accessTeamIds[].
- Chargement à la demande.
- Audit serveur des actions sensibles.
- Minimisation des données.
- Niveaux configurables.

## À ABANDONNER

- Médical complet visible par le staff sportif.
- Rôle Coach donnant implicitement accès au médical.
- Notes médicales libres partagées partout.
- Audit client comme seule preuve.
- Préchargement offline massif.

**Décision : CONSERVER LE BESOIN + RECONSTRUIRE LA SÉCURITÉ.**

---

# 23. Rôles et permissions

## À CONSERVER

- Accès différenciés.
- Accès par Team.
- Rôles sportifs.
- Lecture/écriture selon domaine.

## À AMÉLIORER

- Rôles configurables.
- Multi-rôle.
- Rôle actif sélectionnable.
- Changement de rôle à tout moment.
- Permissions explicites.
- Team scope.
- SELF.
- AuditLog.
- Sécurité UI + services + Firestore Rules.
- Permissions médicales distinctes.

## À ABANDONNER

- Permissions uniquement frontend.
- Rôle = droits implicites figés.
- Accès automatique à tout le club.
- Permissions globales implicites.
- Menu visible = donnée autorisée.

**Décision : RECONSTRUIRE DEPUIS LA RACINE.**

---

# 24. Imports / Exports

## À CONSERVER

- Imports utiles.
- Export CSV.
- Export JSON.
- Export PDF.
- Migration des données V1 utiles.

## À AMÉLIORER

- Pipeline contrôlé :
  Extract → Normalize → Validate → Resolve IDs → Dry Run → Import.
- Mapping explicite.
- Rapport d'erreurs.
- Détection de doublons.
- Exports soumis aux permissions.
- Différencier exports standards et sensibles.
- Exports utilisant les mêmes services métier que l'UI.
- Migration limitée à la saison en cours.
- Opérations privilégiées côté serveur/scripts si nécessaire.

## À ABANDONNER

- Import JSON brut directement dans Firestore.
- Export avec calculs indépendants.
- Legacy import sans mapping.
- Export médical implicite.
- Synchronisation permanente bidirectionnelle V1 ↔ V2.

**Décision : CONSERVER + SÉCURISER.**

---

# 25. Firebase / Synchronisation / Offline

## À CONSERVER

- Firebase Authentication.
- Firestore.
- Firebase Hosting.
- Synchronisation cloud.
- Multi-appareil.
- Offline.
- PWA.

## À AMÉLIORER

- Firebase DEV et PROD séparés.
- V1 et V2 séparées.
- Repositories centralisés.
- TanStack Query pour server state.
- Persistance Firestore offline contrôlée.
- Match offline.
- Attendance/RPE compatibles réseau faible.
- Cloud Functions pour opérations sensibles.
- Emulator Suite.
- Pas de listener global.
- Préchargement intelligent.

## À ABANDONNER

- Toute la base chargée au démarrage.
- Synchronisation permanente de toutes les collections.
- Firestore dans les pages.
- Firebase dupliqué par module.
- Médical sensible préchargé inutilement.
- Base Firebase V1 utilisée comme DEV V2.

**Décision : CONSERVER FIREBASE + RECONSTRUIRE LA COUCHE DATA.**

---

# 26. Décisions transversales consolidées

## AUDIT-001
Le Dashboard doit pouvoir résumer plusieurs Teams accessibles.

## AUDIT-002
Une fiche Team doit pouvoir reconstruire son effectif à une date historique.

## AUDIT-003
Un Player peut exister sans affectation Team active.

## AUDIT-004
Une saison clôturée est read-only par défaut.

## AUDIT-005
Une correction d'une saison clôturée nécessite une autorisation spécifique.

## AUDIT-006
Player doit intégrer nationalité, date d'arrivée au club et dernier club quitté.

## AUDIT-007
Les tests doivent disposer de benchmarks/objectifs liés à la sous-catégorie.

## AUDIT-008
Les tests doivent permettre les comparaisons inter-générations.

## AUDIT-009
Les tests doivent permettre de comparer une même joueuse entre plusieurs saisons.

## AUDIT-010
Les tests doivent permettre de comparer plusieurs joueuses sur une même saison.

## AUDIT-011
Les comparaisons de tests nécessitent des protocoles compatibles.

## AUDIT-012
L'usage terrain Match V1 est à conserver mais son moteur doit être entièrement reconstruit.

## AUDIT-013
Les heatmaps doivent utiliser une source et un moteur uniques.

## AUDIT-014
Les fiches Player et Team sont des vues d'agrégation et non de nouvelles sources de vérité.

## AUDIT-015
Le médical doit être séparé du suivi sportif général.

## AUDIT-016
Les permissions doivent être intégrées dès la fondation V2.

## AUDIT-017
La V2 conserve Firebase mais remplace les accès data dispersés par une architecture Repository/Service.

---

# 27. Synthèse générale

## À conserver fortement

```text
Dashboard contextualisé
Teams
Players
Sessions / Attendance
RPE / charge
Tests
Match live
Composition
Terrain interactif
Heatmaps
Bilans
Fiche joueuse
Fiche équipe
Analyse équipe
Blessures
Suivi médical
Permissions
Exports
Firebase / offline
```

## À améliorer structurellement

```text
modèle Player
affectations Team
historique
moteur de tests
benchmarks
comparaisons
moteur Match
possession
spatialisation
agrégations
permissions
sécurité médicale
cache
offline
migration
```

## À abandonner définitivement

```text
code legacy V1
grosses pages contenant toute la logique
Firestore directement dans React
listes Player dupliquées
sources de vérité parallèles
statistiques dupliquées
formules propres à chaque écran
données manquantes transformées en zéro
permissions uniquement UI
chargement massif au démarrage
synchronisation V1 ↔ V2 permanente
```

---

# 28. Principe final

CoachPulse V2 doit préserver ce qui fait la valeur fonctionnelle de CoachPulse V1 tout en supprimant les décisions techniques ayant créé sa dette.

```text
V1
→ référence fonctionnelle

V2
→ réimplémentation propre
```

La question à poser pour chaque fonctionnalité V1 n'est pas :

> « Comment copier ce module ? »

mais :

> « Quel besoin métier valide ce module satisfait-il, et quelle est la manière la plus propre de le représenter dans l'architecture V2 ? »

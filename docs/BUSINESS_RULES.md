# BUSINESS_RULES.md

## CoachPulse V2 — Règles métier

**Version :** 1.0  
**Statut :** Référence consolidée  
**Objectif :** définir les règles métier canoniques de CoachPulse V2.  
**Principe :** une règle métier = une implémentation unique.

---

# 1. Principes transversaux

## BR-001 — Saison active
CoachPulse peut stocker plusieurs saisons, mais une seule saison est considérée comme active par défaut à un instant donné.

## BR-002 — Sous-catégorie calculée
La sous-catégorie d'une joueuse est dérivée de `Player.birthDate` et de la `Season`.

## BR-003 — Catégorie
La catégorie est distincte de la sous-catégorie et constitue un regroupement sportif.

## BR-004 — Équipes d'une catégorie
Une `Category` peut être reliée à une ou plusieurs `Team`.

## BR-005 — Affectation équipe
Une joueuse appartient aux équipes via `PlayerTeamAssignment`, jamais via un `teamId` permanent dans `Player`.

## BR-006 — Multi-affectation
Une joueuse peut avoir plusieurs affectations actives simultanément.

## BR-007 — Équipe PRIMARY définie manuellement
L'équipe principale d'une joueuse est définie explicitement par le staff via `PlayerTeamAssignment`. Elle n'est pas calculée depuis la saison, la catégorie ou la sous-catégorie.

## BR-008 — Unicité PRIMARY
À une date donnée, une joueuse ne peut avoir qu'une seule affectation `PRIMARY` active. Elle peut avoir plusieurs `SECONDARY` et `TEMPORARY`.

## BR-009 — Affectation temporaire
Une affectation `TEMPORARY` possède une période explicite et reste historisée après expiration.

## BR-010 — Changement d'équipe
Changer d'équipe ferme l'ancienne affectation et crée une nouvelle affectation. L'historique n'est jamais écrasé.

## BR-011 — Aucun changement automatique de PRIMARY
Un changement de saison, sous-catégorie ou catégorie ne modifie jamais automatiquement l'équipe PRIMARY.

## BR-012 — Population d'une catégorie
La population d'une catégorie à une date donnée est reconstruite à partir des Teams concernées et des `PlayerTeamAssignment` valides, avec déduplication par `playerId`.

## BR-013 — Invitation ponctuelle
Une joueuse peut participer ponctuellement à une Session, un TestSession ou un Match sans modification automatique de ses affectations.

## BR-014 — PlayerProfile
`Player.playerProfile` décrit une famille générale : `GOALKEEPER`, `DEFENDER`, `MIDFIELDER`, `FORWARD`.

## BR-015 — Pied fort
`Player.preferredFoot` est la source de vérité : `LEFT`, `RIGHT` ou `UNKNOWN`.

---

# 2. Sessions, présences, RPE et charge

## BR-016 — Une Session appartient à une Category
Chaque Session est reliée à exactement une `Season` et une `Category`.

## BR-017 — Plusieurs catégories simultanées
Si plusieurs catégories s'entraînent au même moment, CoachPulse crée une Session distincte pour chaque catégorie.

## BR-018 — Population théorique
La population théorique d'une Session est dérivée de la Category, de la date et des affectations actives.

## BR-019 — SessionParticipant
Une joueuse extérieure peut être ajoutée ponctuellement comme participante invitée sans modifier son affectation structurelle.

## BR-020 — Population figée
Une fois la population réelle de la Session établie, les changements d'affectation futurs ne modifient pas rétroactivement la séance.

## BR-021 — Unicité Attendance
`sessionId + playerId` est unique pour Attendance.

## BR-022 — AttendanceStatus
Statuts initiaux : `PRESENT`, `LATE`, `ABSENT_JUSTIFIED`, `ABSENT_UNJUSTIFIED`, `INJURED`, `SICK`, `EXTERNAL_PROGRAM`, `EXCUSED`.

## BR-023 — PRESENT
La joueuse a participé normalement.

## BR-024 — LATE
La joueuse a participé mais avec un retard mesurable via `arrivalDelayMinutes`.

## BR-025 — Durée retard
Sans durée individuelle manuelle, la durée de participation d'une joueuse en retard est la durée Session moins le retard.

## BR-026 — Participation partielle
`participationDurationMinutes` peut surcharger la durée Session pour refléter le temps réellement effectué.

## BR-027 — ABSENT_JUSTIFIED
Absence justifiée, avec raison facultative.

## BR-028 — ABSENT_UNJUSTIFIED
Absence sans justification reconnue.

## BR-029 — INJURED
Indique une absence/non-participation liée à une blessure. Ne crée jamais automatiquement une `Injury`.

## BR-030 — SICK
Absence liée à une maladie ou indisponibilité ponctuelle.

## BR-031 — EXTERNAL_PROGRAM
Représente une activité sportive extérieure reconnue : Pôle, PPF, sélection, etc.

## BR-032 — EXCUSED
Absence explicitement autorisée par le staff ne correspondant pas aux autres statuts.

## BR-033 — Attendance attendue
Pour une Session terminée, CoachPulse doit pouvoir signaler les participantes sans Attendance renseignée.

## BR-034 — RPE autorisé
Un RPE est attendu pour une participation réelle, typiquement `PRESENT`, `LATE` ou future participation partielle.

## BR-035 — Unicité RPE
`sessionId + playerId` est unique pour RPE.

## BR-036 — Qualité perçue
`perceivedQuality` est notée de 1 à 10.

## BR-037 — Commentaire qualité
Un commentaire facultatif peut expliquer le ressenti.

## BR-038 — Intensité perçue
`perceivedExertion` est notée de 1 à 10 et constitue le RPE utilisé pour la charge.

## BR-039 — Source RPE
Sources : `PLAYER`, `STAFF`, `IMPORT`.

## BR-040 — Priorité au ressenti joueuse
Une réponse `PLAYER` ne doit pas être remplacée silencieusement par une estimation staff.

## BR-041 — Durée de référence
Priorité : `Attendance.participationDurationMinutes`, puis durée réelle Session, puis durée planifiée.

## BR-042 — Calcul de charge
`TrainingLoad = effectiveDurationMinutes × perceivedExertion`.

## BR-043 — Charge dérivée
La charge reste recalculable depuis Session + Attendance + RPE.

## BR-044 — RPE manquant
Sans RPE, la charge est `UNKNOWN`, pas 0.

## BR-045 — Non-participation
Une vraie non-participation donne une durée 0 et une charge 0 ; cela reste distinct d'une charge inconnue.

## BR-046 — Charge hebdomadaire
La charge hebdomadaire somme les charges connues et doit pouvoir afficher la complétude des RPE.

## BR-047 — Charge collective
Les indicateurs collectifs doivent préciser leur méthode : moyenne, médiane, somme, distribution, etc.

## BR-048 — Présence sportive
`PRESENT` et `LATE` comptent comme présence physique.

## BR-049 — Absence justifiée ≠ présence
Les absences justifiées ou reconnues n'augmentent pas artificiellement le taux de présence.

## BR-050 — Taux de présence
Présences physiques / Sessions où la joueuse était attendue × 100.

## BR-051 — Invitée
Une joueuse invitée validée comme participante entre dans les calculs de présence de la Session.

## BR-052 — Sessions futures
Les Sessions futures sont exclues des indicateurs réalisés.

## BR-053 — Session annulée
Une Session `CANCELLED` est exclue des présences, charges et attentes RPE.

## BR-054 — Session terminée
Une Session doit être terminée avant consolidation définitive de ses indicateurs.

## BR-055 — Correction historique
Attendance, RPE et durées peuvent être corrigés selon permissions, avec recalcul des projections.

## BR-056 — Implémentation unique
Les calculs d'assiduité, charge, durée et RPE moyen doivent être centralisés.

---

# 3. Tests techniques et athlétiques

## BR-057 — Moteur unique
Tests techniques et athlétiques utilisent le même moteur.

## BR-058 — TestDefinition
Chaque protocole est décrit par une `TestDefinition`.

## BR-059 — Tests extensibles
Un nouveau protocole doit pouvoir être ajouté sans modifier le moteur central.

## BR-060 — Plusieurs mesures
Un test peut comporter une ou plusieurs mesures.

## BR-061 — MetricDefinition
Chaque mesure définit clé, label, type, unité, obligation et direction de performance.

## BR-062 — Types de valeur
PR06 introduit le type canonique `NUMBER` pour les mesures numériques. Les
types futurs ne seront ajoutés qu'avec leurs règles de validation explicites.

## BR-063 — Unités
Les unités sont normalisées et définies par protocole.

## BR-064 — Direction de performance
`HIGHER_IS_BETTER`, `LOWER_IS_BETTER`, `TARGET_IS_BETTER`, `NEUTRAL`.

## BR-065 — Pied fort / pied faible
Les tests relatifs aux deux pieds utilisent `STRONG_FOOT` et `WEAK_FOOT` plutôt que droit/gauche.

## BR-066 — Interprétation du pied
`preferredFoot` permet de résoudre pied fort et pied faible.

## BR-067 — Contexte historique du pied
Une correction future de `preferredFoot` ne doit pas rendre les anciens résultats ambigus ; le contexte nécessaire doit rester reconstructible.

## BR-068 — TestSession
Chaque campagne de test référence une version de protocole, une Team, une
saison, une catégorie et une date. Ce contexte est figé à la création.

## BR-069 — Une Category par TestSession
Deux catégories testées simultanément produisent deux TestSession distinctes.

## BR-070 — Population TestSession
En PR07, la population est dérivée des affectations de la Team effectives à la
date sportive de la TestSession et du périmètre du rôle actif. Les invitations
ponctuelles restent une extension future et ne permettent jamais l'ajout libre
d'un playerId hors scope.

## BR-071 — Unicité TestResult
`testSessionId + playerId` identifie le résultat d'une joueuse.

## BR-071A — Cycle de saisie PR07
Une TestSession commence `DRAFT`, puis devient `COMPLETED`. Une session
`COMPLETED` n'est plus modifiable avec `tests.write`; une correction future
utilisera une permission dédiée. La finalisation valide chaque TestResult
réellement présent sans imposer un résultat aux joueuses non testées.

## BR-072 — Plusieurs tentatives
Les protocoles peuvent conserver plusieurs tentatives brutes.

## BR-073 — Tentatives comme source
Les tentatives sont la donnée primaire lorsqu'elles existent.

## BR-074 — Agrégation de tentative
Règles possibles : `BEST`, `AVERAGE`, `LAST`, `MEDIAN`.

## BR-075 — Valeur officielle dérivée
La valeur retenue est calculée depuis les tentatives selon le protocole.

## BR-076 — Test simple
Un protocole peut aussi n'avoir qu'une mesure unique.

## BR-077 — Résultat incomplet
Une mesure manquante reste `UNKNOWN` et n'est jamais convertie en 0.

## BR-078 — Zéro valide
0 reste une valeur réelle si le protocole l'autorise.

## BR-079 — Statut TestResult
`COMPLETED`, `PARTIAL`, `NOT_PERFORMED`, `INVALID`.

## BR-080 — NOT_PERFORMED
Aucune valeur artificielle n'est créée.

## BR-081 — INVALID
Les résultats invalides sont exclus des comparaisons normales.

## BR-082 — Correction
Les résultats et tentatives peuvent être corrigés selon permissions, avec recalcul.

## BR-083 — Meilleure performance
Calculée selon playerId, protocole, mesure, période et direction de performance.

## BR-084 — BEST ≠ LATEST
Dernier résultat et meilleure performance sont distincts.

## BR-085 — Évolution
Une évolution compare uniquement des performances compatibles.

## BR-086 — Compatibilité
Même protocole/version, même mesure et même unité sont requis pour une comparaison directe.

## BR-087 — Versionnement protocole
Une modification majeure du protocole crée une nouvelle version.

`TestDefinition.version` est un entier positif. TestSession, TestResult et
TestBenchmark conservent la version de protocole utilisée.

## BR-088 — Modification mineure
Un changement purement visuel peut conserver la version.

## BR-089 — Modification majeure
Distance, matériel, barème, départ, nombre d'essais ou règles de performance peuvent imposer une nouvelle version.

## BR-090 — Désactivation
Un protocole obsolète devient inactif, pas supprimé.

## BR-091 — Historique protégé
Une TestDefinition utilisée historiquement n'est pas supprimée physiquement dans le fonctionnement normal.

## BR-092 — Ajout de nouveaux tests
Conduite, passe, frappe, agilité, etc. utilisent de nouvelles TestDefinition, pas de nouveaux modules.

## BR-093 — Conduite
Un test de conduite peut par exemple mesurer temps et erreurs.

## BR-094 — Passe
Un test de passe peut mesurer tentatives et réussites.

## BR-095 — Métriques dérivées
Les ratios et pourcentages sont dérivés des mesures brutes.

## BR-096 — Tests athlétiques
Sprint, VMA, Cooper, Yo-Yo, détente, agilité, endurance, etc. utilisent la même architecture.

## BR-097 — Formules dérivées
Toute formule athlétique doit être documentée et versionnée.

## BR-098 — Donnée brute prioritaire
La donnée mesurée n'est jamais remplacée par l'indicateur calculé.

## BR-099 — Agrégation collective
Moyenne, médiane, min, max, distribution peuvent être calculés sur résultats valides.

## BR-100 — Complétude
Toute comparaison collective doit pouvoir indiquer le nombre de résultats valides.

## BR-101 — Résultats manquants
`UNKNOWN`, `NOT_PERFORMED`, `INVALID` sont exclus des moyennes.

## BR-102 — Comparaison entre joueuses
Elle requiert protocole, mesure et unité compatibles.

## BR-103 — Fiche joueuse dynamique
Aucun test n'est codé en dur dans la fiche joueuse.

## BR-104 — Analyse équipe dynamique
Même principe pour l'analyse équipe.

## BR-105 — Graphiques passifs
Les graphiques ne décident jamais du sens de performance ou de la compatibilité.

## BR-106 — Radar
Toute normalisation multi-métriques doit être définie en amont du graphique.

## BR-107 — Historique
Les résultats historiques ne sont jamais supprimés par les changements futurs d'équipe, catégorie ou protocole.

## BR-108 — Source de vérité Tests
`TestDefinition → TestSession → TestResult → mesures/tentatives brutes`.

---

# 4. Match

## BR-109 — Un Match appartient à une Team
Chaque Match est relié directement à `seasonId` et `teamId`, et non à une Category comme source principale.

## BR-110 — Plusieurs équipes = plusieurs Match
Deux Teams différentes disputant le même jour créent deux Match distincts.

## BR-111 — Durée configurable
Le Match définit son nombre de périodes et leur durée.

## BR-112 — Statuts Match
`PLANNED`, `READY`, `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `CANCELLED`, `ARCHIVED`.

## BR-113 — Match annulé
Un Match annulé n'entre pas dans les statistiques réalisées.

## BR-114 — Participants figés
Les joueuses sélectionnées sont enregistrées via `MatchParticipant`.

## BR-115 — Joueuse d'une autre équipe
Une joueuse peut participer sans modification automatique de son PRIMARY.

## BR-116 — Unicité participant
`matchId + playerId` est unique pour MatchParticipant.

## BR-117 — PlayerProfile ≠ MatchRole
Le profil général ne fixe pas le rôle occupé pendant le Match.

## BR-118 — Rôles Foot à 8
Catalogue initial : GB, DG, DCG, DC, DCD, DD, MG, MCG, MC, MCD, MD, AG, ACG, AC, ACD, AD.

## BR-119 — Dispositifs Foot à 8
3-3-1 : DG, DC, DD, MG, MC, MD, AC.  
3-2-2 : DG, DC, DD, MCG, MCD, ACG, ACD.  
2-4-1 : DCG, DCD, MG, MCG, MCD, MD, AC.  
3-1-3 : DG, DC, DD, MC, AG, AC, AD.  
2-3-2 : DCG, DCD, MG, MC, MD, ACG, ACD.  
2-2-3 : DCG, DCD, MCG, MCD, AG, AC, AD.  
GB s'ajoute à chacun.

## BR-120 — Rôles Foot à 11
Catalogue initial : GB, LG, DCG, DC, DCD, LD, MG, MCG, MC, MCD, MD, AG, ACG, AC, ACD, BU.

## BR-121 — Dispositifs Foot à 11
Bibliothèque initiale : 4-4-2, 4-2-3-1, 4-3-1-2, 3-5-2, 3-4-2-1.

## BR-122 — Rôles extensibles
Un nouveau rôle s'ajoute via `MatchRoleDefinition`.

## BR-123 — Dispositifs extensibles
Un nouveau système s'ajoute via `FormationDefinition` et `FormationSlot`.

## BR-124 — Composition initiale
Toute joueuse titulaire possède un MatchPlayerPeriod commençant à 0.

## BR-125 — Une période active par joueuse
Une joueuse ne peut avoir deux rôles actifs simultanément.

## BR-126 — Un slot, une joueuse
Deux joueuses ne peuvent occuper le même slot au même instant.

## BR-127 — Remplacement
Sortie et entrée ferment/ouvrent des MatchPlayerPeriod au même `gameSecond`.

## BR-128 — Drag & Drop
Le drag & drop déclenche des commandes métier, jamais une simple modification visuelle locale.

## BR-129 — Changement de rôle
Fermer l'ancienne période puis ouvrir la nouvelle.

## BR-130 — Échange de rôles
Fermer les deux périodes puis créer les deux nouvelles au même instant.

## BR-131 — Temps de jeu
Somme des durées de MatchPlayerPeriod.

## BR-132 — Temps par rôle
Même calcul, groupé par matchRoleId.

## BR-133 — Joueuse sans action
0 MatchEvent peut coexister avec du temps de jeu positif.

## BR-134 — Fin Match
Toutes les périodes actives sont fermées au temps final.

## BR-135 — gameSecond
Temps sportif de référence pour les événements.

## BR-136 — Pause
Le gameSecond n'avance pas pendant une pause.

## BR-137 — periodNumber
Chaque événement indique sa période.

## BR-138 — Reprise
Le chronomètre reprend au temps sportif précédent.

## BR-139 — MatchEvent
Chaque action statistique brute devient un MatchEvent unique.

## BR-140 — Moteur unique
CoachPulse et adversaire utilisent les mêmes eventType avec `teamSide`.

## BR-141 — Pas de types adverses dupliqués
Pas de `OPPONENT_GOAL`, etc.

## BR-142 — Événements initiaux
GOAL, SHOT_ON_TARGET, SHOT_OFF_TARGET, CROSS, PROGRESSION, RECOVERY, DUEL_WON, DUEL_LOST, DUEL_NEUTRAL, DANGER_ZONE_ENTRY, SAVE.

## BR-143 — Événements extensibles
Un nouvel eventType passe par MatchEventDefinition et des règles documentées.

## BR-144 — GOAL et score
GOAL augmente automatiquement le score de son teamSide.

## BR-145 — GOAL = tir cadré
Tout GOAL contribue automatiquement aux tirs cadrés.

## BR-146 — Un seul événement brut pour un but
Pas de GOAL + SHOT_ON_TARGET séparés.

## BR-147 — Buteuse
Pour un GOAL CoachPulse, playerId est la buteuse.

## BR-148 — Passe décisive
La passe décisive est une propriété optionnelle du GOAL.

## BR-149 — Passeuse cohérente
La passeuse doit normalement être une participante active au moment du but.

## BR-150 — Assist dérivée
Le nombre de passes décisives provient de `GOAL.metadata.assistPlayerId`.

## BR-151 — Score dérivé
Le score provient uniquement des GOAL actifs.

## BR-152 — Suppression d'un GOAL
Supprimer logiquement un GOAL met automatiquement à jour score, tirs cadrés, buteuse et passeuse.

## BR-153 — Résultat
WIN/DRAW/LOSS dérivé du score final.

## BR-154 — Coordonnées
Les événements spatialisés stockent x/y normalisés dans [0,1].

## BR-155 — Référentiel spatial
But CoachPulse à gauche, attaque CoachPulse vers la droite.

## BR-156 — Changement physique de côté
L'UI transforme les coordonnées avant stockage pour maintenir le référentiel unique.

## BR-157 — PitchZone dérivée
La zone est calculée depuis les coordonnées et la grille.

## BR-158 — Grille modifiable
Les coordonnées historiques restent stables même si la grille change.

## BR-159 — Heatmap
Les heatmaps utilisent MatchEvent.coordinates.

## BR-160 — Même moteur Heatmap
Individuel et collectif utilisent le même moteur avec des filtres différents.

## BR-161 — Compteur = tooltip
Le compteur et le tooltip utilisent exactement le même tableau filtré.

## BR-162 — DANGER_ZONE_ENTRY
Remplace la notion spécifique d'entrée dans les 20 m.

## BR-163 — DangerZone adaptable
La définition dépend du format de jeu.

## BR-164 — Possession
État : `COACHPULSE`, `OPPONENT`, `UNKNOWN`.

## BR-165 — Possession initiale
Le coup d'envoi initialise l'état de possession.

## BR-166 — Pas de pourcentage manuel
Le pourcentage est dérivé des durées.

## BR-167 — possessionEffect
Chaque MatchEventDefinition peut modifier la possession.

## BR-168 — RECOVERY
Une récupération attribue la possession à l'équipe qui récupère.

## BR-169 — DUEL_WON
Attribue la possession à l'équipe gagnante.

## BR-170 — DUEL_LOST
Attribue la possession à l'équipe adverse.

## BR-171 — DUEL_NEUTRAL
Ne change pas automatiquement la possession.

## BR-172 — GOAL change immédiatement la possession
Après un GOAL, la possession passe immédiatement à l'équipe qui a encaissé. Aucun clic KICKOFF supplémentaire n'est requis.

## BR-173 — Sortie de balle
Une sortie de balle doit permettre d'indiquer l'équipe bénéficiant de la reprise lorsqu'elle provoque un changement.

## BR-174 — Sortie sans changement
Si la même équipe conserve la remise en jeu, la possession ne change pas.

## BR-175 — Changement redondant
Un événement donnant la possession à l'équipe qui l'a déjà ne crée pas de faux segment.

## BR-176 — PossessionSegment
Les segments sont dérivés de gameSecond et des événements qui changent la possession.

## BR-177 — Pourcentage possession
Temps de possession équipe / temps de possession connue × 100.

## BR-178 — UNKNOWN
Le temps UNKNOWN n'est jamais attribué arbitrairement.

## BR-179 — SAVE
Un SAVE CoachPulse est attribué à la gardienne active et implique automatiquement un tir cadré adverse.

## BR-180 — Un seul événement brut pour SAVE
L'utilisateur ne crée pas séparément SHOT_ON_TARGET OPPONENT + SAVE.

## BR-181 — Tirs cadrés adverses
Les tirs cadrés adverses sont dérivés de leurs événements pertinents, dont GOAL OPPONENT et SAVE CoachPulse, sans double comptage.

## BR-182 — Gardienne active
Un SAVE doit correspondre à une gardienne active au gameSecond concerné.

## BR-183 — But encaissé
Un but encaissé est attribué à la gardienne active via MatchPlayerPeriod, pas saisi séparément.

## BR-184 — Clean sheet
Le clean sheet est dérivé ; sa règle multi-gardiennes reste à préciser.

## BR-185 — Statistiques individuelles
Elles utilisent MatchEvent + MatchPlayerPeriod.

## BR-186 — Statistiques collectives
Même moteur avec teamSide = COACHPULSE.

## BR-187 — Statistiques adverses
Même moteur avec teamSide = OPPONENT.

## BR-188 — Données Match dérivées
Score, V/N/D, tirs, buts, passes, heatmaps, possession, temps de jeu, etc. sont dérivés.

## BR-189 — Correction événement
Une personne autorisée peut corriger playerId, type, coordonnées, temps et métadonnées.

## BR-190 — matchEventId stable
Une correction conserve l'identifiant de l'événement.

## BR-191 — Suppression logique
Les événements annulés peuvent utiliser `deletedAt`.

## BR-192 — Recalcul
Toute correction impactant une projection déclenche son invalidation/recalcul.

## BR-193 — Possession recalculée
Modifier/supprimer un événement de possession reconstruit les segments, sans correction manuelle en cascade.

## BR-194 — Finalisation
À la fin : fermer périodes, valider temps final, recalculer stats/possession, puis COMPLETED.

## BR-195 — Correction post-match
Un Match terminé peut être corrigé selon permissions.

## BR-196 — MatchSummary
Un MatchSummary peut exister comme projection/cache.

## BR-197 — Reconstruction obligatoire
MatchSummary doit être entièrement reconstruisible depuis Match, MatchEvent et MatchPlayerPeriod.

## BR-198 — Validation d'événement
Les exigences d'un eventType sont contrôlées par MatchEventDefinition.

## BR-199 — Adversaire sans playerId
Les actions adverses peuvent ne pas avoir de joueur identifié.

## BR-200 — Participant CoachPulse
Un événement individuel CoachPulse exige normalement une joueuse MatchParticipant, et parfois active au moment de l'action.

## BR-201 — Chaîne métier Match
Interaction UI → commande métier → validation → données brutes → services de calcul → projections → UI.

## BR-202 — Une action terrain = une saisie brute principale
Une action telle que GOAL ou SAVE peut produire plusieurs statistiques dérivées sans duplication de saisie.

## BR-203 — Ballons touchés/bonifiés
Statut `TO_REVIEW`.

## BR-204 — xG
Statut `TO_REVIEW` tant qu'un vrai modèle n'est pas défini.

---

# 5. Blessures et suivi médical

## BR-205 — Injury appartient au Player
Toute blessure est liée à playerId.

## BR-206 — Un épisode
Une Injury représente un épisode physique unique dans le temps.

## BR-207 — Attendance INJURED distinct
Une absence pour blessure ne crée pas automatiquement une Injury.

## BR-208 — Création explicite
Une Injury est créée volontairement par un utilisateur autorisé.

## BR-209 — Zone corporelle
Une Injury identifie une bodyArea structurée.

## BR-210 — Côté
LEFT, RIGHT, BILATERAL, CENTER, NOT_APPLICABLE selon le cas.

## BR-211 — Visualisation corporelle
Le corps humain sert à sélectionner/afficher une zone, pas à diagnostiquer.

## BR-212 — Historique corporel
L'historique peut être filtré par playerId + bodyArea + side.

## BR-213 — Douleur
painLevel sur 1 à 10, comme ressenti déclaré.

## BR-214 — Évolution
Les variations de douleur et disponibilité passent par InjuryUpdate.

## BR-215 — InjuryUpdate historique
Une mise à jour ne remplace pas les précédentes.

## BR-216 — Disponibilité
FULL_AVAILABLE, LIMITED, NO_TRAINING, NO_MATCH, UNAVAILABLE, RETURN_TO_PLAY.

## BR-217 — LIMITED
Participation possible avec restrictions.

## BR-218 — NO_TRAINING
Pas de participation normale aux séances.

## BR-219 — NO_MATCH
Entraînement possible mais match non autorisé.

## BR-220 — UNAVAILABLE
Indisponible pour l'activité sportive normale.

## BR-221 — RETURN_TO_PLAY
Phase intermédiaire de reprise.

## BR-222 — Cycle Injury
OPEN → MONITORING → RECOVERING → CLOSED.

## BR-223 — Fermeture
Fermer conserve tout l'historique.

## BR-224 — endDate
Renseignée quand connue.

## BR-225 — expectedReturnDate
Date estimée, modifiable et non certaine.

## BR-226 — Retour estimé ≠ validé
L'UI doit distinguer estimation et validation réelle.

## BR-227 — Restrictions sportives
Exemples structurés : NO_CONTACT, NO_RUNNING, NO_SPRINT, NO_CHANGE_OF_DIRECTION, NO_MATCH, LIMITED_DURATION, INDIVIDUAL_PROGRAM.

## BR-228 — Restriction + note
Une restriction structurée peut être complétée par une note.

## BR-229 — Sportif vs médical
Le staff ne reçoit que l'information nécessaire à l'encadrement sportif.

## BR-230 — MedicalRecord
Contient consultations, suivi kiné, visites, restrictions ou retour au jeu.

## BR-231 — MedicalRecord avec ou sans Injury
injuryId est optionnel.

## BR-232 — Types MedicalRecord
CONSULTATION, PHYSIO, MEDICAL_VISIT, FOLLOW_UP, RESTRICTION, RETURN_TO_PLAY, OTHER.

## BR-233 — ProviderType
DOCTOR, PHYSIOTHERAPIST, OSTEOPATH, CLUB_MEDICAL_STAFF, OTHER.

## BR-234 — Rendez-vous séparé
La logistique de rendez-vous est séparée du contenu médical.

## BR-235 — CareAppointment
TO_SCHEDULE, SCHEDULED, COMPLETED, CANCELLED.

## BR-236 — Dates rendez-vous
Date prévue et date réelle peuvent être conservées.

## BR-237 — Rendez-vous ≠ compte rendu
Un rendez-vous terminé ne crée pas automatiquement un MedicalRecord vide.

## BR-238 — Confidentialité
Niveaux proposés : SPORT, RESTRICTED, MEDICAL.

## BR-239 — SPORT
Informations nécessaires au staff sportif.

## BR-240 — RESTRICTED
Accès limité à certains utilisateurs.

## BR-241 — MEDICAL
Accès médical explicite requis.

## BR-242 — Rôle ≠ autorisation médicale
Un coach n'obtient pas automatiquement toutes les données médicales.

## BR-243 — Permissions séparées
Au minimum injuries.read/write et medical.read/write.

## BR-244 — Sécurité multi-couche
UI + services + repositories + Firestore Security Rules.

## BR-245 — Minimisation
Ne collecter que les données nécessaires.

## BR-246 — Notes sensibles
Les champs libres médicaux restent protégés.

## BR-247 — Aucun diagnostic automatique
CoachPulse ne transforme jamais zone/douleur/durée en diagnostic.

## BR-248 — Aucun traitement inventé
Les règles métier ne prescrivent pas de soin.

## BR-249 — Injury et Session
Une disponibilité sportive peut être affichée à la préparation d'une Session selon permissions.

## BR-250 — Injury et Match
Même principe pour Match.

## BR-251 — Pas de blocage silencieux
Une restriction empêchant une sélection doit être expliquée.

## BR-252 — Override
Toute éventuelle dérogation future devra être explicite, autorisée et tracée.

## BR-253 — Indicateurs indisponibilité
Nombre de blessures, jours indisponibles, séances manquées, etc. sont dérivés.

## BR-254 — Durée Injury
endDate - startDate pour une Injury fermée ; durée courante pour une Injury ouverte.

## BR-255 — Séances manquées
Une séance est manquée pour blessure si Attendance.status = INJURED.

## BR-256 — Matchs manqués
La règle exacte reste à préciser avant KPI officiel.

## BR-257 — Historique médical
Les changements d'équipe/catégorie/saison ne modifient pas les anciens épisodes.

## BR-258 — Correction
Une correction médicale autorisée doit rester traçable.

## BR-259 — Suppression
La suppression physique n'est pas le comportement métier ordinaire.

## BR-260 — Fiche joueuse
Les Injury visibles dépendent des permissions.

## BR-261 — MedicalRecord dans la fiche
Chargé/affiché uniquement si les droits le permettent.

## BR-262 — Dashboard médical
Par défaut, uniquement des informations sportives minimales.

## BR-263 — Source de vérité médicale
Player → Injury → InjuryUpdate / CareAppointment / MedicalRecord.

---

# 6. Fiche joueuse, fiche équipe et analyse équipe

## BR-264 — Fiche joueuse = agrégation
Aucune base métier parallèle.

## BR-265 — Contexte saison
La consultation principale utilise playerId + seasonId.

## BR-266 — Multi-saison explicite
Une vue multi-saison doit afficher clairement sa portée.

## BR-267 — Identité
Les données permanentes proviennent de Player.

## BR-268 — Sous-catégorie affichée
Calculée depuis birthDate + Season.

## BR-269 — Équipe principale affichée
Déterminée depuis PlayerTeamAssignment PRIMARY valide à la date consultée.

## BR-270 — Affectations secondaires
SECONDARY et TEMPORARY peuvent être affichées séparément.

## BR-271 — Présences
Les statistiques viennent d'Attendance + Session.

## BR-272 — Même formule partout
Fiche, Dashboard, analyse et exports utilisent les mêmes services.

## BR-273 — Complétude
Une agrégation doit pouvoir indiquer ses données manquantes.

## BR-274 — Charge joueuse
Provient de Session + Attendance + RPE.

## BR-275 — UNKNOWN conservé
Les charges inconnues ne deviennent pas 0.

## BR-276 — Agrégation temporelle
Jour, semaine, mois, période, saison.

## BR-277 — Tests dynamiques
Aucun protocole n'est codé en dur dans la fiche.

## BR-278 — Résumé test
Dernier, meilleur, historique, évolution selon règles Tests.

## BR-279 — Protocoles incompatibles
Ne pas fusionner sans indication claire.

## BR-280 — MatchParticipant
Une joueuse est participante à un Match si elle possède MatchParticipant.

## BR-281 — Temps de jeu
Vient uniquement de MatchPlayerPeriod.

## BR-282 — Titularisation
Une joueuse est titulaire si elle a une période active à gameSecond 0.

## BR-283 — Temps par rôle
Agrégation des MatchPlayerPeriod par matchRoleId.

## BR-284 — Stats Match joueuse
Calculées depuis MatchEvent et effets statistiques.

## BR-285 — GOAL joueuse
+1 but et +1 tir cadré dérivé.

## BR-286 — Assist
Dérivée de GOAL.metadata.assistPlayerId.

## BR-287 — Gardienne
Arrêts, tirs cadrés adverses subis, buts encaissés, temps et clean sheets sont dérivés.

## BR-288 — Heatmap joueuse
Même moteur spatial que l'équipe.

## BR-289 — Filtres Heatmap
playerId, eventType, matchId, seasonId, dateRange.

## BR-290 — Injury dans fiche
Affichage selon permissions.

## BR-291 — MedicalRecord séparé
Pas de chargement automatique sans droit.

## BR-292 — Synthèse = insight
Une synthèse est une interprétation, pas une donnée brute.

## BR-293 — DATA vs INSIGHT
Toujours distinguer mesure et interprétation.

## BR-294 — Insight traçable
Un insight important doit pouvoir être expliqué depuis ses sources.

## BR-295 — TeamProfile
Vue synthétique d'une Team dans un contexte temporel.

## BR-296 — Identité Team
Provient de Team.

## BR-297 — Effectif
Dérivé de PlayerTeamAssignment valide à la date.

## BR-298 — Déduplication effectif
Déduplication par playerId.

## BR-299 — Types d'affectation
PRIMARY, SECONDARY, TEMPORARY restent distinguables.

## BR-300 — Matchs d'une Team
Récupérés via Match.teamId.

## BR-301 — Matchs terminés
Les bilans utilisent normalement les Match COMPLETED.

## BR-302 — V/N/D
Dérivé du score de chaque Match.

## BR-303 — Taux de victoire
wins / completedMatches × 100 ; UNKNOWN si aucun Match terminé.

## BR-304 — Résultats récents
Triés par Match.date.

## BR-305 — TeamAnalysis = agrégation
Aucune source statistique indépendante.

## BR-306 — Contexte TeamAnalysis
Au minimum teamId + seasonId, éventuellement dateRange.

## BR-307 — Portée explicite
Toute analyse multi-équipe ou multi-saison doit l'afficher.

## BR-308 — Présence équipe historique
Ne jamais appliquer l'effectif actuel rétroactivement à toute la saison.

## BR-309 — SessionParticipant historique
Peut servir de population réelle figée.

## BR-310 — Taux collectif explicite
Distinguer moyenne des taux individuels et présences totales / attendues totales.

## BR-311 — Charge équipe explicite
Toujours préciser moyenne, médiane, somme, etc.

## BR-312 — Complétude RPE
Indiquer le nombre de réponses utilisées.

## BR-313 — Tests équipe
Agrégation uniquement sur résultats valides et compatibles.

## BR-314 — Population test explicite
Toujours indiquer la complétude.

## BR-315 — Comparaison temporelle Tests
Population commune et population complète doivent être distinguables.

## BR-316 — Statistiques Match équipe
Réutilisent exactement le même moteur que le bilan Match.

## BR-317 — Volumes saisonniers
Sommes des événements sources.

## BR-318 — Ratios
Toujours recalculés depuis les volumes, jamais additionnés.

## BR-319 — Possession multi-matchs
Préférer total secondes CoachPulse / total secondes connues.

## BR-320 — Heatmap multi-matchs
Agrégation des coordonnées normalisées.

## BR-321 — Référentiel Heatmap
Toutes les coordonnées sont comparables grâce à l'attaque normalisée vers la droite.

## BR-322 — Classements
Podiums et leaders sont dérivés.

## BR-323 — Égalités
Afficher les égalités ou utiliser une règle explicite.

---

# 7. Historique, données dérivées, cache et architecture

## BR-324 — Pas d'écrasement historique
Les changements actuels ne doivent pas rendre l'historique incohérent.

## BR-325 — Contexte historique
Les informations nécessaires doivent rester figées ou reconstructibles.

## BR-326 — Dates métier
Utiliser Match.date, Session.startDateTime, TestSession.date, Injury.startDate, etc., pas createdAt comme date sportive.

## BR-327 — Donnée dérivée
Score, taux, charge, moyenne, temps de jeu, possession, heatmap, etc. sont recalculables.

## BR-328 — Pas d'édition directe d'une donnée dérivée
Corriger la source, pas le résultat agrégé.

## BR-329 — Projection/cache autorisé
Une donnée dérivée peut être matérialisée pour les performances.

## BR-330 — Projection reconstruisible
Toute projection doit être recalculable depuis les sources.

## BR-331 — Invalidation
Une modification source invalide ou recalcule les projections dépendantes.

## BR-332 — Version de calcul
Une projection complexe peut stocker `calculationVersion` ou `sourceVersion`.

## BR-333 — Changement de formule
Les projections calculées avec une ancienne formule doivent rester identifiables.

## BR-334 — UNKNOWN ≠ 0
Règle générale dans toute l'application.

## BR-335 — Moyennes
UNKNOWN n'est jamais remplacé par 0 avant calcul.

## BR-336 — UI UNKNOWN
Afficher clairement « — », « Non renseigné », « Donnée insuffisante », etc.

## BR-337 — Historique privilégié
INACTIVE, ARCHIVED, CLOSED, CANCELLED sont préférés à la suppression physique.

## BR-338 — Suppression physique exceptionnelle
Réservée aux cas explicitement autorisés.

## BR-339 — Identifiants stables
Les IDs ne changent pas quand les libellés changent.

## BR-340 — Nom ≠ ID
Renommer une entité ne crée pas automatiquement une nouvelle entité métier.

## BR-341 — Pas d'escalade par agrégation
Une vue agrégée ne peut révéler une donnée interdite en lecture directe.

## BR-342 — Médical
Une agrégation respecte toutes les permissions médicales.

## BR-343 — Services domaine
Chaque domaine possède ses services métier spécialisés.

## BR-344 — Services d'agrégation
playerProfileService, teamAnalysisService, dashboardService composent les services domaine.

## BR-345 — Dépendances orientées
Les services domaine ne dépendent jamais des services d'agrégation.

## BR-346 — Dashboard léger
Le Dashboard ne charge que les données nécessaires à ses widgets.

## BR-347 — Accès équipe Dashboard
Il ne charge que les teamId accessibles à l'utilisateur.

## BR-348 — Saison Dashboard
Par défaut, utiliser la saison active.

## BR-349 — Exports
Les exports utilisent les mêmes services métier que l'application.

## BR-350 — Cohérence écran/export
Même filtres + même version de calcul = mêmes valeurs métier.

## BR-351 — Une donnée = une source de vérité
Aucune fonctionnalité ne crée volontairement une seconde vérité.

## BR-352 — Une règle = une implémentation
Toute règle métier possède une implémentation canonique.

## BR-353 — UI sans logique métier
Les composants React reçoivent des données préparées.

## BR-354 — Graphiques passifs
Radar, Heatmap, TrendChart, DonutChart, BarChart n'implémentent aucune règle sportive.

## BR-355 — Historique avant commodité
La cohérence historique prime sur les raccourcis techniques.

## BR-356 — Reproductibilité
Un indicateur important doit pouvoir être expliqué par données sources + règle métier + version de calcul.

---

# 8. Règles encore ouvertes

Les points suivants restent volontairement à arbitrer :

- définition exacte du clean sheet lorsqu'un Match utilise plusieurs gardiennes ;
- UX et nomenclature détaillées des sorties de balle dans le moteur de possession ;
- ballons touchés / ballons bonifiés ;
- modèle xG éventuel ;
- définition exacte d'un « match manqué » pour blessure ;
- méthode officielle de normalisation des RadarChart multi-tests ;
- éventuelles dérogations à une restriction médicale ;
- granularité finale des permissions médicales.

---

# 9. Principe architectural final

CoachPulse V2 suit toujours la chaîne :

```text
DONNÉES SOURCES
↓
RÈGLES MÉTIER CANONIQUES
↓
SERVICES
↓
AGRÉGATIONS / PROJECTIONS / CACHE
↓
UI / GRAPHIQUES / EXPORTS
```

Jamais :

```text
UI
↓
calcul local
↓
nouvelle vérité métier
```

---

# 10. Statut V1.0

Cette version consolide les règles validées pour :

- saisons, sous-catégories, catégories et affectations ;
- Sessions, Attendance, RPE et charge ;
- tests techniques et athlétiques extensibles ;
- Match, rôles, dispositifs, chronomètre, événements, score, spatialisation, heatmaps et possession ;
- `GOAL → changement immédiat de possession` ;
- `SAVE → tir cadré adverse` ;
- `Match → Team` ;
- blessures et suivi médical ;
- fiche joueuse ;
- fiche équipe ;
- analyse équipe ;
- historique ;
- données dérivées ;
- cache et projections ;
- cohérence des exports et des agrégations.

Ce document constitue la référence métier V1.0 de CoachPulse V2.


---

# Addendum de cohérence V1.1

## BR-357 — Données durables Player
`Player` peut contenir `nationality`, `clubArrivalDate` et `previousClub`. Ces informations ne dépendent pas de la Team courante.

## BR-358 — Team de développement
Une Team `DEVELOPMENT` peut être rattachée à une Season et une Category.

## BR-359 — Équipe première
Une Team `FIRST_TEAM` n'est automatiquement rattachée ni à une Season ni à une Category. `seasonId` et `categoryId` y sont optionnels et son contexte est défini manuellement.

## BR-360 — Saison clôturée
Une `Season.status = CLOSED` est en lecture seule par défaut.

## BR-361 — Correction historique
Toute correction de données sportives rattachées à une saison clôturée nécessite une permission explicite et un audit lorsque l'opération est sensible.

## BR-362 — TestBenchmark
Les objectifs/références de tests sont représentés par `TestBenchmark`, relié au minimum à `testDefinitionId`, `metricKey` et `subCategoryId`.

## BR-363 — Benchmark ≠ résultat
Un TestBenchmark ne modifie jamais le TestResult brut.

## BR-364 — Objectif par sous-catégorie
Une joueuse peut être comparée aux benchmarks correspondant à sa sous-catégorie et au contexte temporel pertinent.

## BR-365 — Comparaison inter-générations
Deux générations peuvent être comparées à sous-catégorie équivalente, avec population et période explicites.

## BR-366 — Comparaison longitudinale
La même joueuse peut être comparée entre plusieurs saisons lorsque les données sont compatibles.

## BR-367 — Comparaison inter-joueuses
Plusieurs joueuses peuvent être comparées sur une même saison.

## BR-368 — Compatibilité obligatoire
Toute comparaison Tests exige une version/protocole compatible, la même métrique, la même unité et la même règle d'interprétation.

## BR-369 — PlayerProfile canonique
Le catalogue canonique est :

```text
GOALKEEPER
DEFENDER
MIDFIELDER
FORWARD
```

`ATTACKER` ne doit pas être utilisé comme enum concurrent.

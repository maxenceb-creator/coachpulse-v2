# COHERENCE_AUDIT_V1_0.md

## CoachPulse V2 — Audit croisé de la fondation

**Date :** 11 août 2026  
**Résultat :** incohérences certaines identifiées et corrigées dans des versions V1.1.

## Documents contrôlés
- DATA_MODEL.md
- BUSINESS_RULES.md
- PERMISSIONS_MODEL.md
- FIRESTORE_STRUCTURE.md
- ARCHITECTURE_DECISIONS.md
- MIGRATION_PLAN_V1_TO_V2.md
- COACHPULSE_V2_SPEC.md
- AGENTS.md
- MODULES_V1_A_CONSERVER.md

## Corrections appliquées

1. **Player**
   - ajout `nationality?`
   - ajout `clubArrivalDate?`
   - ajout `previousClub?`
   - harmonisation de la référence photo vers `photoPath?`

2. **PlayerProfile**
   - suppression de la divergence `ATTACKER`
   - enum canonique : `GOALKEEPER | DEFENDER | MIDFIELDER | FORWARD`

3. **Match**
   - `DATA_MODEL.md` contenait encore `categoryId`
   - correction : `Match.teamId`
   - règle : `1 Match = 1 Team`

4. **Medical**
   - ajout `accessTeamIds[]` dans le modèle MedicalRecord
   - ajout du même contexte d'accès aux CareAppointment

5. **Équipe première**
   - ajout concept `teamType`
   - `FIRST_TEAM` : `seasonId?` et `categoryId?`
   - aucun rattachement automatique à Season/Category

6. **Saison clôturée**
   - ajout `Season.status`
   - valeurs initiales : `PLANNED | ACTIVE | CLOSED`
   - `CLOSED` = read-only par défaut
   - permission : `history.correctClosedSeason`
   - audit des corrections sensibles

7. **Tests / objectifs**
   - ajout de `TestBenchmark`
   - benchmark relié à protocole + métrique + sous-catégorie
   - niveaux configurables
   - benchmark distinct des résultats

8. **Comparaisons Tests**
   - inter-générations
   - même joueuse entre saisons
   - plusieurs joueuses même saison
   - compatibilité protocole/version/métrique/unité obligatoire

## Points volontairement laissés ouverts
- xG
- ballons touchés / bonifiés
- clean sheet multi-gardiennes
- UX exacte des sorties de balle / possession
- projections futures éventuelles

## Conclusion
Après ces corrections, les décisions structurantes actuellement validées sont cohérentes entre modèle, règles métier, permissions, Firestore, architecture, migration et instructions Codex.

# Cycle de vie session et cache client

## Stratégie PR05

Firebase Auth conserve la session selon sa persistance navigateur standard. Au
retour sur l'application, le client reconstruit ensuite le profil Firestore,
les rôles, les TeamAccess et les sélections autorisées. Le `securityContext`
Firestore confirmé est restauré en priorité s'il reste autorisé.

TanStack Query n'est pas persisté sur disque. Les données privées utilisent des
clés incluant tous les contextes qui influencent leur résultat : `uid`, rôle,
Team et saison. Les Security Rules exigent un User actif pour toutes les
familles actuelles, y compris la saison : le logout supprime donc la totalité
du cache TanStack Query. Aucune donnée étrangère à CoachPulse n'est touchée.

Le changement de rôle supprime uniquement les queries de l'ancien rôle. Le
changement de Team supprime uniquement les queries protégées de l'ancienne
Team. Une query protégée reste désactivée jusqu'à ce que l'écriture du nouveau
`securityContext` soit confirmée par Firestore.

`CACHE_SCHEMA_VERSION = "1"` protège les données locales futures. Au premier
chargement d'une nouvelle version incompatible, les queries privées et les
anciennes clés de sélection CoachPulse sont supprimées une fois. Aucun autre
contenu du navigateur n'est effacé.

## Validation manuelle Firebase DEV

1. Se connecter normalement et vérifier que le Dashboard affiche le bon rôle,
   la bonne Team, la saison et le compteur de joueuses.
2. Faire Cmd+R/F5 et vérifier que le même contexte revient sans navigation
   privée.
3. Passer de U13F à U14F et vérifier que le compteur correspond à U14F sans
   afficher la valeur U13F.
4. Revenir à U13F et vérifier que le compteur est recalculé correctement.
5. Changer de rôle et vérifier que Teams et joueuses sont recalculées selon les
   permissions du nouveau rôle.
6. Se déconnecter puis se connecter avec un autre compte et vérifier qu'aucune
   identité, Team ou valeur du premier compte n'apparaît.
7. Fermer le navigateur, rouvrir localhost et vérifier la reconstruction
   Auth → User → rôle/Team → securityContext → Dashboard.
8. Dans DevTools, définir `coachpulse:cache-schema-version` à `legacy`, recharger
   une fois, puis vérifier que sa valeur devient `1` et que l'application se
   reconstruit normalement.

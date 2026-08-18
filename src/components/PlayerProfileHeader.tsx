import type { Category, Player, SubCategory, Team } from '../types/domain'

const profileLabels: Record<Player['playerProfile'], string> = {
  GOALKEEPER: 'Gardienne',
  DEFENDER: 'Défenseure',
  MIDFIELDER: 'Milieu',
  FORWARD: 'Attaquante',
}

export function PlayerProfileHeader({
  player,
  team,
  category,
  subCategory,
}: {
  player: Player
  team?: Team
  category?: Category | null
  subCategory?: SubCategory
}) {
  return (
    <section className="card player-profile-header">
      {player.photoPath ? (
        <img
          className="player-profile-photo"
          src={player.photoPath}
          alt={`${player.firstName} ${player.lastName}`}
        />
      ) : (
        <div className="player-profile-photo placeholder" aria-hidden="true">
          {player.firstName[0]}
          {player.lastName[0]}
        </div>
      )}
      <div>
        <p className="eyebrow">FICHE JOUEUSE</p>
        <h1>
          {player.firstName} {player.lastName}
        </h1>
        <p>
          {team?.name ?? 'Équipe'} · {category?.name ?? 'Catégorie non définie'}
          {subCategory ? ` · ${subCategory.name}` : ''}
        </p>
        <dl className="player-overview">
          <div>
            <dt>Date de naissance</dt>
            <dd>{player.birthDate.toLocaleDateString('fr-FR')}</dd>
          </div>
          <div>
            <dt>Profil</dt>
            <dd>{profileLabels[player.playerProfile]}</dd>
          </div>
          <div>
            <dt>Statut</dt>
            <dd>{player.status === 'ACTIVE' ? 'Active' : 'Inactive'}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

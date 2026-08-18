import type { Player } from '../types/domain'

export function PlayerSelect({
  players,
  value,
  onChange,
  loading = false,
}: {
  players: Player[]
  value: string
  onChange: (playerId: string) => void
  loading?: boolean
}) {
  return (
    <label>
      Joueuse
      <select
        disabled={loading}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">
          {loading ? 'Chargement des joueuses…' : 'Sélectionner une joueuse'}
        </option>
        {[...players]
          .sort(
            (a, b) =>
              a.lastName.localeCompare(b.lastName) ||
              a.firstName.localeCompare(b.firstName),
          )
          .map((player) => (
            <option key={player.playerId} value={player.playerId}>
              {player.firstName} {player.lastName}
            </option>
          ))}
      </select>
    </label>
  )
}

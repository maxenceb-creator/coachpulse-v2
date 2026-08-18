import { useEffect } from 'react'
import type { Player } from '../types/domain'

export function PlayerSelect({
  players,
  value,
  onChange,
  loading = false,
  teamId,
  isFetching,
  status,
  fetchStatus,
}: {
  players: Player[]
  value: string
  onChange: (playerId: string) => void
  loading?: boolean
  teamId: string
  isFetching: boolean
  status: string
  fetchStatus: string
}) {
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const state = {
      now: performance.now(),
      teamId,
      playersLength: players.length,
      isPending: loading,
      isFetching,
      status,
      fetchStatus,
    }
    console.debug('[PLAYER ROSTER UI DEV] select received players', state)
    console.debug('[PLAYER ROSTER UI DEV] select rendered', {
      ...state,
      optionCount: players.length,
    })
  }, [fetchStatus, isFetching, loading, players, status, teamId])
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

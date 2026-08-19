import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { queryKeys } from './queryKeys'
import { invalidatePlayerAttendance } from './playerAttendanceCache'

describe('cache Présences joueuse', () => {
  it('invalide uniquement la joueuse et le contexte modifiés', async () => {
    const client = new QueryClient()
    const alice = queryKeys.attendance.playerSummary(
      'user-a',
      'coach',
      'team-a',
      'season-a',
      'alice',
    )
    const lina = queryKeys.attendance.playerSummary(
      'user-a',
      'coach',
      'team-a',
      'season-a',
      'lina',
    )
    client.setQueryData(alice, { attendanceRate: 50 })
    client.setQueryData(lina, { attendanceRate: 100 })

    await invalidatePlayerAttendance(client, {
      uid: 'user-a',
      roleId: 'coach',
      teamId: 'team-a',
      seasonId: 'season-a',
      playerId: 'alice',
    })

    expect(client.getQueryState(alice)?.isInvalidated).toBe(true)
    expect(client.getQueryState(lina)?.isInvalidated).toBe(false)
  })
})

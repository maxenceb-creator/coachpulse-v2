import { describe, expect, it } from 'vitest'
import {
  assertDevProjectId,
  buildBootstrapDataset,
  DEV_PROJECT_ID,
  seedEntries,
} from './bootstrapData.js'

const dataset = buildBootstrapDataset(
  'firebase-auth-uid-demo',
  'staff.demo@example.test',
)

describe('DEV bootstrap data', () => {
  it('refuse tout projectId autre que le projet DEV explicite', () => {
    expect(() => assertDevProjectId(DEV_PROJECT_ID)).not.toThrow()
    expect(() => assertDevProjectId('coachpulse-v2-prod')).toThrow(
      /Refus du seed/,
    )
    expect(() => assertDevProjectId(undefined)).toThrow(/Refus du seed/)
  })

  it('crée un User multi-rôle avec une préférence valide', () => {
    const user = dataset.users[0]
    expect(user.roleIds).toHaveLength(3)
    expect(user.roleIds).toContain(user.preferredActiveRoleId)
  })

  it('garde la FIRST_TEAM sans rattachement Season ou Category', () => {
    const firstTeam = dataset.teams.find(
      ({ teamType }) => teamType === 'FIRST_TEAM',
    )
    expect(firstTeam).toBeDefined()
    expect(firstTeam).not.toHaveProperty('seasonId')
    expect(firstTeam).not.toHaveProperty('categoryId')
  })

  it('ne crée aucun double PRIMARY actif', () => {
    const primaryCounts = new Map<string, number>()
    for (const assignment of dataset.playerTeamAssignments.filter(
      ({ assignmentType, status }) =>
        assignmentType === 'PRIMARY' && status === 'ACTIVE',
    )) {
      primaryCounts.set(
        assignment.playerId,
        (primaryCounts.get(assignment.playerId) ?? 0) + 1,
      )
    }
    expect([...primaryCounts.values()].every((count) => count === 1)).toBe(true)
  })

  it('accepte une joueuse sans affectation active', () => {
    const assignedIds = new Set(
      dataset.playerTeamAssignments.map(({ playerId }) => playerId),
    )
    expect(
      dataset.players.some(({ playerId }) => !assignedIds.has(playerId)),
    ).toBe(true)
  })

  it('contient une période TEMPORARY cohérente', () => {
    const temporary = dataset.playerTeamAssignments.find(
      ({ assignmentType }) => assignmentType === 'TEMPORARY',
    )
    expect(temporary?.endDate).toBeInstanceOf(Date)
    expect(temporary!.endDate!.getTime()).toBeGreaterThan(
      temporary!.startDate.getTime(),
    )
  })

  it('crée un TeamAccess unique et cohérent par Team', () => {
    expect(
      new Set(dataset.userTeamAccess.map(({ teamId }) => teamId)).size,
    ).toBe(dataset.userTeamAccess.length)
    const teamIds = new Set(dataset.teams.map(({ teamId }) => teamId))
    expect(
      dataset.userTeamAccess.every(({ teamId }) => teamIds.has(teamId)),
    ).toBe(true)
  })

  it('autorise Coach principal sur U13F et U14F', () => {
    const coachTeamIds = dataset.userTeamAccess
      .filter(({ rolePermissions }) =>
        Boolean(rolePermissions['role-coach-principal']),
      )
      .map(({ teamId }) => teamId)

    expect(coachTeamIds).toEqual(['team-dev-u13f', 'team-dev-u14f'])
  })

  it('utilise les IDs propres à chaque collection pour les upserts', () => {
    const paths = seedEntries(dataset).map(
      ({ collection, id }) => `${collection}/${id}`,
    )
    expect(paths).toContain('teams/team-dev-u13f')
    expect(paths).toContain(
      'playerTeamAssignments/assignment-emma-secondary-u14',
    )
    expect(new Set(paths).size).toBe(paths.length)
  })
})

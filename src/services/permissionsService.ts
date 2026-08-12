import type { TeamAccess } from '../types/domain'
export const isAccessActive = (a: TeamAccess, now = new Date()) =>
  a.status === 'ACTIVE' &&
  (!a.startDate || a.startDate <= now) &&
  (!a.endDate || a.endDate >= now)
export const hasPermission = (
  all: TeamAccess[],
  r: {
    userId: string
    activeRoleId: string
    teamId: string
    permissionKey: string
    now?: Date
  },
) =>
  all.some(
    (a) =>
      a.userId === r.userId &&
      a.teamId === r.teamId &&
      isAccessActive(a, r.now) &&
      a.rolePermissions[r.activeRoleId]?.permissions.includes(r.permissionKey),
  )
export const canAccessTeam = (
  all: TeamAccess[],
  uid: string,
  role: string,
  team: string,
) =>
  all.some(
    (a) =>
      a.userId === uid &&
      a.teamId === team &&
      isAccessActive(a) &&
      Boolean(a.rolePermissions[role]),
  )

export const resolveAccessibleTeamAccesses = (
  all: TeamAccess[],
  uid: string,
  activeRoleId: string,
  now = new Date(),
) => {
  const userAccesses = all.filter((access) => access.userId === uid)
  const activeAccesses = userAccesses.filter((access) =>
    isAccessActive(access, now),
  )
  const roleAccesses = activeAccesses.filter((access) =>
    Boolean(access.rolePermissions[activeRoleId]),
  )

  return { userAccesses, activeAccesses, roleAccesses }
}

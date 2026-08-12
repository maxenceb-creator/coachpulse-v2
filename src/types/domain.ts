export type User = {
  userId: string
  firstName: string
  lastName: string
  email: string
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  linkedPlayerId?: string
  roleIds: string[]
  preferredActiveRoleId?: string
  securityContext?: {
    activeRoleId: string
    activeTeamId: string
    activeSeasonId: string
  }
}
export type Role = {
  roleId: string
  code: string
  label: string
  isActive: boolean
  defaultPermissions: string[]
}
export type TeamAccess = {
  userTeamAccessId: string
  userId: string
  teamId: string
  status: 'ACTIVE' | 'INACTIVE'
  startDate?: Date
  endDate?: Date
  rolePermissions: Record<
    string,
    {
      permissions: string[]
      medicalAccessLevel: 'NONE' | 'SPORT' | 'RESTRICTED' | 'MEDICAL'
    }
  >
}
export type Team = {
  teamId: string
  name: string
  teamType: 'DEVELOPMENT' | 'FIRST_TEAM' | 'OTHER'
  seasonId?: string
  categoryId?: string
  status: 'ACTIVE' | 'INACTIVE'
}
export type Season = {
  seasonId: string
  name: string
  startDate: Date
  endDate: Date
  status: 'PLANNED' | 'ACTIVE' | 'CLOSED'
  isActive: boolean
}
export type Player = {
  playerId: string
  firstName: string
  lastName: string
  birthDate: Date
  nationality?: string
  clubArrivalDate?: Date
  previousClub?: string
  photoPath?: string
  playerProfile: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD'
  preferredFoot: 'LEFT' | 'RIGHT' | 'UNKNOWN'
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: Date
  updatedAt: Date
}
export type Assignment = {
  assignmentId: string
  playerId: string
  teamId: string
  seasonId: string
  assignmentType: 'PRIMARY' | 'SECONDARY' | 'TEMPORARY'
  startDate: Date
  endDate?: Date
  status: 'ACTIVE' | 'INACTIVE'
}

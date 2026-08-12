import { z } from 'zod'

export const DEV_PROJECT_ID = 'coachpulse-v2-dev'

const id = z.string().min(1)
const timestamp = z.date()
const metadata = {
  createdAt: timestamp,
  updatedAt: timestamp,
}

const roleSchema = z.object({
  roleId: id,
  code: z.enum(['ADMIN', 'COACH_PRINCIPAL', 'ANALYSTE_VIDEO']),
  label: z.string().min(1),
  description: z.string().min(1),
  isActive: z.literal(true),
  defaultPermissions: z.array(z.string()).min(1),
  ...metadata,
})

const seasonSchema = z.object({
  seasonId: id,
  name: z.literal('2026-2027'),
  startDate: timestamp,
  endDate: timestamp,
  status: z.literal('ACTIVE'),
  isActive: z.literal(true),
  ...metadata,
})

const subCategorySchema = z.object({
  subCategoryId: id,
  seasonId: id,
  name: z.string().min(1),
  birthYearRule: z.number().int(),
  ...metadata,
})

const categorySchema = z.object({
  categoryId: id,
  seasonId: id,
  name: z.string().min(1),
  subCategoryIds: z.array(id).min(1),
  status: z.literal('ACTIVE'),
  ...metadata,
})

const teamSchema = z.object({
  teamId: id,
  name: z.string().min(1),
  teamType: z.enum(['DEVELOPMENT', 'FIRST_TEAM']),
  seasonId: id.optional(),
  categoryId: id.optional(),
  status: z.literal('ACTIVE'),
  ...metadata,
})

const playerSchema = z
  .object({
    playerId: id,
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    birthDate: timestamp,
    nationality: z.string().min(1).optional(),
    clubArrivalDate: timestamp.optional(),
    previousClub: z.string().min(1).optional(),
    playerProfile: z.enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD']),
    preferredFoot: z.enum(['LEFT', 'RIGHT', 'UNKNOWN']),
    status: z.literal('ACTIVE'),
    ...metadata,
  })
  .strict()

const assignmentSchema = z.object({
  assignmentId: id,
  playerId: id,
  teamId: id,
  seasonId: id,
  assignmentType: z.enum(['PRIMARY', 'SECONDARY', 'TEMPORARY']),
  startDate: timestamp,
  endDate: timestamp.optional(),
  status: z.literal('ACTIVE'),
  ...metadata,
})

const playerAccessScopeSchema = z.object({
  playerAccessScopeId: id,
  playerId: id,
  teamId: id,
  seasonId: id,
  status: z.literal('ACTIVE'),
  startDate: timestamp,
  endDate: timestamp.optional(),
  source: z.literal('PLAYER_TEAM_ASSIGNMENT'),
  ...metadata,
})

const rolePermissionSchema = z.object({
  permissions: z.array(z.string()),
  medicalAccessLevel: z.literal('NONE'),
})

const accessSchema = z.object({
  userTeamAccessId: id,
  userId: id,
  teamId: id,
  status: z.literal('ACTIVE'),
  startDate: timestamp,
  rolePermissions: z.record(id, rolePermissionSchema),
  ...metadata,
})

const userSchema = z.object({
  userId: id,
  firstName: z.literal('Staff'),
  lastName: z.literal('Démo'),
  email: z.email(),
  status: z.literal('ACTIVE'),
  roleIds: z.array(id).min(2),
  preferredActiveRoleId: id,
  securityContext: z.object({
    activeRoleId: id,
    activeTeamId: id,
    activeSeasonId: id,
  }),
  ...metadata,
})

const datasetSchema = z.object({
  roles: z.array(roleSchema),
  seasons: z.array(seasonSchema),
  subCategories: z.array(subCategorySchema),
  categories: z.array(categorySchema),
  teams: z.array(teamSchema),
  players: z.array(playerSchema),
  playerTeamAssignments: z.array(assignmentSchema),
  playerAccessScopes: z.array(playerAccessScopeSchema),
  users: z.array(userSchema).length(1),
  userTeamAccess: z.array(accessSchema),
})

export type BootstrapDataset = z.infer<typeof datasetSchema>
export type SeedCollection = keyof BootstrapDataset

const ADMIN = 'role-admin'
const COACH = 'role-coach-principal'
const ANALYST = 'role-analyste-video'
const SEASON = 'season-2026-2027'
const U13 = 'team-dev-u13f'
const U14 = 'team-dev-u14f'
const FIRST_TEAM = 'team-first-demo'
const CREATED_AT = new Date('2026-08-01T00:00:00.000Z')

const adminPermissions = [
  'users.read',
  'users.manage',
  'teams.read',
  'teams.manage',
  'categories.read',
  'categories.manage',
  'seasons.read',
  'seasons.manage',
  'roles.manage',
  'players.read',
  'players.write',
  'players.manageAssignments',
]
const coachPermissions = [
  'players.read',
  'matches.read',
  'attendance.read',
  'tests.read',
]
const analystPermissions = ['players.read', 'matches.read', 'tests.read']

export function assertDevProjectId(projectId: string | undefined) {
  if (projectId !== DEV_PROJECT_ID) {
    throw new Error(
      `Refus du seed : projectId attendu ${DEV_PROJECT_ID}, reçu ${projectId ?? '<absent>'}.`,
    )
  }
}

function validateBusinessInvariants(dataset: BootstrapDataset) {
  for (const team of dataset.teams) {
    if (
      team.teamType === 'FIRST_TEAM' &&
      ('seasonId' in team || 'categoryId' in team)
    ) {
      throw new Error(
        'Une Team FIRST_TEAM DEV ne doit pas forcer seasonId ou categoryId.',
      )
    }
    if (
      team.teamType === 'DEVELOPMENT' &&
      (!team.seasonId || !team.categoryId)
    ) {
      throw new Error(
        'Une Team DEVELOPMENT DEV doit référencer sa Season et sa Category.',
      )
    }
  }

  for (const assignment of dataset.playerTeamAssignments) {
    if (assignment.endDate && assignment.endDate < assignment.startDate) {
      throw new Error(`Période invalide pour ${assignment.assignmentId}.`)
    }
  }

  const assignmentScopes = new Set(
    dataset.playerTeamAssignments.map(
      ({ playerId, teamId, seasonId }) => `${playerId}_${teamId}_${seasonId}`,
    ),
  )
  const accessScopes = new Set(
    dataset.playerAccessScopes.map(({ playerAccessScopeId }) =>
      playerAccessScopeId,
    ),
  )
  for (const scopeId of assignmentScopes) {
    if (!accessScopes.has(scopeId)) {
      throw new Error(`Scope d'autorisation manquant pour ${scopeId}.`)
    }
  }

  const primaryByPlayer = new Map<string, z.infer<typeof assignmentSchema>[]>()
  for (const assignment of dataset.playerTeamAssignments.filter(
    ({ assignmentType, status }) =>
      assignmentType === 'PRIMARY' && status === 'ACTIVE',
  )) {
    const previous = primaryByPlayer.get(assignment.playerId) ?? []
    for (const other of previous) {
      const firstEnd = assignment.endDate?.getTime() ?? Number.POSITIVE_INFINITY
      const secondEnd = other.endDate?.getTime() ?? Number.POSITIVE_INFINITY
      if (
        assignment.startDate.getTime() <= secondEnd &&
        other.startDate.getTime() <= firstEnd
      ) {
        throw new Error(
          `PRIMARY simultanés invalides pour ${assignment.playerId}.`,
        )
      }
    }
    previous.push(assignment)
    primaryByPlayer.set(assignment.playerId, previous)
  }

  const user = dataset.users[0]
  if (!user.roleIds.includes(user.preferredActiveRoleId)) {
    throw new Error(
      'preferredActiveRoleId doit appartenir aux roleIds du User DEV.',
    )
  }
  const roleIds = new Set(dataset.roles.map(({ roleId }) => roleId))
  const teamIds = new Set(dataset.teams.map(({ teamId }) => teamId))
  for (const access of dataset.userTeamAccess) {
    if (access.userId !== user.userId || !teamIds.has(access.teamId)) {
      throw new Error(`TeamAccess incohérent : ${access.userTeamAccessId}.`)
    }
    for (const roleId of Object.keys(access.rolePermissions)) {
      if (!user.roleIds.includes(roleId) || !roleIds.has(roleId)) {
        throw new Error(`Rôle inconnu dans ${access.userTeamAccessId}.`)
      }
    }
  }
}

export function buildBootstrapDataset(
  uid: string,
  email: string,
): BootstrapDataset {
  const meta = { createdAt: CREATED_AT, updatedAt: CREATED_AT }
  const access = (
    teamId: string,
    rolePermissions: BootstrapDataset['userTeamAccess'][number]['rolePermissions'],
  ) => ({
    userTeamAccessId: `${uid}_${teamId}`,
    userId: uid,
    teamId,
    status: 'ACTIVE' as const,
    startDate: new Date('2026-08-01T00:00:00.000Z'),
    rolePermissions,
    ...meta,
  })
  const rolePermission = (permissions: string[]) => ({
    permissions,
    medicalAccessLevel: 'NONE' as const,
  })

  const dataset = datasetSchema.parse({
    roles: [
      {
        roleId: ADMIN,
        code: 'ADMIN',
        label: 'Admin DEV',
        description: 'Administration du socle de démonstration.',
        isActive: true,
        defaultPermissions: adminPermissions,
        ...meta,
      },
      {
        roleId: COACH,
        code: 'COACH_PRINCIPAL',
        label: 'Coach principal DEV',
        description: 'Validation du contexte staff sportif.',
        isActive: true,
        defaultPermissions: coachPermissions,
        ...meta,
      },
      {
        roleId: ANALYST,
        code: 'ANALYSTE_VIDEO',
        label: 'Analyste vidéo DEV',
        description: 'Validation du contexte analyse en lecture.',
        isActive: true,
        defaultPermissions: analystPermissions,
        ...meta,
      },
    ],
    seasons: [
      {
        seasonId: SEASON,
        name: '2026-2027',
        startDate: new Date('2026-07-01T00:00:00.000Z'),
        endDate: new Date('2027-06-30T23:59:59.999Z'),
        status: 'ACTIVE',
        isActive: true,
        ...meta,
      },
    ],
    subCategories: [
      {
        subCategoryId: 'subcat-u13-2026',
        seasonId: SEASON,
        name: 'U13F',
        birthYearRule: 2014,
        ...meta,
      },
      {
        subCategoryId: 'subcat-u14-2026',
        seasonId: SEASON,
        name: 'U14F',
        birthYearRule: 2013,
        ...meta,
      },
    ],
    categories: [
      {
        categoryId: 'category-u13f-2026',
        seasonId: SEASON,
        name: 'U13F DEV',
        subCategoryIds: ['subcat-u13-2026'],
        status: 'ACTIVE',
        ...meta,
      },
      {
        categoryId: 'category-u14f-2026',
        seasonId: SEASON,
        name: 'U14F DEV',
        subCategoryIds: ['subcat-u14-2026'],
        status: 'ACTIVE',
        ...meta,
      },
    ],
    teams: [
      {
        teamId: U13,
        name: 'U13F DEV',
        teamType: 'DEVELOPMENT',
        seasonId: SEASON,
        categoryId: 'category-u13f-2026',
        status: 'ACTIVE',
        ...meta,
      },
      {
        teamId: U14,
        name: 'U14F DEV',
        teamType: 'DEVELOPMENT',
        seasonId: SEASON,
        categoryId: 'category-u14f-2026',
        status: 'ACTIVE',
        ...meta,
      },
      {
        teamId: FIRST_TEAM,
        name: 'Équipe première DEMO',
        teamType: 'FIRST_TEAM',
        status: 'ACTIVE',
        ...meta,
      },
    ],
    players: [
      {
        playerId: 'player-alice-martin',
        firstName: 'Alice',
        lastName: 'Martin',
        birthDate: new Date('2014-03-12T00:00:00.000Z'),
        nationality: 'Fictive',
        clubArrivalDate: new Date('2025-07-01T00:00:00.000Z'),
        playerProfile: 'DEFENDER',
        preferredFoot: 'RIGHT',
        status: 'ACTIVE',
        ...meta,
      },
      {
        playerId: 'player-emma-bernard',
        firstName: 'Emma',
        lastName: 'Bernard',
        birthDate: new Date('2014-09-04T00:00:00.000Z'),
        previousClub: 'Club Démo Nord',
        playerProfile: 'MIDFIELDER',
        preferredFoot: 'LEFT',
        status: 'ACTIVE',
        ...meta,
      },
      {
        playerId: 'player-lina-robert',
        firstName: 'Lina',
        lastName: 'Robert',
        birthDate: new Date('2013-01-28T00:00:00.000Z'),
        playerProfile: 'GOALKEEPER',
        preferredFoot: 'RIGHT',
        status: 'ACTIVE',
        ...meta,
      },
      {
        playerId: 'player-jade-thomas',
        firstName: 'Jade',
        lastName: 'Thomas',
        birthDate: new Date('2014-11-19T00:00:00.000Z'),
        playerProfile: 'FORWARD',
        preferredFoot: 'UNKNOWN',
        status: 'ACTIVE',
        ...meta,
      },
      {
        playerId: 'player-nora-petit',
        firstName: 'Nora',
        lastName: 'Petit',
        birthDate: new Date('2002-06-08T00:00:00.000Z'),
        playerProfile: 'FORWARD',
        preferredFoot: 'LEFT',
        status: 'ACTIVE',
        ...meta,
      },
    ],
    playerTeamAssignments: [
      {
        assignmentId: 'assignment-alice-primary-u13',
        playerId: 'player-alice-martin',
        teamId: U13,
        seasonId: SEASON,
        assignmentType: 'PRIMARY',
        startDate: new Date('2026-08-01T00:00:00.000Z'),
        status: 'ACTIVE',
        ...meta,
      },
      {
        assignmentId: 'assignment-emma-primary-u13',
        playerId: 'player-emma-bernard',
        teamId: U13,
        seasonId: SEASON,
        assignmentType: 'PRIMARY',
        startDate: new Date('2026-08-01T00:00:00.000Z'),
        status: 'ACTIVE',
        ...meta,
      },
      {
        assignmentId: 'assignment-emma-secondary-u14',
        playerId: 'player-emma-bernard',
        teamId: U14,
        seasonId: SEASON,
        assignmentType: 'SECONDARY',
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        status: 'ACTIVE',
        ...meta,
      },
      {
        assignmentId: 'assignment-lina-primary-u14',
        playerId: 'player-lina-robert',
        teamId: U14,
        seasonId: SEASON,
        assignmentType: 'PRIMARY',
        startDate: new Date('2026-08-01T00:00:00.000Z'),
        status: 'ACTIVE',
        ...meta,
      },
      {
        assignmentId: 'assignment-lina-temporary-u13',
        playerId: 'player-lina-robert',
        teamId: U13,
        seasonId: SEASON,
        assignmentType: 'TEMPORARY',
        startDate: new Date('2026-10-01T00:00:00.000Z'),
        endDate: new Date('2026-10-31T23:59:59.999Z'),
        status: 'ACTIVE',
        ...meta,
      },
      {
        assignmentId: 'assignment-nora-primary-first',
        playerId: 'player-nora-petit',
        teamId: FIRST_TEAM,
        seasonId: SEASON,
        assignmentType: 'PRIMARY',
        startDate: new Date('2026-08-01T00:00:00.000Z'),
        status: 'ACTIVE',
        ...meta,
      },
    ],
    playerAccessScopes: [
      ['player-alice-martin', U13, '2026-08-01'],
      ['player-emma-bernard', U13, '2026-08-01'],
      ['player-emma-bernard', U14, '2026-09-01'],
      ['player-lina-robert', U14, '2026-08-01'],
      ['player-lina-robert', U13, '2026-10-01', '2026-10-31T23:59:59.999Z'],
      ['player-nora-petit', FIRST_TEAM, '2026-08-01'],
    ].map(([playerId, teamId, startDate, endDate]) => ({
      playerAccessScopeId: `${playerId}_${teamId}_${SEASON}`,
      playerId,
      teamId,
      seasonId: SEASON,
      status: 'ACTIVE' as const,
      startDate: new Date(startDate),
      ...(endDate ? { endDate: new Date(endDate) } : {}),
      source: 'PLAYER_TEAM_ASSIGNMENT' as const,
      ...meta,
    })),
    users: [
      {
        userId: uid,
        firstName: 'Staff',
        lastName: 'Démo',
        email,
        status: 'ACTIVE',
        roleIds: [ADMIN, COACH, ANALYST],
        preferredActiveRoleId: COACH,
        securityContext: {
          activeRoleId: COACH,
          activeTeamId: U13,
          activeSeasonId: SEASON,
        },
        ...meta,
      },
    ],
    userTeamAccess: [
      access(U13, {
        [ADMIN]: rolePermission(adminPermissions),
        [COACH]: rolePermission(coachPermissions),
        [ANALYST]: rolePermission(analystPermissions),
      }),
      access(U14, {
        [ADMIN]: rolePermission(adminPermissions),
        [ANALYST]: rolePermission(analystPermissions),
      }),
      access(FIRST_TEAM, { [ADMIN]: rolePermission(adminPermissions) }),
    ],
  })

  validateBusinessInvariants(dataset)
  return dataset
}

export function seedEntries(dataset: BootstrapDataset) {
  const idFields = {
    roles: 'roleId',
    seasons: 'seasonId',
    subCategories: 'subCategoryId',
    categories: 'categoryId',
    teams: 'teamId',
    players: 'playerId',
    playerTeamAssignments: 'assignmentId',
    playerAccessScopes: 'playerAccessScopeId',
    users: 'userId',
    userTeamAccess: 'userTeamAccessId',
  } as const satisfies Record<SeedCollection, string>

  return (
    Object.entries(dataset) as [
      SeedCollection,
      BootstrapDataset[SeedCollection],
    ][]
  ).flatMap(([collection, documents]) =>
    documents.map((data) => {
      const document = data as unknown as Record<string, unknown>
      const documentId = document[idFields[collection]]
      if (typeof documentId !== 'string') {
        throw new Error(`Identifiant manquant dans ${collection}.`)
      }
      return { collection, id: documentId, data }
    }),
  )
}

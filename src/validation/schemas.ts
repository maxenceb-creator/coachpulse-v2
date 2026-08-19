import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'
const date = z
  .union([z.date(), z.instanceof(Timestamp)])
  .transform((v) => (v instanceof Timestamp ? v.toDate() : v))
export const userSchema = z.object({
  userId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
  linkedPlayerId: z.string().optional(),
  roleIds: z.array(z.string()).min(1),
  preferredActiveRoleId: z.string().optional(),
  securityContext: z
    .object({
      activeRoleId: z.string(),
      activeTeamId: z.string(),
      activeSeasonId: z.string(),
    })
    .optional(),
})
export const roleSchema = z.object({
  roleId: z.string(),
  code: z.string(),
  label: z.string(),
  isActive: z.boolean(),
  defaultPermissions: z.array(z.string()),
})
export const accessSchema = z.object({
  userTeamAccessId: z.string(),
  userId: z.string(),
  teamId: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  startDate: date.optional(),
  endDate: date.optional(),
  rolePermissions: z.record(
    z.string(),
    z.object({
      permissions: z.array(z.string()),
      medicalAccessLevel: z.enum(['NONE', 'SPORT', 'RESTRICTED', 'MEDICAL']),
    }),
  ),
})
export const teamSchema = z.object({
  teamId: z.string(),
  name: z.string(),
  teamType: z.enum(['DEVELOPMENT', 'FIRST_TEAM', 'OTHER']),
  seasonId: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
})
export const seasonSchema = z.object({
  seasonId: z.string(),
  name: z.string(),
  startDate: date,
  endDate: date,
  status: z.enum(['PLANNED', 'ACTIVE', 'CLOSED']),
  isActive: z.boolean(),
})
export const categorySchema = z.object({
  categoryId: z.string(),
  seasonId: z.string(),
  name: z.string(),
  subCategoryIds: z.array(z.string()),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  createdAt: date,
  updatedAt: date,
})
export const subCategorySchema = z.object({
  subCategoryId: z.string(),
  seasonId: z.string(),
  name: z.string(),
  birthYearRule: z.number().int(),
  createdAt: date,
  updatedAt: date,
})
export const playerSchema = z
  .object({
    playerId: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    birthDate: date,
    nationality: z.string().optional(),
    clubArrivalDate: date.optional(),
    previousClub: z.string().optional(),
    photoPath: z.string().optional(),
    playerProfile: z.enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD']),
    preferredFoot: z.enum(['LEFT', 'RIGHT', 'UNKNOWN']),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    createdAt: date,
    updatedAt: date,
  })
  .strict()
export const assignmentSchema = z.object({
  assignmentId: z.string(),
  playerId: z.string(),
  teamId: z.string(),
  seasonId: z.string(),
  assignmentType: z.enum(['PRIMARY', 'SECONDARY', 'TEMPORARY']),
  startDate: date,
  endDate: date.optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
})

export const sessionSchema = z
  .object({
    sessionId: z.string().min(1),
    seasonId: z.string().min(1),
    categoryId: z.string().min(1),
    title: z.string().optional(),
    sessionType: z.string().min(1),
    startDateTime: date,
    endDateTime: date.optional(),
    plannedDurationMinutes: z.number().int().nonnegative(),
    actualDurationMinutes: z.number().int().nonnegative().optional(),
    status: z.enum(['PLANNED', 'COMPLETED', 'CANCELLED']),
    createdByUserId: z.string().min(1),
    createdAt: date,
    updatedAt: date,
  })
  .strict()

export const sessionParticipantSchema = z
  .object({
    sessionParticipantId: z.string().min(1),
    sessionId: z.string().min(1),
    playerId: z.string().min(1),
    participationType: z.enum(['EXPECTED', 'INVITED']),
    addedByUserId: z.string().min(1).optional(),
    createdAt: date,
    updatedAt: date,
  })
  .strict()

export const attendanceStatusSchema = z.enum([
  'PRESENT',
  'LATE',
  'ABSENT_JUSTIFIED',
  'ABSENT_UNJUSTIFIED',
  'INJURED',
  'SICK',
  'EXTERNAL_PROGRAM',
  'EXCUSED',
])

export const attendanceSchema = z
  .object({
    attendanceId: z.string().min(1),
    sessionId: z.string().min(1),
    playerId: z.string().min(1),
    status: attendanceStatusSchema,
    arrivalDelayMinutes: z.number().int().nonnegative().optional(),
    participationDurationMinutes: z.number().int().nonnegative().optional(),
    reason: z.string().optional(),
    note: z.string().optional(),
    recordedByUserId: z.string().min(1),
    createdAt: date,
    updatedAt: date,
  })
  .strict()

const metricKeySchema = z.string().regex(/^[A-Z][A-Z0-9_]*$/)

export const testMetricDefinitionSchema = z
  .object({
    metricKey: metricKeySchema,
    label: z.string().min(1),
    valueType: z.literal('NUMBER'),
    unit: z.enum(['COUNT', 'SECOND', 'METER', 'CENTIMETER', 'KM_H']),
    direction: z.enum([
      'HIGHER_IS_BETTER',
      'LOWER_IS_BETTER',
      'TARGET_IS_BETTER',
      'NEUTRAL',
    ]),
    required: z.boolean(),
    precision: z.number().int().min(0).max(6).optional(),
    minValue: z.number().finite().optional(),
    maxValue: z.number().finite().optional(),
    order: z.number().int().min(0).optional(),
  })
  .strict()
  .refine(
    ({ minValue, maxValue }) =>
      minValue === undefined || maxValue === undefined || minValue <= maxValue,
    { message: 'minValue doit être inférieur ou égal à maxValue' },
  )

export const testDefinitionSchema = z
  .object({
    testDefinitionId: z.string().min(1),
    name: z.string().min(1),
    code: metricKeySchema,
    description: z.string().min(1).optional(),
    domain: z.enum(['TECHNICAL', 'PHYSICAL']),
    status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']),
    version: z.number().int().positive(),
    metrics: z.array(testMetricDefinitionSchema),
    attemptPolicy: z
      .object({
        maxAttempts: z.number().int().positive().optional(),
        aggregation: z.enum(['BEST', 'AVERAGE', 'LAST', 'MEDIAN']),
      })
      .strict()
      .optional(),
    createdAt: date,
    updatedAt: date,
    createdBy: z.string().min(1).optional(),
  })
  .strict()
  .refine(
    ({ metrics }) =>
      new Set(metrics.map(({ metricKey }) => metricKey)).size ===
      metrics.length,
    { message: 'Les metricKey doivent être uniques', path: ['metrics'] },
  )
  .refine(({ status, metrics }) => status !== 'ACTIVE' || metrics.length > 0, {
    message: 'Une définition ACTIVE doit contenir au moins une métrique',
    path: ['metrics'],
  })

export const testBenchmarkSchema = z
  .object({
    testBenchmarkId: z.string().min(1),
    testDefinitionId: z.string().min(1),
    testDefinitionVersion: z.number().int().positive(),
    metricKey: metricKeySchema,
    subCategoryId: z.string().min(1),
    seasonId: z.string().min(1).optional(),
    benchmarkLevel: z.enum(['TARGET', 'GOOD', 'VERY_GOOD', 'REFERENCE']),
    targetValue: z.number().finite(),
    label: z.string().min(1).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
    createdAt: date,
    updatedAt: date,
    createdBy: z.string().min(1).optional(),
  })
  .strict()

export const testSessionSchema = z
  .object({
    testSessionId: z.string().min(1),
    testDefinitionId: z.string().min(1),
    testDefinitionVersion: z.number().int().positive(),
    teamId: z.string().min(1),
    seasonId: z.string().min(1),
    categoryId: z.string().min(1),
    date,
    status: z.enum(['DRAFT', 'COMPLETED']),
    createdBy: z.string().min(1),
    createdAt: date,
    updatedAt: date,
  })
  .strict()

export const testResultSchema = z
  .object({
    testResultId: z.string().min(1),
    testSessionId: z.string().min(1),
    testDefinitionId: z.string().min(1),
    testDefinitionVersion: z.number().int().positive(),
    playerId: z.string().min(1),
    teamId: z.string().min(1),
    seasonId: z.string().min(1),
    values: z.record(metricKeySchema, z.number().finite()),
    contextSnapshot: z
      .object({ preferredFoot: z.enum(['LEFT', 'RIGHT', 'UNKNOWN']) })
      .strict(),
    createdBy: z.string().min(1),
    createdAt: date,
    updatedAt: date,
  })
  .strict()

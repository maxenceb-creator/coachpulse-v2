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

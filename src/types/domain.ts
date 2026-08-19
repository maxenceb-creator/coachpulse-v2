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
export type SubCategory = {
  subCategoryId: string
  seasonId: string
  name: string
  birthYearRule: number
  createdAt: Date
  updatedAt: Date
}
export type Category = {
  categoryId: string
  seasonId: string
  name: string
  subCategoryIds: string[]
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: Date
  updatedAt: Date
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

export type Session = {
  sessionId: string
  seasonId: string
  categoryId: string
  title?: string
  sessionType: string
  startDateTime: Date
  endDateTime?: Date
  plannedDurationMinutes: number
  actualDurationMinutes?: number
  status: 'PLANNED' | 'COMPLETED' | 'CANCELLED'
  createdByUserId: string
  createdAt: Date
  updatedAt: Date
}

export type SessionParticipant = {
  sessionParticipantId: string
  sessionId: string
  playerId: string
  participationType: 'EXPECTED' | 'INVITED'
  addedByUserId?: string
  createdAt: Date
  updatedAt: Date
}

export type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'ABSENT_JUSTIFIED'
  | 'ABSENT_UNJUSTIFIED'
  | 'INJURED'
  | 'SICK'
  | 'EXTERNAL_PROGRAM'
  | 'EXCUSED'

export type Attendance = {
  attendanceId: string
  sessionId: string
  playerId: string
  status: AttendanceStatus
  arrivalDelayMinutes?: number
  participationDurationMinutes?: number
  reason?: string
  note?: string
  recordedByUserId: string
  createdAt: Date
  updatedAt: Date
}

export type TestMetricDefinition = {
  metricKey: string
  label: string
  valueType: 'NUMBER'
  unit: 'COUNT' | 'SECOND' | 'METER' | 'CENTIMETER' | 'KM_H'
  direction:
    'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER' | 'TARGET_IS_BETTER' | 'NEUTRAL'
  required: boolean
  precision?: number
  minValue?: number
  maxValue?: number
  order?: number
}

export type TestAttemptPolicy = {
  maxAttempts?: number
  aggregation: 'BEST' | 'AVERAGE' | 'LAST' | 'MEDIAN'
}

export type TestDefinition = {
  testDefinitionId: string
  name: string
  code: string
  description?: string
  domain: 'TECHNICAL' | 'PHYSICAL'
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
  version: number
  metrics: TestMetricDefinition[]
  attemptPolicy?: TestAttemptPolicy
  createdAt: Date
  updatedAt: Date
  createdBy?: string
}

export type TestBenchmark = {
  testBenchmarkId: string
  testDefinitionId: string
  testDefinitionVersion: number
  metricKey: string
  subCategoryId: string
  seasonId?: string
  benchmarkLevel: 'TARGET' | 'GOOD' | 'VERY_GOOD' | 'REFERENCE'
  targetValue: number
  label?: string
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
  createdAt: Date
  updatedAt: Date
  createdBy?: string
}

export type TestSession = {
  testSessionId: string
  testDefinitionId: string
  testDefinitionVersion: number
  teamId: string
  seasonId: string
  categoryId: string
  date: Date
  status: 'DRAFT' | 'COMPLETED'
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type TestResult = {
  testResultId: string
  testSessionId: string
  testDefinitionId: string
  testDefinitionVersion: number
  playerId: string
  teamId: string
  seasonId: string
  values: Record<string, number>
  contextSnapshot: { preferredFoot: Player['preferredFoot'] }
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type MetricTrend = 'IMPROVED' | 'STABLE' | 'REGRESSED'
export type TestComparisonCompatibility =
  | 'COMPATIBLE'
  | 'INCOMPATIBLE_DEFINITION'
  | 'INCOMPATIBLE_VERSION'
  | 'INCOMPATIBLE_METRIC'
  | 'INCOMPATIBLE_UNIT'

export type MetricPerformanceComparison = {
  compatibility: TestComparisonCompatibility
  previousValue: number
  currentValue: number
  delta?: number
  directionalDelta?: number
  relativeChange?: number
  performanceRelativeChange?: number
  trend?: MetricTrend
}

export type BenchmarkComparison = {
  targetValue: number
  direction: TestMetricDefinition['direction']
  status: 'ABOVE_TARGET' | 'ON_TARGET' | 'BELOW_TARGET' | 'NOT_APPLICABLE'
  reached: boolean | null
  rawDelta: number
  directionalDelta?: number
  relativeGap?: number
}

export type PlayerTestHistoryPoint = {
  session: TestSession
  result: TestResult
  metricKey: string
  unit: TestMetricDefinition['unit']
  value: number
}

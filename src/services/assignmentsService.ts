import type { Assignment } from '../types/domain'

export const isAssignmentEffective = (
  assignment: Assignment,
  effectiveAt: Date,
) =>
  assignment.status === 'ACTIVE' &&
  assignment.startDate.getTime() <= effectiveAt.getTime() &&
  (!assignment.endDate || assignment.endDate.getTime() >= effectiveAt.getTime())

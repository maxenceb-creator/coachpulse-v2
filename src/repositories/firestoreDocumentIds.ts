const firestoreDocumentIdFields: Record<string, string> = {
  users: 'userId',
  roles: 'roleId',
  userTeamAccess: 'userTeamAccessId',
  teams: 'teamId',
  seasons: 'seasonId',
  categories: 'categoryId',
  subCategories: 'subCategoryId',
  players: 'playerId',
  playerTeamAssignments: 'assignmentId',
  sessions: 'sessionId',
  sessionParticipants: 'sessionParticipantId',
  attendance: 'attendanceId',
  testDefinitions: 'testDefinitionId',
  testBenchmarks: 'testBenchmarkId',
  testSessions: 'testSessionId',
  testResults: 'testResultId',
}

export const withFirestoreDocumentId = (
  path: string,
  id: string,
  data: Record<string, unknown>,
) => ({ ...data, [firestoreDocumentIdFields[path] ?? 'id']: id })

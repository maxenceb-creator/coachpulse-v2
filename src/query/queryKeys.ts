export const queryKeys = {
  user: (uid: string) => ['user', uid] as const,
  roles: (uid: string, roleIds: string[]) =>
    ['roles', uid, ...[...roleIds].sort()] as const,
  teamAccess: (uid: string) => ['teamAccess', uid] as const,
  teams: (uid: string, roleId: string, teamIds: string[] = []) =>
    ['teams', uid, roleId, ...[...teamIds].sort()] as const,
  season: ['season', 'active'] as const,
  assignments: (
    uid: string,
    roleId: string,
    teamId: string,
    seasonId: string,
  ) => ['assignments', uid, roleId, teamId, seasonId] as const,
  players: {
    count: (uid: string, roleId: string, teamId: string, seasonId: string) =>
      ['players', 'count', uid, roleId, teamId, seasonId] as const,
  },
  tests: {
    definitions: (
      uid: string,
      roleId: string,
      teamId: string,
      seasonId: string,
    ) => ['testDefinitions', uid, roleId, teamId, seasonId, 'active'] as const,
    definition: (
      uid: string,
      roleId: string,
      teamId: string,
      seasonId: string,
      testDefinitionId: string,
      version: number,
    ) =>
      [
        'testDefinition',
        uid,
        roleId,
        teamId,
        seasonId,
        testDefinitionId,
        version,
      ] as const,
    benchmarks: (
      uid: string,
      roleId: string,
      teamId: string,
      seasonId: string,
      subCategoryId: string,
      testDefinitionId?: string,
    ) =>
      [
        'testBenchmarks',
        uid,
        roleId,
        teamId,
        seasonId,
        subCategoryId,
        testDefinitionId ?? 'all',
      ] as const,
    sessions: (uid: string, roleId: string, teamId: string, seasonId: string) =>
      ['testSessions', uid, roleId, teamId, seasonId] as const,
    session: (
      uid: string,
      roleId: string,
      teamId: string,
      seasonId: string,
      testSessionId: string,
    ) => ['testSession', uid, roleId, teamId, seasonId, testSessionId] as const,
    results: (
      uid: string,
      roleId: string,
      teamId: string,
      seasonId: string,
      testSessionId: string,
    ) => ['testResults', uid, roleId, teamId, seasonId, testSessionId] as const,
    analysisRoot: (
      uid: string,
      roleId: string,
      teamId: string,
      seasonId: string,
    ) => ['testAnalysis', uid, roleId, teamId, seasonId] as const,
    analysis: (
      uid: string,
      roleId: string,
      teamId: string,
      seasonId: string,
      testDefinitionId: string,
      version: number,
      metricKey: string,
      playerId = 'all',
    ) =>
      [
        ...queryKeys.tests.analysisRoot(uid, roleId, teamId, seasonId),
        testDefinitionId,
        version,
        metricKey,
        playerId,
      ] as const,
  },
}

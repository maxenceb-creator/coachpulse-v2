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
    profile: (
      uid: string,
      roleId: string,
      teamId: string,
      seasonId: string,
      playerId: string,
    ) =>
      ['players', 'profile', uid, roleId, teamId, seasonId, playerId] as const,
    roster: (uid: string, roleId: string, teamId: string, seasonId: string) =>
      ['players', 'roster', uid, roleId, teamId, seasonId] as const,
    taxonomy: (
      uid: string,
      roleId: string,
      teamId: string,
      seasonId: string,
      categoryId: string,
      birthYear: number | string,
    ) =>
      [
        'players',
        'taxonomy',
        uid,
        roleId,
        teamId,
        seasonId,
        categoryId,
        birthYear,
      ] as const,
  },
  attendance: {
    playerSummary: (
      uid: string,
      roleId: string,
      teamId: string,
      seasonId: string,
      playerId: string,
    ) =>
      [
        'attendance',
        'playerSummary',
        uid,
        roleId,
        teamId,
        seasonId,
        playerId,
      ] as const,
  },
  tests: {
    catalogue: (
      uid: string,
      roleId: string,
      teamId: string,
      seasonId: string,
    ) => ['testCatalogue', uid, roleId, teamId, seasonId] as const,
    definitionAdmin: (
      uid: string,
      roleId: string,
      teamId: string,
      seasonId: string,
      definitionId: string,
    ) =>
      [
        'testDefinitionAdmin',
        uid,
        roleId,
        teamId,
        seasonId,
        definitionId,
      ] as const,
    benchmarksAdmin: (
      uid: string,
      roleId: string,
      teamId: string,
      seasonId: string,
      definitionId: string,
      version: number,
    ) =>
      [
        'testBenchmarksAdmin',
        uid,
        roleId,
        teamId,
        seasonId,
        definitionId,
        version,
      ] as const,
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
    eligiblePlayers: (
      uid: string,
      roleId: string,
      teamId: string,
      seasonId: string,
      testSessionId: string,
    ) =>
      [
        ...queryKeys.tests.session(
          uid,
          roleId,
          teamId,
          seasonId,
          testSessionId,
        ),
        'eligiblePlayers',
      ] as const,
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
    playerHistory: (
      uid: string,
      roleId: string,
      teamId: string,
      seasonId: string,
      playerId: string,
    ) =>
      [
        'tests',
        'playerHistory',
        uid,
        roleId,
        teamId,
        seasonId,
        playerId,
      ] as const,
    playerRoster: (
      uid: string,
      roleId: string,
      teamId: string,
      seasonId: string,
    ) => queryKeys.players.roster(uid, roleId, teamId, seasonId),
    playerHistorySessions: (
      uid: string,
      roleId: string,
      teamId: string,
      seasonId: string,
    ) =>
      [
        'tests',
        'playerHistorySessions',
        uid,
        roleId,
        teamId,
        seasonId,
      ] as const,
    playerHistoryResults: (
      uid: string,
      roleId: string,
      teamId: string,
      seasonId: string,
      playerId: string,
    ) =>
      [
        'tests',
        'playerHistoryResults',
        uid,
        roleId,
        teamId,
        seasonId,
        playerId,
      ] as const,
    playerHistoryTaxonomy: (
      uid: string,
      roleId: string,
      teamId: string,
      seasonId: string,
      categoryId: string,
    ) =>
      [
        'tests',
        'playerHistoryTaxonomy',
        uid,
        roleId,
        teamId,
        seasonId,
        categoryId,
      ] as const,
  },
}

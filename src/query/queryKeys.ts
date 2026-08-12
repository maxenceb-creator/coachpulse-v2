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
  },
}

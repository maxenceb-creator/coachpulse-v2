export const selectActiveId = (
  availableIds: string[],
  currentId?: string,
  preferredId?: string,
) => {
  if (currentId && availableIds.includes(currentId)) return currentId
  if (preferredId && availableIds.includes(preferredId)) return preferredId
  return availableIds[0]
}

export const isSecurityContextReady = (
  persisted:
    | {
        activeRoleId: string
        activeTeamId: string
        activeSeasonId: string
      }
    | undefined,
  selected: {
    activeRoleId?: string
    activeTeamId?: string
    activeSeasonId?: string
  },
) =>
  !!persisted &&
  persisted.activeRoleId === selected.activeRoleId &&
  persisted.activeTeamId === selected.activeTeamId &&
  persisted.activeSeasonId === selected.activeSeasonId

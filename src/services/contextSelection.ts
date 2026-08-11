export const selectActiveId = (
  availableIds: string[],
  currentId?: string,
  preferredId?: string,
) => {
  if (currentId && availableIds.includes(currentId)) return currentId
  if (preferredId && availableIds.includes(preferredId)) return preferredId
  return availableIds[0]
}

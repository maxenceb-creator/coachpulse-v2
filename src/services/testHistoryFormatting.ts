export const formatSignedTestValue = (
  value: number | undefined,
  suffix = '',
) => {
  if (value === undefined) return '—'
  const normalized = Object.is(value, -0) || Math.abs(value) < 0.005 ? 0 : value
  return `${normalized > 0 ? '+' : ''}${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(normalized)}${suffix}`
}

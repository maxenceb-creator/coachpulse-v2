export type TestEvolutionChartPoint = {
  label: string
  value: number
}

export function TestEvolutionChart({
  points,
  benchmark,
  unit,
}: {
  points: TestEvolutionChartPoint[]
  benchmark?: number
  unit: string
}) {
  if (!points.length) return <p>Aucun historique à tracer.</p>
  const values = [...points.map(({ value }) => value)]
  if (benchmark !== undefined) values.push(benchmark)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const x = (index: number) =>
    points.length === 1 ? 50 : 8 + (index / (points.length - 1)) * 84
  const y = (value: number) => 88 - ((value - min) / range) * 72
  const polyline = points
    .map((point, index) => `${x(index)},${y(point.value)}`)
    .join(' ')
  return (
    <figure
      className="evolution-chart card"
      aria-label={`Évolution en ${unit}`}
    >
      <svg viewBox="0 0 100 100" role="img">
        {benchmark !== undefined ? (
          <line
            className="benchmark-line"
            x1="5"
            x2="95"
            y1={y(benchmark)}
            y2={y(benchmark)}
          />
        ) : null}
        <polyline className="evolution-line" points={polyline} />
        {points.map((point, index) => (
          <circle
            cx={x(index)}
            cy={y(point.value)}
            key={`${point.label}-${index}`}
            r="2.2"
          >
            <title>{`${point.label} : ${point.value} ${unit}`}</title>
          </circle>
        ))}
      </svg>
      <figcaption>
        {points.map(({ label }) => label).join(' · ')}
        {benchmark !== undefined ? ` — objectif ${benchmark} ${unit}` : ''}
      </figcaption>
    </figure>
  )
}

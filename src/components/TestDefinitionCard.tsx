import { useEffect } from 'react'
import type { TestDefinition } from '../types/domain'

const unitLabels: Record<TestDefinition['metrics'][number]['unit'], string> = {
  COUNT: 'répétitions',
  SECOND: 'secondes',
  METER: 'mètres',
  CENTIMETER: 'centimètres',
  KM_H: 'km/h',
}

export function TestDefinitionCard({
  definition,
  onCreate,
  canWriteTests,
  securityContextReady,
  isPending,
  disabledReason,
}: {
  definition: TestDefinition
  onCreate: () => void
  canWriteTests: boolean
  securityContextReady: boolean
  isPending: boolean
  disabledReason?: string
}) {
  useEffect(() => {
    if (!import.meta.env.DEV) return
    console.debug('[TestSession DEV] État bouton', {
      definitionId: definition.testDefinitionId,
      canWriteTests,
      securityContextReady,
      isPending,
      disabledReason: disabledReason ?? null,
    })
  }, [
    definition.testDefinitionId,
    canWriteTests,
    securityContextReady,
    isPending,
    disabledReason,
  ])

  return (
    <article className="card test-card">
      <div className="test-card-heading">
        <div>
          <p className="eyebrow">{definition.code}</p>
          <h3>{definition.name}</h3>
        </div>
        <span className="status">v{definition.version}</span>
      </div>
      {definition.description ? <p>{definition.description}</p> : null}
      <ul className="metric-list">
        {definition.metrics.map((metric) => (
          <li key={metric.metricKey}>
            <span>{metric.label}</span>
            <strong>{unitLabels[metric.unit]}</strong>
          </li>
        ))}
      </ul>
      <small>Statut : {definition.status}</small>
      <button
        disabled={disabledReason !== undefined}
        onClick={onCreate}
        title={disabledReason}
        type="button"
      >
        Nouvelle session
      </button>
    </article>
  )
}

import { Link } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { useAuth } from '../auth/AuthProvider'
import { useTestDefinitions } from '../hooks/useTestDefinitions'
import type { TestDefinition } from '../types/domain'

const unitLabels: Record<TestDefinition['metrics'][number]['unit'], string> = {
  COUNT: 'répétitions',
  SECOND: 'secondes',
  METER: 'mètres',
  CENTIMETER: 'centimètres',
  KM_H: 'km/h',
}

function DefinitionCard({ definition }: { definition: TestDefinition }) {
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
    </article>
  )
}

export function TestsPage() {
  const { user } = useAuth()
  const context = useApp()
  const definitions = useTestDefinitions({
    uid: user?.uid,
    roleId: context.activeRoleId,
    teamId: context.activeTeamId,
    seasonId: context.season?.seasonId,
    accesses: context.accesses,
    securityContextReady: context.securityContextReady,
  })

  if (context.loading || definitions.isLoading) {
    return <main className="center">Chargement des tests…</main>
  }
  if (context.error || definitions.isError) {
    return (
      <main className="center error">
        Impossible de charger les tests dans ce contexte.
      </main>
    )
  }

  const groups = [
    {
      domain: 'TECHNICAL' as const,
      title: 'Tests techniques',
    },
    {
      domain: 'PHYSICAL' as const,
      title: 'Tests athlétiques',
    },
  ]

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">COACHPULSE V2</p>
          <strong>Tests</strong>
        </div>
        <Link className="button-link secondary" to="/">
          Tableau de bord
        </Link>
      </header>
      <main className="dashboard">
        <h1>Protocoles de tests</h1>
        <p>Définitions accessibles dans votre contexte de travail actuel.</p>
        {groups.map(({ domain, title }) => {
          const items = (definitions.data ?? []).filter(
            (definition) => definition.domain === domain,
          )
          return (
            <section className="tests-domain" key={domain}>
              <h2>{title}</h2>
              {items.length ? (
                <div className="test-grid">
                  {items.map((definition) => (
                    <DefinitionCard
                      definition={definition}
                      key={definition.testDefinitionId}
                    />
                  ))}
                </div>
              ) : (
                <p className="card empty-state">Aucun protocole actif.</p>
              )}
            </section>
          )
        })}
      </main>
    </>
  )
}

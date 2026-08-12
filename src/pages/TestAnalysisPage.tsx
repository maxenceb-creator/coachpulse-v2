import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { useAuth } from '../auth/AuthProvider'
import { TestEvolutionChart } from '../components/TestEvolutionChart'
import { useTestDefinitions } from '../hooks/useTestDefinitions'
import type { TestHookContext } from '../hooks/useTestSession'
import { useTestsAnalysis } from '../hooks/useTestsAnalysis'

const trendLabel = {
  IMPROVED: 'Progression',
  STABLE: 'Stable',
  REGRESSED: 'Régression',
}

export function TestAnalysisPage() {
  const { testDefinitionId = '' } = useParams()
  const { user } = useAuth()
  const context = useApp()
  const [metricKey, setMetricKey] = useState('')
  const [playerId, setPlayerId] = useState('')
  const hookContext: TestHookContext = {
    uid: user?.uid ?? '',
    roleId: context.activeRoleId ?? '',
    teamId: context.activeTeamId ?? '',
    seasonId: context.season?.seasonId ?? '',
    accesses: context.accesses,
    securityContextReady: context.securityContextReady,
  }
  const definitions = useTestDefinitions({
    uid: user?.uid,
    roleId: context.activeRoleId,
    teamId: context.activeTeamId,
    seasonId: context.season?.seasonId,
    accesses: context.accesses,
    securityContextReady: context.securityContextReady,
  })
  const definition = definitions.data?.find(
    (item) => item.testDefinitionId === testDefinitionId,
  )
  useEffect(() => {
    if (
      definition &&
      !definition.metrics.some((item) => item.metricKey === metricKey)
    )
      setMetricKey(definition.metrics[0]?.metricKey ?? '')
  }, [definition, metricKey])
  const analysis = useTestsAnalysis(hookContext, {
    testDefinitionId,
    version: definition?.version ?? 0,
    metricKey,
  })

  if (context.loading || definitions.isLoading || analysis.isLoading)
    return <main className="center">Chargement de l’analyse…</main>
  if (context.error || definitions.isError || analysis.isError || !definition)
    return (
      <main className="center error">Impossible de charger cette analyse.</main>
    )
  const allHistories = analysis.data?.histories ?? []
  const histories = playerId
    ? allHistories.filter(({ player }) => player.playerId === playerId)
    : allHistories
  return (
    <>
      <header>
        <div>
          <p className="eyebrow">TESTS · ANALYSE</p>
          <strong>{definition.name}</strong>
        </div>
        <Link className="button-link secondary" to="/tests">
          Retour aux tests
        </Link>
      </header>
      <main className="dashboard">
        <h1>{definition.name}</h1>
        <p>Version {definition.version} · résultats terminés uniquement.</p>
        <section className="analysis-filters card">
          <label>
            Métrique
            <select
              value={metricKey}
              onChange={(event) => setMetricKey(event.target.value)}
            >
              {definition.metrics.map((metric) => (
                <option key={metric.metricKey} value={metric.metricKey}>
                  {metric.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Joueuse
            <select
              value={playerId}
              onChange={(event) => setPlayerId(event.target.value)}
            >
              <option value="">Toutes les joueuses</option>
              {allHistories.map(({ player }) => (
                <option key={player.playerId} value={player.playerId}>
                  {player.firstName} {player.lastName}
                </option>
              ))}
            </select>
          </label>
        </section>
        {!histories.length ? (
          <p className="card empty-state">Aucun résultat pour cette période.</p>
        ) : (
          <section className="analysis-grid">
            {histories.map((history) => (
              <article
                className="analysis-card card"
                key={history.player.playerId}
              >
                <h2>
                  {history.player.firstName} {history.player.lastName}
                </h2>
                <p>
                  {history.subCategory?.name ?? 'Sous-catégorie non résolue'}
                </p>
                <dl className="analysis-stats">
                  <div>
                    <dt>Dernier</dt>
                    <dd>{history.latest?.value ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Meilleur</dt>
                    <dd>{history.best?.value ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Moyenne</dt>
                    <dd>{history.average?.toFixed(2) ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Médiane</dt>
                    <dd>{history.median?.toFixed(2) ?? '—'}</dd>
                  </div>
                </dl>
                <p>
                  Tendance :{' '}
                  {history.progression?.trend
                    ? trendLabel[history.progression.trend]
                    : 'Données insuffisantes'}
                </p>
                <p>
                  Benchmark :{' '}
                  {history.benchmarkComparison
                    ? `${history.benchmarkComparison.status} (${history.benchmarkComparison.targetValue})`
                    : 'Non disponible'}
                </p>
                <TestEvolutionChart
                  benchmark={history.benchmark?.targetValue}
                  unit={analysis.data?.metric.unit ?? ''}
                  points={history.points.map((point) => ({
                    label: point.session.date.toLocaleDateString('fr-FR'),
                    value: point.value,
                  }))}
                />
              </article>
            ))}
          </section>
        )}
      </main>
    </>
  )
}

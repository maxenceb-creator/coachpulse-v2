import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { useAuth } from '../auth/AuthProvider'
import { TestEvolutionChart } from '../components/TestEvolutionChart'
import { useTestDefinitions } from '../hooks/useTestDefinitions'
import type { TestHookContext } from '../hooks/useTestSession'
import { useTestsAnalysis } from '../hooks/useTestsAnalysis'
import { isTestsAnalysisQueryEnabled } from '../hooks/useTestsAnalysis'
import {
  hasPermission,
  resolveEffectivePermissions,
} from '../services/permissionsService'
import {
  resolveTestAnalysisPageState,
  testAnalysisErrorMessage,
} from './testAnalysisPageState'

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
  const selectedMetricKey = definition?.metrics.some(
    (item) => item.metricKey === metricKey,
  )
    ? metricKey
    : (definition?.metrics[0]?.metricKey ?? '')
  const analysis = useTestsAnalysis(hookContext, {
    testDefinitionId,
    version: definition?.version ?? 0,
    metricKey: selectedMetricKey,
  })
  const canReadTests = hasPermission(context.accesses, {
    userId: hookContext.uid,
    activeRoleId: hookContext.roleId,
    teamId: hookContext.teamId,
    permissionKey: 'tests.read',
  })
  const analysisEnabled = isTestsAnalysisQueryEnabled(hookContext, {
    testDefinitionId,
    version: definition?.version ?? 0,
    metricKey: selectedMetricKey,
  })
  useEffect(() => {
    if (!import.meta.env.DEV) return
    console.debug('[TestAnalysis DEV] Route', { params: { testDefinitionId } })
    console.debug('[TestAnalysis DEV] Context', {
      uid: hookContext.uid,
      roleId: hookContext.roleId,
      teamId: hookContext.teamId,
      seasonId: hookContext.seasonId,
      securityContextReady: hookContext.securityContextReady,
      effectivePermissions: resolveEffectivePermissions(context.accesses, {
        userId: hookContext.uid,
        activeRoleId: hookContext.roleId,
        teamId: hookContext.teamId,
      }),
    })
  }, [
    testDefinitionId,
    hookContext.uid,
    hookContext.roleId,
    hookContext.teamId,
    hookContext.seasonId,
    hookContext.securityContextReady,
    context.accesses,
  ])

  const pageState = resolveTestAnalysisPageState({
    appLoading: context.loading,
    appError: context.error,
    securityContextReady: context.securityContextReady,
    canReadTests,
    testDefinitionId,
    definitionsPending: definitions.isPending,
    definitionsError: definitions.isError,
    definition,
    analysisEnabled,
    analysisPending: analysis.isPending,
    analysisFetching: analysis.fetchStatus === 'fetching',
    analysisError: analysis.isError,
    hasAnalysisData: !!analysis.data,
  })

  if (
    pageState === 'LOADING_CONTEXT' ||
    pageState === 'LOADING_DEFINITIONS' ||
    pageState === 'LOADING_ANALYSIS'
  )
    return <main className="center">Chargement de l’analyse…</main>
  if (pageState === 'UNAUTHORIZED')
    return (
      <main className="center error">
        Vous n’avez pas accès à cette analyse.
      </main>
    )
  if (pageState === 'NOT_FOUND')
    return <main className="center error">Protocole introuvable.</main>
  if (pageState === 'NO_METRICS')
    return (
      <main className="center error">
        Ce protocole ne contient aucune métrique analysable.
      </main>
    )
  if (pageState === 'ERROR' || !definition || !analysis.data)
    return (
      <main className="center error">
        {testAnalysisErrorMessage(analysis.error ?? definitions.error)}
      </main>
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
              value={selectedMetricKey}
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

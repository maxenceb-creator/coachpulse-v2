import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTestPlayerHistory } from '../hooks/useTestPlayerHistory'
import type { TestHookContext } from '../hooks/useTestSession'
import { formatSignedTestValue } from '../services/testHistoryFormatting'
import type { TestMetricDefinition } from '../types/domain'
import { TestEvolutionChart } from './TestEvolutionChart'

const formatMetric = (
  value: number | undefined,
  metric: TestMetricDefinition,
) =>
  value === undefined
    ? '—'
    : `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: metric.precision ?? 2 }).format(value)} ${metric.unit}`

export function PlayerTestsSection({
  context,
  playerId,
  authorized,
}: {
  context: TestHookContext
  playerId: string
  authorized: boolean
}) {
  const history = useTestPlayerHistory(context, playerId)
  const startedAt = useRef(performance.now())
  useEffect(() => {
    if (!import.meta.env.DEV || !authorized) return
    if (history.isPending)
      console.debug('[PlayerProfile PERF DEV]', {
        step: 'tests block start',
        playerId,
        teamId: context.teamId,
      })
    if (history.isSuccess || history.isError)
      console.debug('[PlayerProfile PERF DEV]', {
        step: 'tests block end',
        playerId,
        status: history.isSuccess ? 'success' : 'error',
        totalMs: performance.now() - startedAt.current,
      })
  }, [
    authorized,
    context.teamId,
    history.isError,
    history.isPending,
    history.isSuccess,
    playerId,
  ])
  if (!authorized) return null

  if (history.isPending)
    return (
      <section className="card player-domain-section" aria-live="polite">
        <h2>Tests</h2>
        <p>Chargement des tests…</p>
      </section>
    )
  if (history.isError)
    return (
      <section className="card player-domain-section">
        <h2>Tests</h2>
        <p className="error">Impossible de charger les tests.</p>
      </section>
    )

  const histories = history.data?.histories ?? []
  const metrics = histories.flatMap(({ definition, metrics: summaries }) =>
    summaries
      .filter(({ count }) => count > 0)
      .map((summary) => ({ definition, summary })),
  )
  const latest = metrics
    .flatMap(({ definition, summary }) =>
      summary.latest ? [{ definition, point: summary.latest }] : [],
    )
    .sort(
      (a, b) => b.point.session.date.getTime() - a.point.session.date.getTime(),
    )[0]

  return (
    <section className="card player-domain-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SUIVI INDIVIDUEL</p>
          <h2>Tests</h2>
        </div>
        <Link
          className="button-link secondary"
          to={`/tests/players/${playerId}`}
        >
          Voir tout l’historique des tests
        </Link>
      </div>
      {!metrics.length ? (
        <p className="empty-state">Aucun test enregistré sur cette saison.</p>
      ) : (
        <>
          <dl className="player-tests-summary">
            <div>
              <dt>Protocoles réalisés</dt>
              <dd>{histories.length}</dd>
            </div>
            <div>
              <dt>Mesures enregistrées</dt>
              <dd>
                {metrics.reduce(
                  (total, { summary }) => total + summary.count,
                  0,
                )}
              </dd>
            </div>
            <div>
              <dt>Dernier test</dt>
              <dd>
                {latest
                  ? `${latest.definition.name} · ${latest.point.session.date.toLocaleDateString('fr-FR')}`
                  : '—'}
              </dd>
            </div>
          </dl>
          {(['TECHNICAL', 'PHYSICAL'] as const).map((domain) => {
            const domainMetrics = metrics.filter(
              ({ definition }) => definition.domain === domain,
            )
            return domainMetrics.length ? (
              <div className="player-tests-domain" key={domain}>
                <h3>{domain === 'TECHNICAL' ? 'Technique' : 'Physique'}</h3>
                <div className="player-test-metrics">
                  {domainMetrics.map(({ definition, summary }) => (
                    <article
                      className="player-test-metric"
                      key={`${definition.testDefinitionId}-v${definition.version}-${summary.metric.metricKey}`}
                    >
                      <div>
                        <strong>{definition.name}</strong>{' '}
                        <small>v{definition.version}</small>
                        <p>{summary.metric.label}</p>
                      </div>
                      <dl className="metric-summary compact">
                        <div>
                          <dt>Dernière</dt>
                          <dd>
                            {formatMetric(
                              summary.latest?.value,
                              summary.metric,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>Meilleure</dt>
                          <dd>
                            {formatMetric(summary.best?.value, summary.metric)}
                          </dd>
                        </div>
                        <div>
                          <dt>Progression</dt>
                          <dd>
                            {formatSignedTestValue(
                              summary.evolution?.performanceRelativeChange,
                              ' %',
                            )}
                          </dd>
                        </div>
                      </dl>
                      <div className="benchmark-summary">
                        {summary.benchmarks.length ? (
                          summary.benchmarks.map(
                            ({ benchmark, comparison }) => (
                              <span
                                className="status"
                                key={benchmark.testBenchmarkId}
                              >
                                {benchmark.benchmarkLevel} :{' '}
                                {comparison?.reached === null
                                  ? 'non applicable'
                                  : comparison?.reached
                                    ? 'atteint'
                                    : 'non atteint'}
                              </span>
                            ),
                          )
                        ) : (
                          <span>Aucun benchmark défini</span>
                        )}
                      </div>
                      <TestEvolutionChart
                        benchmark={
                          summary.benchmarks.length === 1
                            ? summary.benchmarks[0].benchmark.targetValue
                            : undefined
                        }
                        points={summary.points.map(({ session, value }) => ({
                          label: session.date.toLocaleDateString('fr-FR'),
                          value,
                        }))}
                        unit={summary.metric.unit}
                      />
                    </article>
                  ))}
                </div>
              </div>
            ) : null
          })}
        </>
      )}
    </section>
  )
}

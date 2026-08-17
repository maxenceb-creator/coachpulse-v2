import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { useAuth } from '../auth/AuthProvider'
import { PlayerSelect } from '../components/PlayerSelect'
import { TestEvolutionChart } from '../components/TestEvolutionChart'
import {
  useTestPlayerHistory,
  useTestPlayerRoster,
} from '../hooks/useTestPlayerHistory'
import type { TestHookContext } from '../hooks/useTestSession'
import type { TestMetricDefinition } from '../types/domain'

const format = (value: number | undefined, metric: TestMetricDefinition) =>
  value === undefined
    ? '—'
    : `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value)} ${metric.unit}`

const signed = (value: number | undefined, suffix = '') =>
  value === undefined
    ? '—'
    : `${value > 0 ? '+' : ''}${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value)}${suffix}`

export function TestPlayerHistoryPage() {
  const { playerId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const app = useApp()
  const [domain, setDomain] = useState<'ALL' | 'TECHNICAL' | 'PHYSICAL'>('ALL')
  const [definitionId, setDefinitionId] = useState('ALL')
  const context: TestHookContext = {
    uid: user?.uid ?? '',
    roleId: app.activeRoleId ?? '',
    teamId: app.activeTeamId ?? '',
    seasonId: app.season?.seasonId ?? '',
    accesses: app.accesses,
    securityContextReady: app.securityContextReady,
  }
  const roster = useTestPlayerRoster(context)
  const history = useTestPlayerHistory(context, playerId)
  const activeTeam = app.teams.find(({ teamId }) => teamId === app.activeTeamId)
  const filtered = useMemo(
    () =>
      (history.data?.histories ?? []).filter(
        ({ definition }) =>
          (domain === 'ALL' || definition.domain === domain) &&
          (definitionId === 'ALL' ||
            definition.testDefinitionId === definitionId),
      ),
    [history.data, domain, definitionId],
  )

  if (app.loading || !app.securityContextReady || roster.isPending)
    return <main className="center">Chargement de l’historique…</main>
  if (app.error || roster.isError)
    return (
      <main className="center error">
        Impossible de charger l’historique de cette joueuse.
      </main>
    )

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">COACHPULSE V2</p>
          <strong>Historique individuel des tests</strong>
        </div>
        <Link className="button-link secondary" to="/tests">
          Tests
        </Link>
      </header>
      <main className="dashboard">
        <section className="card history-filters">
          <PlayerSelect
            players={roster.data ?? []}
            value={playerId}
            onChange={(id) =>
              navigate(id ? `/tests/players/${id}` : '/tests/players')
            }
          />
          <label>
            Type
            <select
              value={domain}
              onChange={(event) =>
                setDomain(event.target.value as typeof domain)
              }
            >
              <option value="ALL">Tous</option>
              <option value="TECHNICAL">Technique</option>
              <option value="PHYSICAL">Physique</option>
            </select>
          </label>
          <label>
            Protocole
            <select
              value={definitionId}
              onChange={(event) => setDefinitionId(event.target.value)}
            >
              <option value="ALL">Tous les protocoles</option>
              {(history.data?.histories ?? []).map(({ definition }) => (
                <option
                  key={definition.testDefinitionId}
                  value={definition.testDefinitionId}
                >
                  {definition.name} — v{definition.version}
                </option>
              ))}
            </select>
          </label>
        </section>
        {!playerId ? (
          <p className="card empty-state">
            Sélectionnez une joueuse pour consulter son historique.
          </p>
        ) : null}
        {playerId && history.isPending ? (
          <section className="card" aria-live="polite">
            <h1>
              {roster.data?.find((player) => player.playerId === playerId)
                ?.firstName ?? 'Joueuse'}{' '}
              {roster.data?.find((player) => player.playerId === playerId)
                ?.lastName ?? ''}
            </h1>
            <p>Chargement des résultats…</p>
          </section>
        ) : null}
        {history.isError ? (
          <p className="card error">
            Impossible de charger l’historique de cette joueuse.
          </p>
        ) : null}
        {history.data ? (
          <>
            <section className="card">
              <h1>
                {history.data.player.firstName} {history.data.player.lastName}
              </h1>
              <p>
                {activeTeam?.name ?? 'Équipe'}
                {history.data.subCategory
                  ? ` · ${history.data.subCategory.name}`
                  : ''}{' '}
                · {app.season?.name}
              </p>
            </section>
            {!filtered.length ? (
              <p className="card empty-state">
                Aucun test enregistré pour cette joueuse sur cette saison.
              </p>
            ) : null}
            {filtered.map(({ definition, metrics }) => (
              <section
                className="tests-domain"
                key={definition.testDefinitionId}
              >
                <h2>
                  {definition.name} <small>v{definition.version}</small>
                </h2>
                <p>
                  {definition.domain === 'TECHNICAL' ? 'Technique' : 'Physique'}
                </p>
                {metrics
                  .filter(({ count }) => count > 0)
                  .map((summary) => (
                    <article
                      className="card metric-history"
                      key={summary.metric.metricKey}
                    >
                      <h3>{summary.metric.label}</h3>
                      <dl className="metric-summary">
                        <div>
                          <dt>Première</dt>
                          <dd>
                            {format(summary.first?.value, summary.metric)}
                          </dd>
                        </div>
                        <div>
                          <dt>Dernière</dt>
                          <dd>
                            {format(summary.latest?.value, summary.metric)}
                          </dd>
                        </div>
                        <div>
                          <dt>Meilleure</dt>
                          <dd>{format(summary.best?.value, summary.metric)}</dd>
                        </div>
                        <div>
                          <dt>Évolution</dt>
                          <dd>
                            {signed(
                              summary.evolution?.delta,
                              ` ${summary.metric.unit}`,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>Progression</dt>
                          <dd>
                            {signed(summary.evolution?.relativeChange, ' %')}
                          </dd>
                        </div>
                        <div>
                          <dt>Moyenne</dt>
                          <dd>{format(summary.average, summary.metric)}</dd>
                        </div>
                        <div>
                          <dt>Mesures</dt>
                          <dd>{summary.count}</dd>
                        </div>
                      </dl>
                      {summary.benchmark ? (
                        <p>
                          Objectif {summary.benchmark.benchmarkLevel} :{' '}
                          {format(
                            summary.benchmark.targetValue,
                            summary.metric,
                          )}
                          {summary.benchmarkComparison?.directionalDelta !==
                          undefined
                            ? ` · ${signed(summary.benchmarkComparison.directionalDelta, ` ${summary.metric.unit}`)}`
                            : ''}
                        </p>
                      ) : (
                        <p>Aucun benchmark disponible.</p>
                      )}
                      <TestEvolutionChart
                        benchmark={summary.benchmark?.targetValue}
                        points={summary.points.map(({ session, value }) => ({
                          label: session.date.toLocaleDateString('fr-FR'),
                          value,
                        }))}
                        unit={summary.metric.unit}
                      />
                      <ul className="history-list">
                        {[...summary.points]
                          .reverse()
                          .map(({ session, value, result }) => (
                            <li key={result.testResultId}>
                              {session.date.toLocaleDateString('fr-FR')} —{' '}
                              {format(value, summary.metric)}
                            </li>
                          ))}
                      </ul>
                    </article>
                  ))}
              </section>
            ))}
          </>
        ) : null}
      </main>
    </>
  )
}

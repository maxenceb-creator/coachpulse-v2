import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { useAuth } from '../auth/AuthProvider'
import {
  useSaveTestResults,
  useTestSession,
  type TestHookContext,
} from '../hooks/useTestSession'
import { metricColumns } from '../services/testEntryColumns'
import { resolveTestSessionPageState } from './testSessionPageState'
import { hasPermission } from '../services/permissionsService'

export function TestSessionPage() {
  const { testSessionId = '' } = useParams()
  const { user } = useAuth()
  const app = useApp()
  const context: TestHookContext = {
    uid: user?.uid ?? '',
    roleId: app.activeRoleId ?? '',
    teamId: app.activeTeamId ?? '',
    seasonId: app.season?.seasonId ?? '',
    accesses: app.accesses,
    securityContextReady: app.securityContextReady,
  }
  const data = useTestSession(context, testSessionId)
  const save = useSaveTestResults(context)
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>(
    {},
  )
  const canReadTests = hasPermission(app.accesses, {
    userId: context.uid,
    activeRoleId: context.roleId,
    teamId: context.teamId,
    permissionKey: 'tests.read',
  })

  useEffect(() => {
    if (!data.results.data) return
    setDrafts(
      Object.fromEntries(
        data.results.data.map((result) => [
          result.playerId,
          Object.fromEntries(
            Object.entries(result.values).map(([key, value]) => [
              key,
              String(value),
            ]),
          ),
        ]),
      ),
    )
  }, [data.results.data])

  if (!app.loading && app.securityContextReady && !canReadTests)
    return (
      <main className="center error">
        Vous n’avez pas accès à cette session de test.
      </main>
    )

  const pageState = resolveTestSessionPageState({
    appError: app.error,
    appLoading: app.loading,
    session: data.session,
    definition: data.definition,
    players: data.players,
    results: data.results,
  })
  if (pageState.status === 'loading')
    return <main className="center">Chargement de la session…</main>
  if (pageState.status === 'error')
    return <main className="center error">{pageState.message}</main>

  const { session, definition, players } = pageState
  const columns = metricColumns(definition)
  const editable = session.status === 'DRAFT'
  const submit = (complete: boolean) => {
    save.mutate({
      session,
      definition,
      players,
      complete,
      drafts: players.map((player) => ({
        playerId: player.playerId,
        values: Object.fromEntries(
          columns.map(({ key }) => {
            const raw = drafts[player.playerId]?.[key]
            return [
              key,
              raw === undefined || raw === '' ? undefined : Number(raw),
            ]
          }),
        ),
      })),
    })
  }

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">SESSION DE TEST</p>
          <strong>
            {definition.name} · v{definition.version}
          </strong>
        </div>
        <Link className="button-link secondary" to="/tests">
          Retour aux tests
        </Link>
      </header>
      <main className="dashboard">
        <h1>{definition.name}</h1>
        <p>
          {session.date.toLocaleDateString('fr-FR')} · {session.status} ·{' '}
          {app.teams.find(({ teamId }) => teamId === session.teamId)?.name}
        </p>
        <div className="entry-table-wrap card">
          <table className="entry-table">
            <thead>
              <tr>
                <th>Joueuse</th>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.playerId}>
                  <th>
                    {player.firstName} {player.lastName}
                  </th>
                  {columns.map((column) => (
                    <td key={column.key}>
                      <input
                        aria-label={`${player.firstName} ${column.label}`}
                        disabled={!editable}
                        inputMode="decimal"
                        min={
                          definition.metrics.find(
                            (m) => m.metricKey === column.key,
                          )?.minValue
                        }
                        max={
                          definition.metrics.find(
                            (m) => m.metricKey === column.key,
                          )?.maxValue
                        }
                        step={
                          10 **
                          -(
                            definition.metrics.find(
                              (m) => m.metricKey === column.key,
                            )?.precision ?? 0
                          )
                        }
                        type="number"
                        value={drafts[player.playerId]?.[column.key] ?? ''}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [player.playerId]: {
                              ...current[player.playerId],
                              [column.key]: event.target.value,
                            },
                          }))
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {save.isError ? (
          <p className="error">Valeurs invalides ou sauvegarde refusée.</p>
        ) : null}
        {save.isSuccess ? <p>Résultats sauvegardés.</p> : null}
        {editable ? (
          <div className="entry-actions">
            <button disabled={save.isPending} onClick={() => submit(false)}>
              Sauvegarder
            </button>
            <button
              className="secondary"
              disabled={save.isPending}
              onClick={() => submit(true)}
            >
              Finaliser
            </button>
          </div>
        ) : null}
      </main>
    </>
  )
}

import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { useAuth } from '../auth/AuthProvider'
import { useTestDefinitions } from '../hooks/useTestDefinitions'
import { useState } from 'react'
import {
  useCreateTestSession,
  useDeleteTestSession,
  useTestSessions,
  type TestHookContext,
} from '../hooks/useTestSession'
import { TestDefinitionCard } from '../components/TestDefinitionCard'
import { hasPermission } from '../services/permissionsService'
import { TestSessionCard } from '../components/TestSessionCard'

export function TestsPage() {
  const { user } = useAuth()
  const context = useApp()
  const navigate = useNavigate()
  const [sessionDate, setSessionDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  )
  const hookContext: TestHookContext = {
    uid: user?.uid ?? '',
    roleId: context.activeRoleId ?? '',
    teamId: context.activeTeamId ?? '',
    seasonId: context.season?.seasonId ?? '',
    accesses: context.accesses,
    securityContextReady: context.securityContextReady,
  }
  const sessions = useTestSessions(hookContext)
  const createSession = useCreateTestSession(hookContext)
  const deleteSession = useDeleteTestSession(hookContext)
  const activeTeam = context.teams.find(
    ({ teamId }) => teamId === context.activeTeamId,
  )
  const canWriteTests = hasPermission(context.accesses, {
    userId: user?.uid ?? '',
    activeRoleId: context.activeRoleId ?? '',
    teamId: context.activeTeamId ?? '',
    permissionKey: 'tests.write',
  })
  const canReadTests = hasPermission(context.accesses, {
    userId: user?.uid ?? '',
    activeRoleId: context.activeRoleId ?? '',
    teamId: context.activeTeamId ?? '',
    permissionKey: 'tests.read',
  })
  const canManageTests = hasPermission(context.accesses, {
    userId: user?.uid ?? '',
    activeRoleId: context.activeRoleId ?? '',
    teamId: context.activeTeamId ?? '',
    permissionKey: 'tests.manage',
  })
  const creationDisabledReason = !context.securityContextReady
    ? 'Contexte de sécurité non prêt'
    : !canWriteTests
      ? 'Permission tests.write absente'
      : !activeTeam?.categoryId
        ? 'Category de la Team active absente'
        : !sessionDate
          ? 'Date de session absente'
          : createSession.isPending
            ? 'Création en cours'
            : undefined
  const definitions = useTestDefinitions({
    uid: user?.uid,
    roleId: context.activeRoleId,
    teamId: context.activeTeamId,
    seasonId: context.season?.seasonId,
    accesses: context.accesses,
    securityContextReady: context.securityContextReady,
  })

  if (context.loading || !context.securityContextReady) {
    return <main className="center">Chargement des tests…</main>
  }
  if (!canReadTests)
    return (
      <main className="center error">
        Vous n’avez pas accès aux tests dans ce contexte.
      </main>
    )
  if (definitions.isPending || sessions.isPending)
    return <main className="center">Chargement des tests…</main>
  if (context.error || definitions.isError || sessions.isError) {
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
        {canManageTests ? (
          <Link className="button-link secondary" to="/tests/admin">
            Administrer le catalogue
          </Link>
        ) : null}
        <Link className="button-link secondary" to="/tests/players">
          Historique par joueuse
        </Link>
        <label className="session-date card">
          Date de la nouvelle session
          <input
            type="date"
            value={sessionDate}
            onChange={(event) => setSessionDate(event.target.value)}
          />
        </label>
        <section className="tests-domain">
          <h2>Sessions récentes</h2>
          {deleteSession.isSuccess ? <p>Session supprimée.</p> : null}
          {deleteSession.isError ? (
            <p className="error">Impossible de supprimer la session.</p>
          ) : null}
          {sessions.data?.length ? (
            <div className="session-list">
              {sessions.data.map((session) => {
                const definitionName = definitions.data?.find(
                  ({ testDefinitionId, version }) =>
                    testDefinitionId === session.testDefinitionId &&
                    version === session.testDefinitionVersion,
                )?.name
                return (
                  <TestSessionCard
                    canDelete={canWriteTests}
                    definitionName={definitionName ?? 'Protocole introuvable'}
                    deleting={
                      deleteSession.isPending &&
                      deleteSession.variables === session.testSessionId
                    }
                    key={session.testSessionId}
                    session={session}
                    onDelete={(testSessionId) => {
                      if (!canWriteTests || deleteSession.isPending) return
                      deleteSession.mutate(testSessionId)
                    }}
                  />
                )
              })}
            </div>
          ) : (
            <p className="card empty-state">Aucune session dans ce contexte.</p>
          )}
        </section>
        {createSession.isError ? (
          <p className="error">Impossible de créer la session de test.</p>
        ) : null}
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
                    <TestDefinitionCard
                      canWriteTests={canWriteTests}
                      definition={definition}
                      disabledReason={creationDisabledReason}
                      key={definition.testDefinitionId}
                      isPending={createSession.isPending}
                      securityContextReady={context.securityContextReady}
                      onCreate={() => {
                        if (import.meta.env.DEV) {
                          console.debug(
                            '[TestSession DEV] Nouvelle session demandée',
                            {
                              definitionId: definition.testDefinitionId,
                              roleId: hookContext.roleId,
                              teamId: hookContext.teamId,
                              seasonId: hookContext.seasonId,
                              date: sessionDate,
                            },
                          )
                        }
                        if (!activeTeam?.categoryId || creationDisabledReason)
                          return
                        createSession.mutate(
                          {
                            testDefinitionId: definition.testDefinitionId,
                            testDefinitionVersion: definition.version,
                            categoryId: activeTeam.categoryId,
                            date: new Date(`${sessionDate}T12:00:00`),
                          },
                          {
                            onSuccess: (session) =>
                              navigate(
                                `/tests/sessions/${session.testSessionId}`,
                              ),
                          },
                        )
                      }}
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

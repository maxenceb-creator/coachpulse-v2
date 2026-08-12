import { useAuth } from '../auth/AuthProvider'
import { useApp } from '../app/AppContext'
import { usePlayerCount } from '../hooks/usePlayerCount'
export function DashboardPage() {
  const { user, logout } = useAuth(),
    c = useApp(),
    count = usePlayerCount(
      user?.uid,
      c.activeTeamId,
      c.season?.seasonId,
      c.activeRoleId,
      c.securityContextReady,
    )
  if (c.loading)
    return <main className="center">Chargement de votre espace…</main>
  if (c.error)
    return (
      <main className="center error">Impossible de charger votre espace.</main>
    )
  if (!c.profile)
    return <main className="center error">Aucun profil applicatif actif.</main>
  const role = c.roles.find((r) => r.roleId === c.activeRoleId),
    team = c.teams.find((t) => t.teamId === c.activeTeamId)
  return (
    <>
      <header>
        <div>
          <p className="eyebrow">COACHPULSE V2</p>
          <strong>Tableau de bord</strong>
        </div>
        <button className="secondary" onClick={() => void logout()}>
          Déconnexion
        </button>
      </header>
      <main className="dashboard">
        <h1>Bonjour {c.profile.firstName}</h1>
        <p>Votre contexte de travail actuel.</p>
        <section className="controls card">
          <label>
            Rôle actif
            <select
              value={c.activeRoleId ?? ''}
              onChange={(e) => c.setRole(e.target.value)}
            >
              {c.roles.map((r) => (
                <option key={r.roleId} value={r.roleId}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Équipe active
            <select
              value={c.activeTeamId ?? ''}
              onChange={(e) => c.setTeam(e.target.value)}
              disabled={!c.teams.length}
            >
              {c.teams.length ? (
                c.teams.map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.name}
                  </option>
                ))
              ) : (
                <option>Aucune équipe accessible</option>
              )}
            </select>
          </label>
        </section>
        <section className="stats">
          {[
            ['Rôle actif', role?.label],
            ['Équipe active', team?.name],
            ['Saison active', c.season?.name],
            [
              'Joueuses accessibles',
              count.isLoading
                ? '…'
                : count.isError
                  ? 'Erreur de chargement'
                  : String(count.data ?? 0),
            ],
          ].map(([a, b]) => (
            <article className="card" key={a}>
              <span>{a}</span>
              <strong>{b ?? '—'}</strong>
            </article>
          ))}
        </section>
      </main>
    </>
  )
}

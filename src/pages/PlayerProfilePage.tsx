import { Link, useParams } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { useAuth } from '../auth/AuthProvider'
import { PlayerProfileHeader } from '../components/PlayerProfileHeader'
import { PlayerAttendanceSection } from '../components/PlayerAttendanceSection'
import { PlayerTestsSection } from '../components/PlayerTestsSection'
import {
  usePlayerProfile,
  usePlayerProfileTaxonomy,
} from '../hooks/usePlayerProfile'
import type { TestHookContext } from '../hooks/useTestSession'
import { hasPermission } from '../services/permissionsService'
import { PlayerProfileError } from '../services/playersService'

export function PlayerProfilePage() {
  const { playerId = '' } = useParams()
  const { user } = useAuth()
  const app = useApp()
  const team = app.teams.find(({ teamId }) => teamId === app.activeTeamId)
  const context = {
    userId: user?.uid ?? '',
    activeRoleId: app.activeRoleId ?? '',
    teamId: app.activeTeamId ?? '',
    seasonId: app.season?.seasonId ?? '',
    accesses: app.accesses,
    categoryId: team?.categoryId,
    securityContextReady: app.securityContextReady,
  }
  const profile = usePlayerProfile(context, playerId)
  const taxonomy = usePlayerProfileTaxonomy(
    context,
    profile.data?.player.birthDate.getUTCFullYear(),
  )
  const testsContext: TestHookContext = {
    uid: context.userId,
    roleId: context.activeRoleId,
    teamId: context.teamId,
    seasonId: context.seasonId,
    accesses: context.accesses,
    securityContextReady: context.securityContextReady,
  }
  const canReadTests = hasPermission(app.accesses, {
    userId: context.userId,
    activeRoleId: context.activeRoleId,
    teamId: context.teamId,
    permissionKey: 'tests.read',
  })
  const canReadAttendance = hasPermission(app.accesses, {
    userId: context.userId,
    activeRoleId: context.activeRoleId,
    teamId: context.teamId,
    permissionKey: 'attendance.read',
  })
  if (!playerId)
    return <main className="center error">Identifiant joueuse invalide.</main>
  if (app.error)
    return (
      <main className="center error">Impossible de charger votre espace.</main>
    )
  if (app.loading || !app.securityContextReady || profile.isPending)
    return <main className="center">Chargement de la fiche joueuse…</main>
  if (profile.isError) {
    const denied =
      profile.error instanceof PlayerProfileError &&
      ['PERMISSION_DENIED', 'PLAYER_OUT_OF_SCOPE'].includes(profile.error.code)
    return (
      <main className="center error">
        {denied
          ? 'Cette joueuse n’est pas accessible dans le contexte actif.'
          : 'Impossible de charger la fiche joueuse.'}
      </main>
    )
  }
  if (!profile.data)
    return <main className="center error">Joueuse introuvable.</main>

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">COACHPULSE V2</p>
          <strong>Fiche individuelle</strong>
        </div>
        <Link className="button-link secondary" to="/">
          Tableau de bord
        </Link>
      </header>
      <main className="dashboard player-profile">
        <PlayerProfileHeader
          player={profile.data.player}
          team={team}
          category={taxonomy.data?.category}
          subCategory={taxonomy.data?.subCategory}
        />
        {taxonomy.isPending ? (
          <p className="profile-taxonomy-status">
            Chargement du contexte sportif…
          </p>
        ) : null}
        {taxonomy.isError ? (
          <p className="profile-taxonomy-status error">
            Impossible de charger la catégorie de cette joueuse.
          </p>
        ) : null}
        <PlayerTestsSection
          context={testsContext}
          playerId={playerId}
          authorized={canReadTests}
          player={profile.data.player}
          taxonomy={taxonomy.data}
        />
        {canReadAttendance ? (
          <PlayerAttendanceSection
            context={context}
            playerId={playerId}
            authorized
          />
        ) : null}
      </main>
    </>
  )
}

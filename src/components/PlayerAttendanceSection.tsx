import { usePlayerAttendance } from '../hooks/usePlayerAttendance'
import type { PlayerAttendanceHookContext } from '../hooks/usePlayerAttendance'
import { attendanceStatusLabels } from '../services/playerAttendanceService'

const percent = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

export function PlayerAttendanceSection({
  context,
  playerId,
  authorized,
}: {
  context: PlayerAttendanceHookContext
  playerId: string
  authorized: boolean
}) {
  const summary = usePlayerAttendance(context, playerId)
  if (!authorized) return null
  if (summary.isPending)
    return (
      <section className="card player-domain-section" aria-live="polite">
        <h2>Présences</h2>
        <p>Chargement des présences…</p>
      </section>
    )
  if (summary.isError)
    return (
      <section className="card player-domain-section">
        <h2>Présences</h2>
        <p className="error">Impossible de charger les présences.</p>
      </section>
    )
  if (!summary.data?.sessionsConcerned)
    return (
      <section className="card player-domain-section">
        <p className="eyebrow">SUIVI INDIVIDUEL</p>
        <h2>Présences</h2>
        <p className="empty-state">
          Aucune donnée de présence sur cette saison.
        </p>
      </section>
    )

  const data = summary.data
  return (
    <section className="card player-domain-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SUIVI INDIVIDUEL</p>
          <h2>Présences</h2>
        </div>
      </div>
      <dl className="player-attendance-summary">
        <div>
          <dt>Séances concernées</dt>
          <dd>{data.sessionsConcerned}</dd>
        </div>
        <div>
          <dt>Présences</dt>
          <dd>{data.present}</dd>
        </div>
        <div>
          <dt>Absences</dt>
          <dd>{data.absent}</dd>
        </div>
        <div>
          <dt>Retards</dt>
          <dd>{data.late}</dd>
        </div>
        <div>
          <dt>Taux de présence</dt>
          <dd>
            {data.attendanceRate === null
              ? '—'
              : `${percent.format(data.attendanceRate)} %`}
          </dd>
        </div>
      </dl>
      <div className="attendance-details">
        <span>Justifiées : {data.justifiedAbsences}</span>
        <span>Non justifiées : {data.unjustifiedAbsences}</span>
        {data.missing ? <span>Non renseignées : {data.missing}</span> : null}
      </div>
      {data.recentEvents.length ? (
        <div className="attendance-history">
          <h3>Dernières présences</h3>
          <ul>
            {data.recentEvents.map(({ session, attendance }) => (
              <li key={attendance.attendanceId}>
                <time dateTime={session.startDateTime.toISOString()}>
                  {session.startDateTime.toLocaleDateString('fr-FR')}
                </time>
                <strong>{attendanceStatusLabels[attendance.status]}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

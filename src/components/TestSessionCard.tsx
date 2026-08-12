import { Link } from 'react-router-dom'
import type { TestSession } from '../types/domain'

export const deleteConfirmation = (status: TestSession['status']) =>
  status === 'COMPLETED'
    ? 'Cette session est terminée et contient potentiellement des résultats. La suppression est définitive. Confirmer ?'
    : 'Supprimer cette session ?'

type Props = {
  definitionName: string
  canDelete: boolean
  deleting: boolean
  session: TestSession
  onDelete: (testSessionId: string) => void
}

export function TestSessionCard({
  definitionName,
  canDelete,
  deleting,
  session,
  onDelete,
}: Props) {
  return (
    <article className="card test-session-card">
      <Link to={`/tests/sessions/${session.testSessionId}`}>
        <strong>{definitionName}</strong>
        <span>{session.date.toLocaleDateString('fr-FR')}</span>
        <span>{session.status}</span>
      </Link>
      <button
        className="danger secondary"
        disabled={!canDelete || deleting}
        type="button"
        onClick={() => {
          if (window.confirm(deleteConfirmation(session.status))) {
            onDelete(session.testSessionId)
          }
        }}
      >
        {deleting ? 'Suppression…' : 'Supprimer'}
      </button>
    </article>
  )
}

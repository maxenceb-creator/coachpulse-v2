import { useEffect } from 'react'
import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom'

export function TestsRouteErrorBoundary() {
  const error = useRouteError()
  useEffect(() => {
    if (import.meta.env.DEV)
      console.error('[Tests DEV] Erreur de route non interceptée', error)
  }, [error])
  const message = isRouteErrorResponse(error)
    ? `Erreur ${error.status}`
    : 'Une erreur est survenue dans le domaine Tests.'
  return (
    <main className="center error">
      <p>{message}</p>
      <Link to="/tests">Retour aux tests</Link>
    </main>
  )
}

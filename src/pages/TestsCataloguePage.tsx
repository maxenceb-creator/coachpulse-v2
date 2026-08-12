import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { useAuth } from '../auth/AuthProvider'
import {
  useTestsCatalogue,
  useTestsCatalogueMutations,
} from '../hooks/useTestsCatalogue'
import { canManageTests } from '../services/testsCatalogueService'

export function TestsCataloguePage() {
  const { user } = useAuth()
  const app = useApp()
  const navigate = useNavigate()
  const team = app.teams.find(({ teamId }) => teamId === app.activeTeamId)
  const context = {
    userId: user?.uid ?? '',
    activeRoleId: app.activeRoleId ?? '',
    teamId: app.activeTeamId ?? '',
    seasonId: app.season?.seasonId ?? '',
    categoryId: team?.categoryId ?? '',
    accesses: app.accesses,
    securityContextReady: app.securityContextReady && !!team?.categoryId,
  }
  const allowed = canManageTests(app.accesses, context)
  const catalogue = useTestsCatalogue(context)
  const mutations = useTestsCatalogueMutations(context)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [domain, setDomain] = useState<'TECHNICAL' | 'PHYSICAL'>('TECHNICAL')

  if (app.loading) return <main className="center">Chargement…</main>
  if (!allowed)
    return (
      <main className="center error">Permission tests.manage requise.</main>
    )
  if (catalogue.isLoading)
    return <main className="center">Chargement du catalogue…</main>
  if (catalogue.isError)
    return (
      <main className="center error">Impossible de charger le catalogue.</main>
    )

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">TESTS · ADMINISTRATION</p>
          <strong>Catalogue de tests</strong>
        </div>
        <Link className="button-link secondary" to="/tests">
          Retour aux tests
        </Link>
      </header>
      <main className="dashboard">
        <h1>Catalogue de tests</h1>
        <form
          className="card admin-form"
          onSubmit={(event) => {
            event.preventDefault()
            mutations.create.mutate(
              { name, code, domain, metrics: [] },
              {
                onSuccess: (definition) =>
                  navigate(`/tests/admin/${definition.testDefinitionId}`),
              },
            )
          }}
        >
          <h2>Nouveau protocole</h2>
          <label>
            Nom
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Code
            <input
              required
              pattern="[A-Z][A-Z0-9_]*"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </label>
          <label>
            Type
            <select
              value={domain}
              onChange={(event) =>
                setDomain(event.target.value as typeof domain)
              }
            >
              <option value="TECHNICAL">Technique</option>
              <option value="PHYSICAL">Physique</option>
            </select>
          </label>
          <button disabled={mutations.create.isPending}>
            Créer en brouillon
          </button>
          {mutations.create.isError ? (
            <p className="error">
              Création impossible. Vérifiez le code et son unicité.
            </p>
          ) : null}
        </form>
        <section className="tests-domain">
          <h2>Protocoles</h2>
          {catalogue.data?.length ? (
            <div className="admin-table-wrap card">
              <table className="entry-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Type</th>
                    <th>Version</th>
                    <th>Statut</th>
                    <th>Métriques</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogue.data.map((definition) => (
                    <tr key={definition.testDefinitionId}>
                      <td>{definition.name}</td>
                      <td>{definition.domain}</td>
                      <td>v{definition.version}</td>
                      <td>{definition.status}</td>
                      <td>{definition.metrics.length}</td>
                      <td>
                        <Link
                          to={`/tests/admin/${definition.testDefinitionId}`}
                        >
                          Voir / gérer
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="card empty-state">Aucun protocole.</p>
          )}
        </section>
      </main>
    </>
  )
}

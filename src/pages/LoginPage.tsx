import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
export function LoginPage() {
  const { user, login } = useAuth()
  const [e, setE] = useState(''),
    [p, setP] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  if (user) return <Navigate to="/" replace />
  const submit = async (x: FormEvent) => {
    x.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(e, p)
    } catch {
      setError('Connexion impossible. Vérifiez vos identifiants.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="login">
      <section className="card loginCard">
        <p className="eyebrow">COACHPULSE V2</p>
        <h1>Bienvenue</h1>
        <p>Connectez-vous à votre espace staff.</p>
        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={e}
              onChange={(x) => setE(x.target.value)}
              required
            />
          </label>
          <label>
            Mot de passe
            <input
              type="password"
              value={p}
              onChange={(x) => setP(x.target.value)}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button disabled={busy}>
            {busy ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </section>
    </main>
  )
}

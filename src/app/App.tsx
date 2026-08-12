import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
} from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { LoginPage } from '../pages/LoginPage'
import { DashboardPage } from '../pages/DashboardPage'
import { TestsPage } from '../pages/TestsPage'
import { AppContext } from './AppContext'
function Guard() {
  const { user, loading } = useAuth()
  if (loading)
    return <main className="center">Restauration de la session…</main>
  return user ? (
    <AppContext>
      <Outlet />
    </AppContext>
  ) : (
    <Navigate to="/login" replace />
  )
}
const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <Guard />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/tests', element: <TestsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
export const App = () => <RouterProvider router={router} />

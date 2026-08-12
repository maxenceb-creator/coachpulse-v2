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
import { TestSessionPage } from '../pages/TestSessionPage'
import { TestAnalysisPage } from '../pages/TestAnalysisPage'
import { AppContext } from './AppContext'
import { TestsCataloguePage } from '../pages/TestsCataloguePage'
import { TestDefinitionAdminPage } from '../pages/TestDefinitionAdminPage'
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
      { path: '/tests/admin', element: <TestsCataloguePage /> },
      {
        path: '/tests/admin/:testDefinitionId',
        element: <TestDefinitionAdminPage />,
      },
      {
        path: '/tests/definitions/:testDefinitionId/analysis',
        element: <TestAnalysisPage />,
      },
      {
        path: '/tests/sessions/:testSessionId',
        element: <TestSessionPage />,
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
export const App = () => <RouterProvider router={router} />

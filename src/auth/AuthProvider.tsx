import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { useQueryClient } from '@tanstack/react-query'
import { auth } from '../config/firebase'
import {
  clearLocalUserContext,
  clearPrivateQueries,
} from '../query/cacheLifecycle'
const C = createContext<{
  user: User | null
  loading: boolean
  login: (e: string, p: string) => Promise<void>
  logout: () => Promise<void>
} | null>(null)
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true)
  const previousUid = useRef<string | undefined>(undefined)
  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        const nextUid = u?.uid
        if (previousUid.current && previousUid.current !== nextUid) {
          setLoading(true)
          await clearPrivateQueries(queryClient)
          clearLocalUserContext(window.localStorage)
        }
        previousUid.current = nextUid
        setUser(u)
        setLoading(false)
      }),
    [queryClient],
  )
  return (
    <C.Provider
      value={{
        user,
        loading,
        login: async (e, p) => {
          await signInWithEmailAndPassword(auth, e, p)
        },
        logout: async () => {
          await signOut(auth)
          await clearPrivateQueries(queryClient)
          clearLocalUserContext(window.localStorage)
        },
      }}
    >
      {children}
    </C.Provider>
  )
}
export const useAuth = () => {
  const x = useContext(C)
  if (!x) throw Error('AuthProvider manquant')
  return x
}

import { createContext, useState, ReactNode, useEffect } from 'react'
import { jwtDecode } from 'jwt-decode'
import { jwtDecode as jwtDecodeFn } from 'jwt-decode' // same

interface User {
  id: string
  email: string
  role: string
  // add other fields as needed
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token')
  })
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token) as User
        setUser(decoded)
      } catch {
        setUser(null)
        localStorage.removeItem('token')
      }
    }
  }, [token])

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken)
    setToken(newToken)
    try {
      const decoded = jwtDecode(newToken) as User
      setUser(decoded)
    } catch {
      setUser(null)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useSession = () => {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useSession must be used within AuthProvider')
  }
  return context
}

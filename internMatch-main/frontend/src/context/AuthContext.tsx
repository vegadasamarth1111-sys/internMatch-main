import { createContext, useState, useEffect, type ReactNode } from 'react'
import { authService } from '../services/auth'

export interface User {
  id: number
  email: string
  role: 'applicant' | 'recruiter'
  is_admin?: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  sendRegisterOtp: (email: string, password: string, role: 'applicant' | 'recruiter') => Promise<void>
  verifyRegisterOtp: (email: string, otp: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)  // true until session restore is done

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken')
    if (!storedToken) {
      setLoading(false)  // no token - nothing to restore, done immediately
      return
    }

    setToken(storedToken)
    authService.getMe()
      .then((me) => setUser({ id: me.id, email: me.email, role: me.role, is_admin: me.is_admin }))
      .catch(() => {
        localStorage.removeItem('authToken')
        setToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))  // always mark done, success or failure
  }, [])

  const _storeSession = (accessToken: string, userData: User) => {
    localStorage.setItem('authToken', accessToken)
    setToken(accessToken)
    setUser(userData)
  }

  const sendRegisterOtp = async (
    email: string,
    password: string,
    role: 'applicant' | 'recruiter',
  ) => {
    await authService.register({ email, password, role })
  }

  const verifyRegisterOtp = async (email: string, otp: string) => {
    const { access_token } = await authService.verifyOtp({ email, otp })
    localStorage.setItem('authToken', access_token)
    const me = await authService.getMe()
    _storeSession(access_token, { id: me.id, email: me.email, role: me.role, is_admin: me.is_admin })
  }

  const login = async (email: string, password: string) => {
    const { access_token } = await authService.login({ email, password })
    localStorage.setItem('authToken', access_token)
    const me = await authService.getMe()
    _storeSession(access_token, { id: me.id, email: me.email, role: me.role, is_admin: me.is_admin })
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      sendRegisterOtp, verifyRegisterOtp,
      login, logout,
      isAuthenticated: !!token && !!user,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
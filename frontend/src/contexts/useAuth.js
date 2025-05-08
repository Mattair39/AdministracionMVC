import { createContext, useContext, useEffect, useState } from 'react'
import { login, is_authenticated, register, logout as apiLogout } from '../endpoints/api'
import { useNavigate } from 'react-router-dom'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const nav = useNavigate()

  const get_authenticated = async () => {
    try {
      const success = await is_authenticated()
      setIsAuthenticated(success)
    } catch {
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  const login_user = async (username, password) => {
    const success = await login(username, password)
    if (success) {
      setIsAuthenticated(true)
      setUser(username)
      nav('/')
    }
  }

  const logout_user = async () => {
    await apiLogout()
    setIsAuthenticated(false)
    setUser(null)
    nav('/login')
  }

  const register_user = async (username, email, password, confirmPassword) => {
    if (password !== confirmPassword) return
    await register(username, email, password)
    nav('/login')
  }

  useEffect(() => {
    get_authenticated()
  }, [window.location.pathname])

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, user, login_user, logout_user, register_user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

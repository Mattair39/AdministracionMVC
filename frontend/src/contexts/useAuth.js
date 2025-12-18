import { createContext, useContext, useEffect, useState } from 'react'
import { login, is_authenticated, register, logout as apiLogout } from '../endpoints/api'
import { useNavigate } from 'react-router-dom'
import keycloak from '../keycloak'
import axios from 'axios'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const nav = useNavigate()

  // Manejar autenticación con Keycloak
  const handleKeycloakAuth = async () => {
    try {
      console.log('handleKeycloakAuth: Iniciando...', {
        authenticated: keycloak.authenticated,
        hasToken: !!keycloak.token,
        tokenPreview: keycloak.token ? keycloak.token.substring(0, 20) + '...' : null
      })
      
      if (!keycloak.authenticated || !keycloak.token) {
        console.log('handleKeycloakAuth: Keycloak no está autenticado o no tiene token')
        setIsAuthenticated(false)
        setLoading(false)
        return
      }
      
      // Asegurarse de que el token esté actualizado
      try {
        await keycloak.updateToken(30)
        console.log('handleKeycloakAuth: Token actualizado')
      } catch (tokenError) {
        console.warn('handleKeycloakAuth: Error actualizando token:', tokenError)
      }
      
      // Obtener perfil del usuario desde el backend
      console.log('handleKeycloakAuth: Llamando a /api/auth/me/...')
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:9001'}/api/auth/me/`,
        {
          headers: {
            Authorization: `Bearer ${keycloak.token}`
          }
        }
      )
      
      console.log('handleKeycloakAuth: Perfil obtenido:', response.data)
      
      setIsAuthenticated(true)
      setUser(response.data.username || response.data.email)
      
      // Limpiar hash y query params de la URL
      if (window.location.hash) {
        window.history.replaceState(null, null, window.location.pathname)
      }
      if (window.location.search) {
        window.history.replaceState(null, null, window.location.pathname)
      }
      
      // Refrescar token periódicamente
      keycloak.onTokenExpired = () => {
        keycloak.updateToken(30).catch(() => {
          logout_user()
        })
      }
      
      console.log('handleKeycloakAuth: Autenticación exitosa, isAuthenticated = true')
    } catch (error) {
      console.error('Error obteniendo perfil de usuario:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  // Inicializar Keycloak
  useEffect(() => {
    const initKeycloak = async () => {
      try {
        // Verificar si hay token en la URL (redirect después de login)
        const hash = window.location.hash
        const urlParams = new URLSearchParams(window.location.search)
        const hasToken = hash && hash.includes('access_token')
        const hasCode = urlParams.get('code')
        const currentPath = window.location.pathname
        
        console.log('initKeycloak: Verificando redirect de Keycloak...', {
          hash: hash ? hash.substring(0, 50) + '...' : null,
          hasCode,
          pathname: currentPath,
          fullUrl: window.location.href
        })
        
        if (hasToken || hasCode) {
          // Keycloak redirigió de vuelta después del login
          console.log('initKeycloak: Detectado redirect de Keycloak, inicializando...')
          setLoading(true)
          
          try {
            const authenticated = await keycloak.init({
              onLoad: 'login-required',
              checkLoginIframe: false,
              pkceMethod: 'S256',
              enableLogging: true
            })
            
            console.log('initKeycloak: Keycloak inicializado después de redirect, authenticated:', authenticated)
            
            if (authenticated && keycloak.token) {
              await handleKeycloakAuth()
              // Limpiar URL
              window.history.replaceState(null, null, '/')
            } else {
              await get_authenticated()
            }
          } catch (initError) {
            console.error('Error inicializando Keycloak después de redirect:', initError)
            await get_authenticated()
          }
        } else {
          // Primero intentar check-sso para detectar sesión existente
          console.log('initKeycloak: Intentando check-sso para detectar sesión existente...')
          
          try {
            const authenticated = await keycloak.init({
              onLoad: 'check-sso',
              checkLoginIframe: false, // Deshabilitar iframe para evitar CORS
              enableLogging: true,
              silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html'
            })

            console.log('initKeycloak: check-sso completado, authenticated:', authenticated, {
              hasToken: !!keycloak.token,
              authenticated: keycloak.authenticated
            })

            if (authenticated && keycloak.token) {
              // Usuario ya autenticado con Keycloak (SSO)
              console.log('initKeycloak: Usuario ya autenticado con Keycloak (SSO detectado)')
              await handleKeycloakAuth()
            } else {
              // No hay sesión de Keycloak, verificar autenticación tradicional
              console.log('initKeycloak: No hay sesión de Keycloak, verificando autenticación tradicional')
              await get_authenticated()
            }
          } catch (ssoError) {
            console.warn('Error en check-sso (puede ser CORS, continuando...):', ssoError)
            // Si falla check-sso, verificar autenticación tradicional
            await get_authenticated()
          }
        }
      } catch (error) {
        console.error('Error inicializando Keycloak:', error)
        await get_authenticated()
      }
    }

    initKeycloak()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Configurar interceptor de Axios para agregar token de Keycloak
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      if (keycloak.authenticated && keycloak.token) {
        config.headers.Authorization = `Bearer ${keycloak.token}`
      }
      return config
    })

    return () => {
      axios.interceptors.request.eject(interceptor)
    }
  }, [])


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

  const login_with_keycloak = () => {
    try {
      console.log('=== Iniciando login con Keycloak ===')
      console.log('Keycloak object:', keycloak)
      console.log('Keycloak config:', {
        url: process.env.REACT_APP_KEYCLOAK_URL || 'http://localhost:8081',
        realm: process.env.REACT_APP_KEYCLOAK_REALM || 'fitFlow',
        clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'proyectocoremvc-web',
        authenticated: keycloak.authenticated
      })
      
      // Especificar redirectUri para que Keycloak redirija a la página principal
      const redirectUri = window.location.origin + '/'
      
      console.log('Redirect URI:', redirectUri)
      console.log('Llamando a keycloak.login()...')
      
      // Llamar a login - esto debería redirigir automáticamente
      const loginPromise = keycloak.login({
        redirectUri: redirectUri
      })
      
      if (loginPromise && typeof loginPromise.then === 'function') {
        loginPromise.catch((error) => {
          console.error('Error en keycloak.login():', error)
          // Si falla, intentar inicializar primero y luego login
          console.log('Intentando inicializar Keycloak primero...')
          keycloak.init({
            onLoad: 'login-required',
            checkLoginIframe: false,
          }).then(() => {
            console.log('Keycloak inicializado, intentando login nuevamente...')
            return keycloak.login({
              redirectUri: redirectUri
            })
          }).catch((initError) => {
            console.error('Error al inicializar Keycloak:', initError)
            alert('Error al conectar con Keycloak. Por favor, verifica que Keycloak esté corriendo en http://localhost:8081')
          })
        })
      } else {
        console.log('keycloak.login() no retornó una promesa, puede que ya haya redirigido')
      }
    } catch (error) {
      console.error('Error al iniciar login con Keycloak:', error)
      alert('Error al conectar con Keycloak. Por favor, verifica la configuración.')
    }
  }

  const logout_user = async () => {
    if (keycloak.authenticated) {
      // Logout de Keycloak (cierra sesión en todas las apps)
      keycloak.logout()
    } else {
      // Logout tradicional
      await apiLogout()
      setIsAuthenticated(false)
      setUser(null)
      nav('/login')
    }
  }

  const register_user = async (username, email, password, confirmPassword) => {
    if (password !== confirmPassword) return
    await register(username, email, password)
    nav('/login')
  }

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      loading, 
      user, 
      login_user, 
      login_with_keycloak,
      logout_user, 
      register_user 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

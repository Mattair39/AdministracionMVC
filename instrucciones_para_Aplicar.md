# 📋 Indicaciones de Cambios para Integración de Keycloak

Este documento detalla todos los cambios necesarios para integrar Keycloak SSO en el proyecto.

---

## 🎯 Resumen

Se integra Keycloak para habilitar Single Sign-On (SSO) compartido con el realm `fitFlow` existente. Los usuarios podrán iniciar sesión una vez y estar autenticados en todas las aplicaciones que usen el mismo realm.

---

## 📦 1. FRONTEND - Dependencias

### Archivo: `frontend/package.json`

**Cambio:** Agregar la dependencia `keycloak-js`

```json
"dependencies": {
  ...
  "keycloak-js": "^27.0.0",
  ...
}
```

**Comando después del cambio:**
```bash
cd frontend && npm install
```

---

## 🔧 2. FRONTEND - Configuración de Keycloak

### Archivo: `frontend/src/keycloak.js` (NUEVO)

**Crear este archivo con el siguiente contenido:**

```javascript
import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: process.env.REACT_APP_KEYCLOAK_URL || 'http://localhost:8081',
  realm: process.env.REACT_APP_KEYCLOAK_REALM || 'fitFlow',
  clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'proyectocoremvc-web',
};

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;
```

---

## 🔐 3. FRONTEND - Contexto de Autenticación

### Archivo: `frontend/src/contexts/useAuth.js`

**Reemplazar completamente el contenido con:**

```javascript
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

  // Inicializar Keycloak
  useEffect(() => {
    const initKeycloak = async () => {
      try {
        const authenticated = await keycloak.init({
          onLoad: 'check-sso',
          checkLoginIframe: false,
          silentCheckSsoRedirectUri: undefined,
        })

        if (authenticated) {
          // Usuario ya autenticado con Keycloak
          await handleKeycloakAuth()
        } else {
          // Verificar si hay token en la URL (redirect después de login)
          const hash = window.location.hash
          if (hash && hash.includes('access_token')) {
            await keycloak.init({ onLoad: 'login-required' })
            await handleKeycloakAuth()
          } else {
            // Verificar autenticación tradicional
            await get_authenticated()
          }
        }
      } catch (error) {
        console.error('Error inicializando Keycloak:', error)
        await get_authenticated()
      } finally {
        setLoading(false)
      }
    }

    initKeycloak()
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

  // Manejar autenticación con Keycloak
  const handleKeycloakAuth = async () => {
    try {
      // Obtener perfil del usuario desde el backend
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:9001'}/api/auth/me/`,
        {
          headers: {
            Authorization: `Bearer ${keycloak.token}`
          }
        }
      )
      
      setIsAuthenticated(true)
      setUser(response.data.username || response.data.email)
      
      // Limpiar hash de la URL
      if (window.location.hash) {
        window.history.replaceState(null, null, window.location.pathname)
      }
      
      // Refrescar token periódicamente
      keycloak.onTokenExpired = () => {
        keycloak.updateToken(30).catch(() => {
          logout_user()
        })
      }
    } catch (error) {
      console.error('Error obteniendo perfil de usuario:', error)
      setIsAuthenticated(false)
    }
  }

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
    keycloak.login()
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
```

---

## 🚪 4. FRONTEND - Componente de Login

### Archivo: `frontend/src/routes/login.js`

**Agregar botón de Keycloak después del botón de Login tradicional:**

```javascript
import {
    VStack, Button, FormControl, FormLabel,
    Input, Heading, Text, Box, Divider
  } from "@chakra-ui/react";
  import { useState } from "react";
  import { useAuth } from "../contexts/useAuth";
  import { useNavigate } from "react-router-dom";
  
  const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const { login_user, login_with_keycloak } = useAuth();
    const nav = useNavigate();
  
    return (
      <Box bg="gray.800" p={8} rounded="lg" shadow="lg" w="full" maxW="420px">
        <VStack spacing={6} align="stretch">
          <Heading textAlign="center" size="lg" color="gray.100">
            Iniciar Sesión
          </Heading>
  
          <FormControl>
            <FormLabel color="gray.300">Nombre de Usuario</FormLabel>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario"
              color="gray.100"
              _placeholder={{ color: "gray.500" }}
            />
          </FormControl>
  
          <FormControl>
            <FormLabel color="gray.300">Contraseña</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              color="gray.100"
              _placeholder={{ color: "gray.500" }}
            />
          </FormControl>
  
          <Button colorScheme="teal" onClick={() => login_user(username, password)}>
            Login
          </Button>

          <Divider borderColor="gray.600" />

          <Button 
            colorScheme="blue" 
            variant="outline"
            onClick={login_with_keycloak}
          >
            Iniciar Sesión con Keycloak
          </Button>
  
          <Text
            fontSize="sm"
            textAlign="center"
            color="teal.300"
            _hover={{ textDecoration: "underline", cursor: "pointer" }}
            onClick={() => nav("/register")}
          >
            ¿No tienes cuenta? Regístrate
          </Text>
        </VStack>
      </Box>
    );
  };
  
  export default Login;
```

---

## 🌐 5. FRONTEND - Configuración de Nginx (SPA)

### Archivo: `frontend/nginx.conf` (NUEVO)

**Crear este archivo con el siguiente contenido:**

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Configuración para SPA (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para archivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Configuración de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

---

## 🐳 6. FRONTEND - Dockerfile

### Archivo: `frontend/Dockerfile`

**Modificar la sección final para copiar nginx.conf:**

```dockerfile
FROM nginx:1.27-alpine

COPY --from=build /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

## 🐳 7. Docker Compose - Variables de Entorno

### Archivo: `docker-compose.yml`

**Agregar variables de entorno para Keycloak:**

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      PORT: 8000
      DEBUG: "False"
      KEYCLOAK_ISSUER: http://host.docker.internal:8081/realms/fitFlow
      KEYCLOAK_CLIENT_ID: proyectocoremvc-web
      KEYCLOAK_JWKS_URL: http://host.docker.internal:8081/realms/fitFlow/protocol/openid-connect/certs
    volumes:
      - django_media:/app/media
      - django_static:/app/staticfiles
    ports:
      - "9001:8000"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        REACT_APP_KEYCLOAK_URL: http://localhost:8081
        REACT_APP_KEYCLOAK_REALM: fitFlow
        REACT_APP_KEYCLOAK_CLIENT_ID: proyectocoremvc-web
        REACT_APP_API_URL: http://localhost:9001
    ports:
      - "3002:80"
    depends_on:
      - backend

volumes:
  django_media:
  django_static:
```

**Nota:** Si usas Dockerfile multi-stage, también necesitas actualizar el Dockerfile del frontend para aceptar build args:

```dockerfile
FROM node:20-alpine AS build

WORKDIR /app

ARG REACT_APP_KEYCLOAK_URL
ARG REACT_APP_KEYCLOAK_REALM
ARG REACT_APP_KEYCLOAK_CLIENT_ID
ARG REACT_APP_API_URL

ENV REACT_APP_KEYCLOAK_URL=$REACT_APP_KEYCLOAK_URL
ENV REACT_APP_KEYCLOAK_REALM=$REACT_APP_KEYCLOAK_REALM
ENV REACT_APP_KEYCLOAK_CLIENT_ID=$REACT_APP_KEYCLOAK_CLIENT_ID
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

## 🐍 8. BACKEND - Dependencias

### Archivo: `backend/requirements.txt`

**Agregar las siguientes dependencias:**

```txt
Django==5.0.3
djangorestframework==3.16.0
djangorestframework-simplejwt==5.5.0
django-cors-headers==4.7.0
whitenoise==6.5.0
gunicorn==22.0.0
python-jose[cryptography]==3.3.0
httpx==0.27.0
pydantic==2.9.2
```

---

## 🔐 9. BACKEND - Módulo de Keycloak

### Archivo: `backend/base/core/__init__.py` (NUEVO)

**Crear este archivo vacío (solo para hacer que `core` sea un paquete Python):**

```python
# Este archivo hace que 'core' sea un paquete Python
```

---

### Archivo: `backend/base/core/keycloak.py` (NUEVO)

**Crear este archivo con el siguiente contenido:**

```python
import os
import httpx
from jose import jwt, jwk
from jose.utils import base64url_decode
from django.contrib.auth.models import User
from django.conf import settings

KEYCLOAK_ISSUER = os.environ.get('KEYCLOAK_ISSUER', 'http://localhost:8081/realms/fitFlow')
KEYCLOAK_JWKS_URL = os.environ.get('KEYCLOAK_JWKS_URL', 'http://localhost:8081/realms/fitFlow/protocol/openid-connect/certs')
KEYCLOAK_CLIENT_ID = os.environ.get('KEYCLOAK_CLIENT_ID', 'proyectocoremvc-web')

# Cache para JWKS
_jwks_cache = None

def get_jwks():
    """Obtiene las claves públicas de Keycloak (JWKS)"""
    global _jwks_cache
    if _jwks_cache is None:
        try:
            response = httpx.get(KEYCLOAK_JWKS_URL, timeout=5.0)
            response.raise_for_status()
            _jwks_cache = response.json()
        except Exception as e:
            print(f"Error obteniendo JWKS: {e}")
            return None
    return _jwks_cache

def verify_keycloak_token(token):
    """Verifica y decodifica un token de Keycloak"""
    try:
        # Decodificar sin verificar para obtener el header
        unverified_header = jwt.get_unverified_header(token)
        unverified_claims = jwt.get_unverified_claims(token)
        
        # Obtener JWKS
        jwks = get_jwks()
        if not jwks:
            return None
        
        # Buscar la clave correcta
        rsa_key = {}
        for key in jwks.get('keys', []):
            if key['kid'] == unverified_header['kid']:
                rsa_key = {
                    'kty': key['kty'],
                    'kid': key['kid'],
                    'use': key['use'],
                    'n': key['n'],
                    'e': key['e']
                }
                break
        
        if not rsa_key:
            return None
        
        # Verificar y decodificar el token
        public_key = jwk.construct(rsa_key)
        claims = jwt.decode(
            token,
            public_key,
            algorithms=['RS256'],
            audience=KEYCLOAK_CLIENT_ID,
            issuer=KEYCLOAK_ISSUER
        )
        
        return claims
    except Exception as e:
        print(f"Error verificando token: {e}")
        return None

def get_or_create_user_from_token(claims):
    """Obtiene o crea un usuario Django basado en los claims del token"""
    username = claims.get('preferred_username') or claims.get('sub')
    email = claims.get('email', '')
    first_name = claims.get('given_name', '')
    last_name = claims.get('family_name', '')
    
    if not username:
        return None
    
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'email': email,
            'first_name': first_name,
            'last_name': last_name,
            'is_active': True,
        }
    )
    
    # Actualizar información si el usuario ya existía
    if not created:
        if email and not user.email:
            user.email = email
        if first_name:
            user.first_name = first_name
        if last_name:
            user.last_name = last_name
        user.save()
    
    return user
```

---

## 🔑 10. BACKEND - Autenticación

### Archivo: `backend/base/authentication.py`

**Agregar la clase KeycloakAuthentication al final del archivo:**

```python
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .core.keycloak import verify_keycloak_token, get_or_create_user_from_token

class CookiesJWTAuthentication(JWTAuthentication):
    def authenticate(self, request): # (Contiene toda la información de la petición HTTP (headers, cookies)).
        access_token = request.COOKIES.get('access_token')
        
        if not access_token:
            return None
        
        validated_token = self.get_validated_token(access_token) # (Formato correcto, no expirado y firma válida). 
        try:
            user = self.get_user(validated_token) # Extrae el user_id del token validado.
        except:
            return None
        
        return(user, validated_token)
    
    # (Permite que el frontend con React se autentique con el backend utilizando JWT en cookies).

class KeycloakAuthentication(BaseAuthentication):
    """Autenticación usando tokens de Keycloak"""
    
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        
        # Verificar token con Keycloak
        claims = verify_keycloak_token(token)
        if not claims:
            raise AuthenticationFailed('Token inválido o expirado')
        
        # Obtener o crear usuario
        user = get_or_create_user_from_token(claims)
        if not user:
            raise AuthenticationFailed('No se pudo obtener el usuario del token')
        
        return (user, token)
```

---

## ⚙️ 11. BACKEND - Settings

### Archivo: `backend/backend/settings.py`

**Modificar la sección REST_FRAMEWORK para incluir KeycloakAuthentication:**

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "base.authentication.KeycloakAuthentication",  # Primero intenta Keycloak
        "base.authentication.CookiesJWTAuthentication",  # Fallback a JWT tradicional
    ),
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}
```

---

## 📡 12. BACKEND - Endpoint de Usuario Actual

### Archivo: `backend/base/views.py`

**Agregar al final del archivo (antes de las últimas líneas):**

```python
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """Obtiene el perfil del usuario actual autenticado"""
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
    })
```

---

### Archivo: `backend/base/urls.py`

**Agregar la importación y la ruta:**

```python
from .views import (
    ...
    get_current_user,  # Agregar esta importación
    ...
)

urlpatterns = [
    ...
    path("auth/me/", get_current_user, name="get_current_user"),  # Agregar esta ruta
    ...
]
```

---

## ✅ Checklist de Implementación

- [ ] 1. Agregar `keycloak-js` a `package.json` y ejecutar `npm install`
- [ ] 2. Crear `frontend/src/keycloak.js`
- [ ] 3. Actualizar `frontend/src/contexts/useAuth.js`
- [ ] 4. Actualizar `frontend/src/routes/login.js` con botón de Keycloak
- [ ] 5. Crear `frontend/nginx.conf`
- [ ] 6. Actualizar `frontend/Dockerfile` para copiar nginx.conf
- [ ] 7. Actualizar `docker-compose.yml` con variables de entorno
- [ ] 8. Actualizar `backend/requirements.txt`
- [ ] 9. Crear `backend/base/core/__init__.py`
- [ ] 10. Crear `backend/base/core/keycloak.py`
- [ ] 11. Actualizar `backend/base/authentication.py`
- [ ] 12. Actualizar `backend/backend/settings.py`
- [ ] 13. Agregar endpoint `get_current_user` en `backend/base/views.py`
- [ ] 14. Agregar ruta `/api/auth/me/` en `backend/base/urls.py`

---

## 🚀 Después de los Cambios

1. **Instalar dependencias del frontend:**
   ```bash
   cd frontend && npm install
   ```

2. **Instalar dependencias del backend:**
   ```bash
   cd backend && pip install -r requirements.txt
   ```

3. **Reconstruir y levantar contenedores:**
   ```bash
   docker compose down
   docker compose build
   docker compose up
   ```

4. **Verificar que Keycloak esté corriendo en `http://localhost:8081`**

5. **Verificar que el client `proyectocoremvc-web` esté configurado en el realm `fitFlow`**

---

## 📝 Notas Importantes

- El realm de Keycloak debe ser `fitFlow`
- El client ID debe ser `proyectocoremvc-web`
- Keycloak debe estar corriendo en `http://localhost:8081`
- El backend usa `host.docker.internal` para acceder a Keycloak desde el contenedor
- El frontend debe tener configurados los redirect URIs en Keycloak:
  - `http://localhost:3002/*`
  - `http://localhost:3002/login`
  - `http://localhost:3002/silent-check-sso.html`

---

**Última actualización:** Diciembre 2024

# Integración del Segundo Proyecto al Realm Existente de Keycloak

Este documento resume *únicamente* los pasos esenciales realizados para integrar el segundo proyecto (**ProyectoCoreMVC**) al **mismo realm Keycloak** ya utilizado por otra solución, habilitando **Single Sign-On (SSO) compartido** entre ambas aplicaciones.

---

## 📋 Tabla de Contenidos

1. [Objetivo](#-objetivo)
2. [Uso del Mismo Realm Existente](#-1-uso-del-mismo-realm-existente)
3. [Creación del Nuevo Client](#-2-creación-del-nuevo-client-para-este-proyecto)
4. [Integración del Backend](#-3-integración-del-backend-django)
5. [Integración del Frontend](#-4-integración-del-frontend-react)
6. [Variables de Entorno Docker](#-5-variables-de-entorno-docker)
7. [Flujo de Autenticación SSO](#-6-flujo-de-autenticación-sso)

---

## 🧩 Objetivo

Permitir que el segundo proyecto comparta:

- ✅ **Autenticación centralizada** en Keycloak
- ✅ **Login y logout unificados** (SSO)
- ✅ **Usuarios, tokens y sesiones** del mismo **realm**

---

## 🔑 1. Uso del Mismo Realm Existente

Se reutilizó el realm ya funcional:

### Realm: `fitFlow`

➡️ **Esto permite que ambas aplicaciones compartan usuarios, roles y sesiones.**

---

## 🧱 2. Creación del Nuevo Client para Este Proyecto

En Keycloak se creó un client exclusivo para el segundo proyecto:

| Atributo | Valor |
|----------|-------|
| **Client ID** | `proyectocoremvc-web` |
| **Protocolo** | `openid-connect` |
| **Tipo** | `public` |
| **Root URL** | `http://localhost:3002` |

### 🔁 Redirects Configurados

**Valid redirect URIs:**
```
http://localhost:3002/*
http://localhost:3002/login
http://localhost:3002/silent-check-sso.html
```

**Post logout redirect URIs:**
```
http://localhost:3002/*
http://localhost:3002/login
```

**Web origins:**
```
http://localhost:3002
http://localhost:9001
```

---

## 🔧 3. Integración del Backend (Django)

### Dependencias Agregadas

Se agregaron las siguientes dependencias a `requirements.txt`:

```txt
python-jose[cryptography]==3.3.0
httpx==0.27.0
pydantic==2.9.2
```

### Autenticación con Keycloak

Se añadió la clase `KeycloakAuthentication` que:

- ✅ Lee el token `Bearer <token>` del header `Authorization`
- ✅ Valida su firma con las **JWKS** del realm
- ✅ Crea un usuario Django **automáticamente** si no existe
- ✅ Autentica basándose en los **claims** del token

**Configuración en `settings.py`:**

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "base.authentication.KeycloakAuthentication",
        "base.authentication.CookiesJWTAuthentication",  # Fallback
    ),
}
```

### Endpoint del Usuario Autenticado

**GET** `/api/auth/me/`

Retorna el perfil del usuario actual autenticado con Keycloak o JWT tradicional.

---

## 🎨 4. Integración del Frontend (React)

### SDK de Keycloak

Se habilitó autenticación mediante el SDK oficial de Keycloak:

**Instalación:**
```bash
npm install keycloak-js
```

**Configuración:**
```javascript
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'http://localhost:8081',
  realm: 'fitFlow',
  clientId: 'proyectocoremvc-web',
});
```

### Login Centralizado

```javascript
keycloak.login();
```

Redirige al usuario a Keycloak para autenticarse.

### Logout Global SSO

```javascript
keycloak.logout();
```

Cierra la sesión en **todas las aplicaciones** que usen el mismo realm.

### Interceptor Axios

Se añadió un interceptor para enviar el token en cada request:

```javascript
axios.interceptors.request.use((config) => {
  if (keycloak.authenticated && keycloak.token) {
    config.headers.Authorization = `Bearer ${keycloak.token}`;
  }
  return config;
});
```

---

## 🐳 5. Variables de Entorno Docker

### Backend

Para permitir que Django valide tokens desde un Keycloak en el host:

```env
KEYCLOAK_ISSUER=http://localhost:8081/realms/fitFlow
KEYCLOAK_CLIENT_ID=proyectocoremvc-web
KEYCLOAK_JWKS_URL=http://host.docker.internal:8081/realms/fitFlow/protocol/openid-connect/certs
```

**Nota:** Se usa `host.docker.internal` para acceder a Keycloak que corre en el host desde el contenedor Docker.

### Frontend

```env
REACT_APP_KEYCLOAK_URL=http://localhost:8081
REACT_APP_KEYCLOAK_REALM=fitFlow
REACT_APP_KEYCLOAK_CLIENT_ID=proyectocoremvc-web
REACT_APP_API_URL=http://localhost:9001
```

---

## 🔄 6. Flujo de Autenticación SSO

### Escenario: Usuario se loguea en ProyectoCoreMVC

```
1. Usuario → ProyectoCoreMVC (click en "Iniciar Sesión")
   ↓
2. ProyectoCoreMVC → Redirige a Keycloak (realm: fitFlow)
   ↓
3. Usuario → Ingresa credenciales en Keycloak
   ↓
4. Keycloak → Valida y genera token
   ↓
5. Keycloak → Redirige a ProyectoCoreMVC con token
   ↓
6. ProyectoCoreMVC → Usuario autenticado ✅
```

### Escenario: Usuario accede al Proyecto Existente

```
1. Usuario → Proyecto Existente
   ↓
2. Proyecto Existente → Verifica sesión en Keycloak (fitFlow)
   ↓
3. Keycloak → Sesión válida encontrada
   ↓
4. Proyecto Existente → Usuario autenticado automáticamente ✅
   (NO solicita credenciales - SSO funcionando)
```

### Escenario: Logout

```
1. Usuario → Cierra sesión en cualquier proyecto
   ↓
2. Keycloak → Invalida sesión del realm fitFlow
   ↓
3. Ambos proyectos → Usuario deslogueado ✅
   (SSO compartido: logout en uno = logout en todos)
```

---

## ✅ Resultado Final

Con esta integración:

- 🔐 **Un solo login** autentica al usuario en ambas aplicaciones
- 🚪 **Un solo logout** cierra sesión en todas las aplicaciones
- 👥 **Usuarios compartidos** entre ambas soluciones
- 🔑 **Tokens válidos** para ambos proyectos desde el mismo realm

---

**Última actualización:** Diciembre 2024




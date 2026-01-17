# 🌐 Cómo Acceder al Backend desde el Navegador

## 📍 URL Base del Backend

Tu backend Django está corriendo en:
```
http://localhost:9001
```

## 🔗 Endpoints Disponibles

### 1. Panel de Administración de Django

```
http://localhost:9001/admin/
```

**Nota:** Necesitas crear un superusuario primero:
```bash
docker exec -it proyectocoremvc-backend-1 python manage.py createsuperuser
```

### 2. Endpoints de API

Todos los endpoints de API están bajo el prefijo `/api/`:

#### 🔐 Autenticación
- `http://localhost:9001/api/token/` - Obtener token JWT
- `http://localhost:9001/api/token/refresh/` - Refrescar token
- `http://localhost:9001/api/logout/` - Cerrar sesión
- `http://localhost:9001/api/authenticated/` - Verificar autenticación
- `http://localhost:9001/api/register/` - Registrar usuario
- `http://localhost:9001/api/auth/me/` - Obtener usuario actual

#### 📦 Recursos Principales
- `http://localhost:9001/api/contracts/` - Lista de contratos
- `http://localhost:9001/api/projects/` - Lista de proyectos
- `http://localhost:9001/api/packages/` - Lista de paquetes
- `http://localhost:9001/api/tickets/` - Lista de tickets
- `http://localhost:9001/api/users/` - Lista de usuarios

#### 🔒 Integraciones con Vault KMS
- `http://localhost:9001/api/integrations/test-encryption/` - **Test de cifrado**
- `http://localhost:9001/api/integrations/person/send/` - Enviar persona a FitFlow
- `http://localhost:9001/api/integrations/person/receive/` - Recibir persona de FitFlow

## 🧪 Cómo Probar Endpoints desde el Navegador

### Opción 1: Navegador Directo (GET requests)

Para endpoints GET, puedes acceder directamente:

```
http://localhost:9001/api/simple-api/
```

**Nota:** La mayoría de endpoints requieren autenticación, así que verás un error 401 si no estás autenticado.

### Opción 2: Usar la Consola del Navegador (F12)

Abre las herramientas de desarrollo (F12) y en la consola ejecuta:

```javascript
// Obtener token (primero necesitas estar autenticado en Keycloak)
// Si usas Keycloak, el token está en localStorage o cookies

// Ejemplo: Probar endpoint de test de cifrado
fetch('http://localhost:9001/api/integrations/test-encryption/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer TU_TOKEN_AQUI'
  },
  body: JSON.stringify({
    test: "datos de prueba",
    numero: 123
  })
})
.then(response => response.json())
.then(data => console.log('Respuesta:', data))
.catch(error => console.error('Error:', error));
```

### Opción 3: Usar Extensión del Navegador

**Recomendado:** Instala una extensión como:
- **REST Client** (Chrome/Edge)
- **ModHeader** (para agregar headers de Authorization)
- **Postman** (aplicación de escritorio)

### Opción 4: Usar curl desde Terminal

```bash
# Probar endpoint de test de cifrado
curl -X POST http://localhost:9001/api/integrations/test-encryption/ \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"test": "datos", "numero": 123}'
```

## 🔑 Obtener Token de Autenticación

### Método 1: Desde el Frontend (Keycloak)

1. Abre `http://localhost:3002` en el navegador
2. Inicia sesión con Keycloak
3. Abre la consola del navegador (F12)
4. Ejecuta:

```javascript
// Obtener token de Keycloak
const keycloak = window.keycloak;
if (keycloak && keycloak.token) {
  console.log('Token:', keycloak.token);
  // Copia este token para usarlo en las peticiones
}
```

### Método 2: Desde Keycloak Directamente

```bash
curl -X POST http://localhost:8081/realms/fitFlow/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=proyectocoremvc-web" \
  -d "username=tu_usuario" \
  -d "password=tu_password" \
  -d "grant_type=password"
```

## 🧪 Ejemplo Completo: Probar Test de Cifrado

### Paso 1: Obtener Token

Desde el navegador (consola):
```javascript
// Si estás autenticado en el frontend
fetch('http://localhost:9001/api/auth/me/', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('keycloak_token')
  }
})
.then(r => r.json())
.then(data => console.log('Usuario:', data));
```

### Paso 2: Probar Cifrado

```javascript
// Reemplaza TU_TOKEN con el token real
const token = 'TU_TOKEN_AQUI';

fetch('http://localhost:9001/api/integrations/test-encryption/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    nombre: "Juan Pérez",
    edad: 30,
    email: "juan@example.com"
  })
})
.then(response => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
})
.then(data => {
  console.log('✅ Éxito!');
  console.log('Original:', data.original);
  console.log('Cifrado:', data.encrypted);
  console.log('Descifrado:', data.decrypted);
  console.log('Match:', data.match);
})
.catch(error => {
  console.error('❌ Error:', error);
});
```

## 📊 Verificar que el Backend está Corriendo

### Verificar Estado

```bash
# Verificar que el contenedor está corriendo
docker ps | grep backend

# Ver logs del backend
docker logs -f proyectocoremvc-backend-1

# Verificar que responde
curl http://localhost:9001/api/simple-api/
```

### Verificar desde el Navegador

Abre en el navegador:
```
http://localhost:9001/api/simple-api/
```

Si el backend está corriendo, deberías ver una respuesta JSON (aunque puede requerir autenticación).

## 🛠️ Herramientas Recomendadas

### 1. **Postman** (Recomendado)
- Descarga: https://www.postman.com/downloads/
- Permite guardar requests, variables, y colecciones
- Ideal para probar APIs

### 2. **Thunder Client** (VS Code)
- Extensión para VS Code
- Similar a Postman pero integrado en el editor

### 3. **REST Client** (Navegador)
- Extensión de Chrome/Edge
- Permite hacer requests directamente desde el navegador

### 4. **ModHeader** (Navegador)
- Extensión para agregar headers personalizados
- Útil para agregar `Authorization: Bearer TOKEN` a todas las peticiones

## 🔍 Endpoints de Verificación Rápida

### Sin Autenticación (si están disponibles)
```
http://localhost:9001/api/simple-api/
```

### Con Autenticación
```
http://localhost:9001/api/auth/me/
http://localhost:9001/api/integrations/test-encryption/
http://localhost:9001/api/contracts/
http://localhost:9001/api/projects/
```

## ⚠️ Notas Importantes

1. **CORS:** El backend está configurado para aceptar requests desde `localhost:3002` (frontend)
2. **Autenticación:** La mayoría de endpoints requieren token de Keycloak
3. **HTTPS:** En desarrollo, todo es HTTP. En producción, usa HTTPS
4. **Puerto:** El backend está en el puerto **9001** (no 8000, que es interno del contenedor)

## 🚀 Inicio Rápido

1. **Abre el frontend:**
   ```
   http://localhost:3002
   ```

2. **Inicia sesión con Keycloak**

3. **Abre la consola del navegador (F12)**

4. **Ejecuta:**
   ```javascript
   // Obtener token
   const token = window.keycloak?.token;
   console.log('Token:', token);
   
   // Probar endpoint
   fetch('http://localhost:9001/api/integrations/test-encryption/', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`
     },
     body: JSON.stringify({test: "datos"})
   })
   .then(r => r.json())
   .then(d => console.log('Respuesta:', d));
   ```

## 📝 URLs Completas de Ejemplo

```
# Admin
http://localhost:9001/admin/

# API Base
http://localhost:9001/api/

# Test de Cifrado (requiere token)
http://localhost:9001/api/integrations/test-encryption/

# Contratos
http://localhost:9001/api/contracts/

# Proyectos
http://localhost:9001/api/projects/

# Tickets
http://localhost:9001/api/tickets/
```



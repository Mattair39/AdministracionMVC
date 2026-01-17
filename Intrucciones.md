# 🔐 Arquitectura de Cifrado con HashiCorp Vault Transit Engine

## 📋 Visión General

Implementación de cifrado/descifrado de payloads HTTP entre sistemas usando HashiCorp Vault como Key Management Service (KMS) centralizado.

---

## 🏗️ Arquitectura de Alto Nivel

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Sistema A     │         │  HashiCorp Vault │         │   Sistema B     │
│  (FitFlow)      │         │  Transit Engine │         │   (Django)      │
│                 │         │                 │         │                 │
│  FastAPI        │         │                 │         │  Django REST   │
│  + React        │         │  ┌───────────┐  │         │  + React       │
│                 │         │  │ Encryption│  │         │                 │
│  ┌───────────┐ │         │  │ Key Ring  │  │         │  ┌───────────┐ │
│  │ Middleware│ │────────▶│  │           │  │◀────────│  │ Middleware│ │
│  │ Encrypt   │ │ Request │  │ Decrypt   │  │ Response│  │ Decrypt   │ │
│  └───────────┘ │         │  └───────────┘  │         │  └───────────┘ │
│                 │         │                 │         │                 │
│  ┌───────────┐ │         │                 │         │  ┌───────────┐ │
│  │ Middleware│ │◀────────│                 │────────▶│  │ Middleware│ │
│  │ Decrypt   │ │Response │                 │ Request │  │ Encrypt   │ │
│  └───────────┘ │         │                 │         │  └───────────┘ │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

---

## 🔑 Componentes Principales

### 1. **HashiCorp Vault Transit Engine**
- **Función**: KMS centralizado para cifrado/descifrado
- **Ubicación**: Servicio independiente (Docker)
- **Responsabilidades**:
  - Almacenar y rotar claves de cifrado
  - Realizar operaciones de cifrado/descifrado
  - Gestionar políticas de acceso
  - Auditoría de operaciones

### 2. **Cliente Vault (Python/FastAPI)**
- **Función**: Interfaz con Vault Transit Engine
- **Ubicación**: `fitFlow/backend/app/core/vault.py`
- **Responsabilidades**:
  - Autenticación con Vault (AppRole, Token, etc.)
  - Encriptar payloads JSON antes de enviar
  - Desencriptar payloads JSON recibidos
  - Manejo de errores y reintentos
  - Caché de tokens de autenticación

### 3. **Middleware de Cifrado (FastAPI)**
- **Función**: Interceptar requests/responses y aplicar cifrado
- **Ubicación**: `fitFlow/backend/app/middleware/encryption.py`
- **Responsabilidades**:
  - Detectar requests salientes (a Sistema B)
  - Cifrar body JSON antes de enviar
  - Agregar headers de metadatos
  - Interceptar responses entrantes (de Sistema B)
  - Desencriptar body JSON recibido

### 4. **Middleware de Descifrado (FastAPI)**
- **Función**: Interceptar requests entrantes y descifrar
- **Ubicación**: `fitFlow/backend/app/middleware/decryption.py`
- **Responsabilidades**:
  - Detectar requests entrantes (de Sistema B)
  - Verificar headers de cifrado
  - Desencriptar body JSON
  - Pasar request descifrado al endpoint

### 5. **Configuración y Utilidades**
- **Función**: Gestión de configuración y helpers
- **Ubicación**: `fitFlow/backend/app/core/vault_config.py`
- **Responsabilidades**:
  - Cargar configuración de Vault
  - Validar configuración
  - Helpers para serialización JSON
  - Logging y métricas

---

## 🔄 Flujo de Cifrado/Descifrado

### Flujo 1: Request de A → B (Cifrado)

```
1. Cliente hace request a endpoint de FitFlow
2. FitFlow procesa request normalmente
3. FitFlow necesita hacer request a Django
4. Middleware intercepta request saliente
5. Middleware extrae body JSON
6. Cliente Vault cifra body usando Transit Engine
7. Request se envía con body cifrado + headers
8. Django recibe request cifrado
9. Django descifra usando su middleware
10. Django procesa request normalmente
```

### Flujo 2: Response de B → A (Cifrado)

```
1. Django genera response
2. Middleware Django intercepta response
3. Cliente Vault Django cifra body JSON
4. Response se envía con body cifrado
5. FitFlow recibe response cifrado
6. Middleware FitFlow intercepta response
7. Cliente Vault FitFlow descifra body
8. Response descifrado se entrega al cliente
```

---

## 🛡️ Consideraciones de Seguridad

### 1. **Autenticación con Vault**
- **AppRole**: Método recomendado para aplicaciones
- **Token**: Para desarrollo/testing
- **Rotación**: Tokens deben rotarse periódicamente
- **Almacenamiento**: Tokens en variables de entorno o secretos

### 2. **Gestión de Claves**
- **Key Ring**: Una clave por sistema o por relación
- **Rotación**: Vault maneja rotación automática
- **Versionado**: Vault mantiene versiones de claves
- **Backup**: Claves respaldadas en Vault

### 3. **Headers de Seguridad**
```
X-Encrypted: true
X-Encryption-Key: fitflow-django-key
X-Encryption-Algorithm: aes256-gcm96
X-Request-ID: <uuid>
```

### 4. **Validación**
- Verificar headers antes de descifrar
- Validar formato de payload cifrado
- Timeout en operaciones de cifrado
- Rate limiting en Vault

### 5. **Auditoría**
- Logging de todas las operaciones de cifrado
- Métricas de performance
- Alertas en caso de fallos

---

## ⚙️ Configuración

### Variables de Entorno

```bash
# Vault Configuration
VAULT_ADDR=http://localhost:8200
VAULT_ROLE_ID=<approle-role-id>
VAULT_SECRET_ID=<approle-secret-id>
VAULT_TRANSIT_KEY_NAME=fitflow-django-key
VAULT_TRANSIT_MOUNT_PATH=transit

# Encryption Settings
ENCRYPT_REQUESTS_TO_DJANGO=true
ENCRYPT_RESPONSES_FROM_DJANGO=true
DJANGO_API_BASE_URL=http://django-api:8000

# Performance
VAULT_REQUEST_TIMEOUT=5
VAULT_MAX_RETRIES=3
VAULT_CACHE_TTL=3600
```

---

## 📊 Métricas y Monitoreo

### Métricas a Monitorear:
- Tiempo de cifrado/descifrado
- Tasa de errores
- Latencia de Vault
- Uso de claves
- Requests cifrados/descifrados

### Alertas:
- Vault no disponible
- Tiempo de respuesta > threshold
- Tasa de errores > threshold
- Autenticación fallida

---

## 🚀 Implementación por Fases

### Fase 1: Infraestructura Base
- [ ] Configurar Vault con Transit Engine
- [ ] Crear clave de cifrado
- [ ] Configurar autenticación AppRole
- [ ] Cliente Vault básico

### Fase 2: Middleware FastAPI
- [ ] Middleware de cifrado saliente
- [ ] Middleware de descifrado entrante
- [ ] Integración con FastAPI
- [ ] Manejo de errores

### Fase 3: Testing y Optimización
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Optimización de performance
- [ ] Caché de tokens

### Fase 4: Producción
- [ ] Configuración de producción
- [ ] Monitoreo y alertas
- [ ] Documentación operativa
- [ ] Plan de rollback

---

## 🔧 Decisiones de Diseño

### 1. **Alcance del Cifrado**
- ✅ Cifrar solo body JSON
- ❌ No cifrar headers (excepto metadatos)
- ❌ No cifrar query parameters
- ✅ Cifrar tanto requests como responses

### 2. **Formato de Payload Cifrado**
```json
{
  "encrypted_data": "<base64-encoded-ciphertext>",
  "key_version": 1,
  "algorithm": "aes256-gcm96"
}
```

### 3. **Manejo de Errores**
- Si Vault no disponible: Fallar rápido o modo degradado
- Si descifrado falla: Retornar error 400/500
- Logging detallado de errores
- Reintentos con backoff exponencial

### 4. **Performance**
- Caché de tokens de autenticación
- Pool de conexiones HTTP a Vault
- Timeout configurable
- Operaciones asíncronas donde sea posible

---

## 📚 Referencias

- [HashiCorp Vault Transit Engine](https://www.vaultproject.io/docs/secrets/transit)
- [Vault Python Client](https://hvac.readthedocs.io/)
- [FastAPI Middleware](https://fastapi.tiangolo.com/advanced/middleware/)


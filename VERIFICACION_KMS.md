# 🔍 Guía de Verificación del KMS (Vault)

Esta guía te ayudará a verificar que la integración de Vault KMS está funcionando correctamente.

## ✅ Checklist de Verificación

### Paso 1: Verificar que Vault esté corriendo

```bash
# Verificar que Vault esté accesible
curl http://localhost:8200/v1/sys/health

# Deberías recibir algo como:
# {"initialized":true,"sealed":false,"standby":false,...}
```

**En la UI de Vault (localhost:8200/ui):**
- ✅ Debe mostrar "Vault v1.15.6" (o tu versión)
- ✅ Debe tener el Transit engine habilitado en `transit/`
- ✅ Debe estar desbloqueado (unsealed)

### Paso 2: Verificar que la clave de cifrado existe

```bash
# Verificar que la clave fitflow-django-key existe
curl -H "X-Vault-Token: fitflow-dev-token" \
  http://localhost:8200/v1/transit/keys/fitflow-django-key

# Deberías recibir información sobre la clave
```

**O desde la UI de Vault:**
1. Ve a `Secrets Engines` → `transit/`
2. Busca la clave `fitflow-django-key`
3. Debe existir y estar activa

### Paso 3: Verificar variables de entorno del backend

```bash
# Verificar que el contenedor tiene las variables correctas
docker exec proyectocoremvc-backend-1 env | grep VAULT

# Deberías ver:
# VAULT_ADDR=http://host.docker.internal:8200
# VAULT_TOKEN=fitflow-dev-token
# VAULT_TRANSIT_KEY_NAME=fitflow-django-key
# VAULT_TRANSIT_MOUNT_PATH=transit
# ENCRYPT_REQUESTS_TO_FITFLOW=true
# ENCRYPT_RESPONSES_FROM_FITFLOW=true
```

### Paso 4: Verificar logs del backend

```bash
# Ver logs del backend para errores de Vault
docker logs proyectocoremvc-backend-1 | grep -i vault

# O ver todos los logs en tiempo real
docker logs -f proyectocoremvc-backend-1
```

**Busca:**
- ✅ "Autenticado con token" (sin errores)
- ❌ NO debe haber "Vault no está disponible"
- ❌ NO debe haber "Error de conexión con Vault"

### Paso 5: Probar el endpoint de test de cifrado

#### 5.1 Obtener token de Keycloak

Primero necesitas autenticarte y obtener un token. Puedes hacerlo desde el frontend o manualmente:

```bash
# Opción 1: Desde el navegador (más fácil)
# 1. Abre http://localhost:3002
# 2. Inicia sesión con Keycloak
# 3. Abre la consola del navegador (F12)
# 4. Ejecuta: localStorage.getItem('keycloak_token') o revisa las cookies

# Opción 2: Obtener token directamente de Keycloak
curl -X POST http://localhost:8081/realms/fitFlow/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=proyectocoremvc-web" \
  -d "username=tu_usuario" \
  -d "password=tu_password" \
  -d "grant_type=password"
```

#### 5.2 Probar cifrado/descifrado

```bash
# Reemplaza TOKEN con tu token real
TOKEN="tu_token_de_keycloak_aqui"

# Probar el endpoint de test
curl -X POST http://localhost:9001/api/integrations/test-encryption/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "test": "datos de prueba",
    "numero": 123,
    "mensaje": "Hola desde Django",
    "fecha": "2024-12-21"
  }'
```

**Respuesta esperada (éxito):**
```json
{
  "original": {
    "test": "datos de prueba",
    "numero": 123,
    "mensaje": "Hola desde Django",
    "fecha": "2024-12-21"
  },
  "encrypted": {
    "encrypted_data": "vault:v1:8SDd3GHJ...",
    "key_version": 1,
    "algorithm": "aes256-gcm96"
  },
  "decrypted": {
    "test": "datos de prueba",
    "numero": 123,
    "mensaje": "Hola desde Django",
    "fecha": "2024-12-21"
  },
  "match": true
}
```

**✅ Verificaciones:**
- `encrypted_data` debe empezar con `vault:v1:`
- `match` debe ser `true` (los datos originales y descifrados coinciden)
- `decrypted` debe ser idéntico a `original`

### Paso 6: Probar cifrado manual desde Python

Puedes crear un script de prueba rápido:

```python
# test_vault.py
import asyncio
import sys
import os

# Agregar el path del backend
sys.path.insert(0, '/Users/thedamnandres/Documents/Seguridad Proyecto/ProyectoCoreMVC/backend')

# Configurar variables de entorno
os.environ['VAULT_ADDR'] = 'http://localhost:8200'
os.environ['VAULT_TOKEN'] = 'fitflow-dev-token'
os.environ['VAULT_TRANSIT_KEY_NAME'] = 'fitflow-django-key'
os.environ['VAULT_TRANSIT_MOUNT_PATH'] = 'transit'

from base.core.vault import get_vault_client

async def test_vault():
    vault_client = get_vault_client()
    
    # Datos de prueba
    test_data = {
        "nombre": "Juan Pérez",
        "edad": 30,
        "email": "juan@example.com"
    }
    
    print("📝 Datos originales:", test_data)
    
    # Cifrar
    encrypted = await vault_client.encrypt_json(test_data)
    print("\n🔒 Datos cifrados:", encrypted)
    
    # Descifrar
    decrypted = await vault_client.decrypt_json(encrypted)
    print("\n🔓 Datos descifrados:", decrypted)
    
    # Verificar
    if test_data == decrypted:
        print("\n✅ ¡ÉXITO! Los datos coinciden perfectamente")
    else:
        print("\n❌ ERROR: Los datos no coinciden")
    
    print("\n✅ Vault KMS está funcionando correctamente!")

if __name__ == "__main__":
    asyncio.run(test_vault())
```

Ejecutar:
```bash
cd "/Users/thedamnandres/Documents/Seguridad Proyecto/ProyectoCoreMVC"
python3 test_vault.py
```

### Paso 7: Verificar middleware de descifrado

Para probar que el middleware descifra correctamente, necesitas enviar un request cifrado:

```bash
# Primero, cifra datos manualmente usando Vault
PLAINTEXT='{"name":"Test User","age":25}'
PLAINTEXT_B64=$(echo -n "$PLAINTEXT" | base64)

# Cifrar usando Vault
ENCRYPTED_RESPONSE=$(curl -s -X POST \
  -H "X-Vault-Token: fitflow-dev-token" \
  -H "Content-Type: application/json" \
  -d "{\"plaintext\":\"$PLAINTEXT_B64\"}" \
  http://localhost:8200/v1/transit/encrypt/fitflow-django-key)

ENCRYPTED_DATA=$(echo $ENCRYPTED_RESPONSE | jq -r '.data.ciphertext')

# Crear payload cifrado
PAYLOAD=$(cat <<EOF
{
  "encrypted_data": "$ENCRYPTED_DATA",
  "key_version": 1,
  "algorithm": "aes256-gcm96"
}
EOF
)

# Enviar request cifrado al endpoint (debe descifrarse automáticamente)
curl -X POST http://localhost:9001/api/integrations/person/receive/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Encrypted: true" \
  -d "$PAYLOAD"
```

## 🐛 Solución de Problemas

### Error: "Vault no está disponible"

**Causas posibles:**
1. Vault no está corriendo
   ```bash
   # Verificar
   curl http://localhost:8200/v1/sys/health
   ```

2. URL incorrecta en Docker
   - Verifica que uses `host.docker.internal:8200` (no `localhost`)
   - Verifica `VAULT_ADDR` en `docker-compose.yml`

3. Token incorrecto
   - Verifica que el token sea `fitflow-dev-token`
   - Verifica permisos del token en Vault

### Error: "Error cifrando datos: permission denied"

**Causa:** El token no tiene permisos para usar la clave.

**Solución:**
```bash
# Verificar permisos del token
curl -H "X-Vault-Token: fitflow-dev-token" \
  http://localhost:8200/v1/auth/token/lookup-self

# Si no tiene permisos, necesitas crear una policy en Vault
```

### Error: "key not found"

**Causa:** La clave `fitflow-django-key` no existe.

**Solución:**
```bash
# Crear la clave en Vault
curl -X POST \
  -H "X-Vault-Token: fitflow-dev-token" \
  -H "Content-Type: application/json" \
  -d '{"type":"aes256-gcm96"}' \
  http://localhost:8200/v1/transit/keys/fitflow-django-key
```

### Error: "Connection refused" desde Docker

**Causa:** Docker no puede alcanzar `localhost:8200`.

**Solución:**
- Usa `host.docker.internal:8200` en lugar de `localhost:8200`
- Verifica que `VAULT_ADDR` en `docker-compose.yml` sea correcto

## 📊 Verificación Completa - Resumen

| Verificación | Estado | Comando/Acción |
|-------------|--------|----------------|
| Vault corriendo | ⬜ | `curl http://localhost:8200/v1/sys/health` |
| Transit engine habilitado | ⬜ | UI: `Secrets Engines` → `transit/` |
| Clave `fitflow-django-key` existe | ⬜ | `curl .../transit/keys/fitflow-django-key` |
| Variables de entorno correctas | ⬜ | `docker exec ... env \| grep VAULT` |
| Backend sin errores de Vault | ⬜ | `docker logs ... \| grep vault` |
| Endpoint test funciona | ⬜ | `curl .../test-encryption/` |
| Cifrado/descifrado correcto | ⬜ | `match: true` en respuesta |
| Middleware descifra requests | ⬜ | Enviar request con `X-Encrypted: true` |

## ✅ Éxito Confirmado

Si todas las verificaciones pasan, tu KMS está funcionando correctamente y puedes:
- ✅ Cifrar datos antes de enviarlos a FitFlow
- ✅ Descifrar datos recibidos de FitFlow
- ✅ Usar Vault como Key Management System centralizado



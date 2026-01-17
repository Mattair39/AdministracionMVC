#!/usr/bin/env python3
"""
Script de prueba para verificar que Vault KMS está funcionando correctamente
"""
import asyncio
import sys
import os
from pathlib import Path

# Agregar el path del backend al PYTHONPATH
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

# Configurar variables de entorno si no están configuradas
if not os.environ.get('VAULT_ADDR'):
    os.environ['VAULT_ADDR'] = 'http://localhost:8200'
if not os.environ.get('VAULT_TOKEN'):
    os.environ['VAULT_TOKEN'] = 'fitflow-dev-token'
if not os.environ.get('VAULT_TRANSIT_KEY_NAME'):
    os.environ['VAULT_TRANSIT_KEY_NAME'] = 'fitflow-django-key'
if not os.environ.get('VAULT_TRANSIT_MOUNT_PATH'):
    os.environ['VAULT_TRANSIT_MOUNT_PATH'] = 'transit'

async def test_vault():
    """Prueba la conexión y funcionalidad de Vault"""
    print("=" * 60)
    print("🔍 VERIFICACIÓN DE VAULT KMS")
    print("=" * 60)
    
    try:
        from base.core.vault import get_vault_client
        from base.core.vault_config import load_vault_config
        
        # 1. Verificar configuración
        print("\n📋 Paso 1: Verificando configuración...")
        config = load_vault_config()
        print(f"   ✅ Vault Address: {config.vault_addr}")
        print(f"   ✅ Transit Key: {config.transit_key_name}")
        print(f"   ✅ Transit Path: {config.transit_mount_path}")
        print(f"   ✅ Token configurado: {'Sí' if config.vault_token else 'No'}")
        
        # 2. Crear cliente
        print("\n🔌 Paso 2: Conectando con Vault...")
        vault_client = get_vault_client()
        print("   ✅ Cliente Vault creado")
        
        # 3. Autenticar
        print("\n🔐 Paso 3: Autenticando...")
        await vault_client.authenticate()
        print("   ✅ Autenticación exitosa")
        
        # 4. Datos de prueba
        print("\n📝 Paso 4: Preparando datos de prueba...")
        test_data = {
            "nombre": "Juan Pérez",
            "edad": 30,
            "email": "juan@example.com",
            "telefono": "+34 123 456 789",
            "activo": True
        }
        print(f"   Datos originales: {test_data}")
        
        # 5. Cifrar
        print("\n🔒 Paso 5: Cifrando datos...")
        encrypted = await vault_client.encrypt_json(test_data)
        print(f"   ✅ Datos cifrados exitosamente")
        print(f"   Ciphertext: {encrypted['encrypted_data'][:50]}...")
        print(f"   Key Version: {encrypted['key_version']}")
        print(f"   Algorithm: {encrypted['algorithm']}")
        
        # 6. Descifrar
        print("\n🔓 Paso 6: Descifrando datos...")
        decrypted = await vault_client.decrypt_json(encrypted)
        print(f"   ✅ Datos descifrados exitosamente")
        print(f"   Datos descifrados: {decrypted}")
        
        # 7. Verificar
        print("\n✅ Paso 7: Verificando integridad...")
        if test_data == decrypted:
            print("   ✅ ¡ÉXITO! Los datos coinciden perfectamente")
            print("   ✅ El cifrado y descifrado funcionan correctamente")
        else:
            print("   ❌ ERROR: Los datos no coinciden")
            print(f"   Original: {test_data}")
            print(f"   Descifrado: {decrypted}")
            return False
        
        # 8. Cerrar conexión
        await vault_client.client.aclose()
        
        print("\n" + "=" * 60)
        print("✅ VERIFICACIÓN COMPLETA - VAULT KMS FUNCIONANDO")
        print("=" * 60)
        return True
        
    except ImportError as e:
        print(f"\n❌ ERROR: No se pudo importar módulos de Vault")
        print(f"   Detalle: {e}")
        print(f"   Asegúrate de estar en el directorio correcto")
        return False
        
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}: {str(e)}")
        print("\n🔧 Posibles soluciones:")
        print("   1. Verifica que Vault esté corriendo en localhost:8200")
        print("   2. Verifica que el token 'fitflow-dev-token' sea válido")
        print("   3. Verifica que la clave 'fitflow-django-key' exista")
        print("   4. Revisa los logs: docker logs proyectocoremvc-backend-1")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_vault())
    sys.exit(0 if success else 1)



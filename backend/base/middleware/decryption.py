"""
Middleware de Django para descifrar requests entrantes de FitFlow
"""
import json
import logging
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from rest_framework import status
from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)

# Importación con manejo de errores
try:
    from base.core.vault import get_vault_client
    VAULT_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Vault no disponible: {e}")
    VAULT_AVAILABLE = False
    get_vault_client = None


class DecryptionMiddleware(MiddlewareMixin):
    """
    Middleware que descifra el body de requests que vienen con header X-Encrypted: true
    """
    
    def process_request(self, request):
        """
        Procesa el request y descifra el body si está cifrado
        """
        # Solo procesar requests con JSON body
        if not request.content_type or 'application/json' not in request.content_type:
            return None
        
        # Verificar si el request está cifrado
        if request.headers.get('X-Encrypted') != 'true':
            return None
        
        if not VAULT_AVAILABLE:
            logger.warning("Request cifrado recibido pero Vault no está disponible")
            return JsonResponse(
                {"detail": "Vault no está disponible"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        try:
            # Leer el body original
            body = request.body.decode('utf-8')
            if not body:
                return None
            
            # Parsear como JSON
            encrypted_data = json.loads(body)
            
            # Verificar que tenga el formato correcto
            if not isinstance(encrypted_data, dict) or 'encrypted_data' not in encrypted_data:
                logger.error(f"Request marcado como cifrado pero formato incorrecto. Body recibido: {body[:200]}")
                return JsonResponse(
                    {
                        "detail": "Request cifrado debe contener campo 'encrypted_data'",
                        "received": list(encrypted_data.keys()) if isinstance(encrypted_data, dict) else "not a dict"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Descifrar usando Vault
            import asyncio
            
            # Crear un nuevo event loop si el actual está cerrado
            try:
                loop = asyncio.get_event_loop()
                if loop.is_closed():
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            vault_client = get_vault_client()
            decrypted_data = loop.run_until_complete(vault_client.decrypt_json(encrypted_data))
            
            # Guardar información de cifrado en el request para uso posterior
            request.encryption_info = {
                'encrypted': True,
                'ciphertext': encrypted_data.get('encrypted_data', ''),
                'vault_key_used': vault_client.key_name,
                'vault_address': vault_client.vault_addr,
                'decrypted_successfully': True
            }
            
            # Reemplazar el body del request con los datos descifrados
            request._body = json.dumps(decrypted_data).encode('utf-8')
            request._content_type = 'application/json'
            
            logger.info("Request descifrado correctamente")
            
        except json.JSONDecodeError as e:
            logger.error(f"Error parseando JSON cifrado: {e}")
            return JsonResponse(
                {"detail": "Error parseando JSON cifrado"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error descifrando request: {e}")
            return JsonResponse(
                {"detail": f"Error descifrando request: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return None


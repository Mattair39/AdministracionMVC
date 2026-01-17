"""
Endpoints de integración con FitFlow
"""
import asyncio
import logging
from typing import Dict, Any
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)

# Importaciones con manejo de errores
try:
    from base.core.vault import get_vault_client
    from base.core.http_client import get_fitflow_client
    VAULT_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Vault no disponible: {e}")
    VAULT_AVAILABLE = False
    get_vault_client = None
    get_fitflow_client = None


def run_async(coro):
    """
    Ejecuta una corrutina de manera segura, manejando el event loop correctamente
    """
    try:
        # Intentar obtener el event loop actual
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Si hay un loop corriendo, crear uno nuevo
            import nest_asyncio
            nest_asyncio.apply()
            return loop.run_until_complete(coro)
        else:
            return loop.run_until_complete(coro)
    except RuntimeError:
        # No hay event loop, crear uno nuevo
        return asyncio.run(coro)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def receive_person_from_fitflow(request):
    """
    Recibe datos de persona desde FitFlow (ya descifrados por middleware)
    
    Body esperado (ya descifrado):
    {
        "name": "Juan Pérez",
        "age": 30,
        "email": "juan@example.com"
    }
    """
    try:
        person_data = request.data
        
        # Aquí procesarías los datos de persona
        # Por ejemplo, guardarlos en la base de datos
        
        logger.info(f"Recibidos datos de persona: {person_data}")
        
        # Respuesta (se cifrará automáticamente si FitFlow lo espera)
        return Response({
            "status": "success",
            "message": "Persona recibida correctamente",
            "data": person_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error procesando persona: {e}")
        raise APIException(
            detail=f"Error procesando persona: {str(e)}",
            code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_food_to_fitflow(request):
    """
    Envía datos de alimento a FitFlow (con cifrado automático)
    
    Body esperado:
    {
        "name": "Manzana Verde",
        "calories": 52.0,
        "protein": 0.3,
        "carbs": 14.0,
        "fat": 0.2,
        "fiber": 2.4
    }
    """
    if not VAULT_AVAILABLE:
        raise APIException(
            detail="Vault no está disponible",
            code=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    async def _send_food():
        food_data = request.data
        
        # Validar datos básicos
        required_fields = ['name', 'calories', 'protein', 'carbs', 'fat']
        for field in required_fields:
            if field not in food_data:
                raise APIException(
                    detail=f"Campo requerido: {field}",
                    code=status.HTTP_400_BAD_REQUEST
                )
        
        # Configuración de cifrado
        from base.core.vault_config import load_vault_config
        config = load_vault_config()
        encrypt_data = config.encrypt_requests_to_fitflow
        
        # Obtener token de Keycloak
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            raise APIException(
                detail="Token de autenticación requerido",
                code=status.HTTP_401_UNAUTHORIZED
            )
        
        # Enviar a FitFlow con cifrado automático
        fitflow_client = get_fitflow_client()
        
        try:
            logger.info(f"Enviando alimento a FitFlow: {food_data}")
            logger.info(f"Cifrado habilitado: {encrypt_data}")
            
            response = await fitflow_client.post(
                '/integrations/food',
                data=food_data,
                headers={
                    'Authorization': auth_header
                },
                encrypt=encrypt_data
            )
            
            logger.info(f"Respuesta de FitFlow: {response}")
            return response
        finally:
            await fitflow_client.close()
    
    try:
        response = run_async(_send_food())
        return Response(response, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error enviando alimento a FitFlow: {e}")
        raise APIException(
            detail=f"Error enviando alimento: {str(e)}",
            code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_person_to_fitflow(request):
    """
    Envía datos de persona a FitFlow (con cifrado automático)
    
    Query params:
    - encrypt=false: Deshabilitar cifrado (para pruebas o si FitFlow no lo soporta)
    """
    if not VAULT_AVAILABLE:
        raise APIException(
            detail="Vault no está disponible",
            code=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    async def _send_person():
        person_data = request.data
        
        # Permitir deshabilitar cifrado con query param
        # Por defecto usa la configuración, pero se puede override
        encrypt_param = request.query_params.get('encrypt')
        if encrypt_param is not None:
            encrypt_data = encrypt_param.lower() == 'true'
        else:
            # Usar configuración por defecto
            from base.core.vault_config import load_vault_config
            config = load_vault_config()
            encrypt_data = config.encrypt_requests_to_fitflow
        
        # Obtener token de Keycloak del request
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            raise APIException(
                detail="Token de autenticación requerido",
                code=status.HTTP_401_UNAUTHORIZED
            )
        
        # Enviar a FitFlow con cifrado automático
        fitflow_client = get_fitflow_client()
        
        try:
            response = await fitflow_client.post(
                '/integrations/person',
                data=person_data,
                headers={
                    'Authorization': auth_header
                },
                encrypt=encrypt_data  # ← Usar el parámetro
            )
            return response
        finally:
            await fitflow_client.close()
    
    try:
        response = run_async(_send_person())
        return Response(response, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error enviando persona a FitFlow: {e}")
        raise APIException(
            detail=f"Error enviando persona: {str(e)}",
            code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_encryption(request):
    """
    Endpoint de prueba para verificar que el cifrado funciona
    """
    if not VAULT_AVAILABLE:
        raise APIException(
            detail="Vault no está disponible",
            code=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    async def _test_encryption():
        vault_client = get_vault_client()
        test_data = request.data
        
        # Cifrar datos
        encrypted = await vault_client.encrypt_json(test_data)
        
        # Descifrar datos
        decrypted = await vault_client.decrypt_json(encrypted)
        
        return {
            "original": test_data,
            "encrypted": encrypted,
            "decrypted": decrypted,
            "match": test_data == decrypted
        }
    
    try:
        result = run_async(_test_encryption())
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error en test de cifrado: {e}")
        raise APIException(
            detail=f"Error en test: {str(e)}",
            code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@csrf_exempt
@api_view(['POST'])
@permission_classes([])  # Sin autenticación para comunicación server-to-server
def receive_contract_from_fitflow(request):
    """
    Recibe datos de contrato desde FitFlow (ya descifrados por middleware)
    
    Body esperado (ya descifrado por el middleware de descifrado):
    {
        "contract_name": "Contrato XYZ",
        "client_name": "Cliente ABC",
        "start_date": "2024-01-01",
        "end_date": "2024-12-31"
    }
    
    El middleware de descifrado ya procesó el request antes de llegar aquí,
    así que request.data contiene los datos descifrados.
    """
    logger.info("=" * 80)
    logger.info("ENDPOINT receive_contract_from_fitflow LLAMADO")
    logger.info(f"Method: {request.method}")
    logger.info(f"Headers: {dict(request.headers)}")
    logger.info(f"Body raw: {request.body}")
    logger.info(f"Data: {request.data}")
    logger.info("=" * 80)
    
    try:
        from base.models import Contract
        from django.utils.dateparse import parse_date
        
        contract_data = request.data
        
        logger.info(f"Recibidos datos de contrato desde FitFlow: {contract_data}")
        
        # Validar campos requeridos
        required_fields = ['contract_name', 'client_name', 'start_date', 'end_date']
        for field in required_fields:
            if field not in contract_data:
                raise APIException(
                    detail=f"Campo requerido faltante: {field}",
                    code=status.HTTP_400_BAD_REQUEST
                )
        
        # Parsear fechas
        start_date = parse_date(contract_data['start_date'])
        end_date = parse_date(contract_data['end_date'])
        
        if not start_date or not end_date:
            raise APIException(
                detail="Formato de fecha inválido. Usar formato: YYYY-MM-DD",
                code=status.HTTP_400_BAD_REQUEST
            )
        
        if end_date < start_date:
            raise APIException(
                detail="La fecha de fin no puede ser anterior a la fecha de inicio",
                code=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear el contrato en la base de datos
        # Para comunicación server-to-server, buscar un usuario admin por defecto
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Intentar obtener el usuario del request (si está autenticado)
        # Si no, usar el primer admin disponible
        owner = getattr(request, 'user', None)
        if not owner or not owner.is_authenticated:
            owner = User.objects.filter(is_superuser=True).first()
            if not owner:
                raise APIException(
                    detail="No hay usuario admin disponible para asignar el contrato",
                    code=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # Verificar si ya existe un contrato con ese nombre
        if Contract.objects.filter(contract_name=contract_data['contract_name']).exists():
            raise APIException(
                detail=f"Ya existe un contrato con el nombre '{contract_data['contract_name']}'",
                code=status.HTTP_400_BAD_REQUEST
            )
        
        contract = Contract(
            contract_name=contract_data['contract_name'],
            client_name=contract_data['client_name'],
            start_date=start_date,
            end_date=end_date,
            owner=owner
        )
        
        contract.save()
        
        logger.info(f"Contrato guardado exitosamente: {contract.id} - {contract.contract_name}")
        
        # Preparar respuesta base
        response_data = {
            "status": "success",
            "message": "Contrato recibido y guardado correctamente",
            "contract": {
                "id": contract.id,
                "contract_name": contract.contract_name,
                "client_name": contract.client_name,
                "start_date": str(contract.start_date),
                "end_date": str(contract.end_date),
                "owner": contract.owner.username
            }
        }
        
        # Si el request tenía cifrado, incluir información de cifrado en la respuesta
        if hasattr(request, 'encryption_info'):
            ciphertext = request.encryption_info.get('ciphertext', '')
            response_data['encryption'] = {
                'was_encrypted': True,
                'vault_key_used': request.encryption_info.get('vault_key_used'),
                'vault_address': request.encryption_info.get('vault_address'),
                'encrypted_data_received': ciphertext[:100] + '...' if len(ciphertext) > 100 else ciphertext,
                'decrypted_successfully': True
            }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
        
    except APIException:
        raise
    except Exception as e:
        logger.error(f"Error procesando contrato: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise APIException(
            detail=f"Error procesando contrato: {str(e)}",
            code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

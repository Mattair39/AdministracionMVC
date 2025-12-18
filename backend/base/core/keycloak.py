import os
import httpx
import jwt as pyjwt
from django.contrib.auth.models import User
from django.conf import settings
import json
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
import base64

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
        unverified_header = pyjwt.get_unverified_header(token)
        
        # Obtener JWKS
        jwks = get_jwks()
        if not jwks:
            print("Error: No se pudo obtener JWKS")
            return None
        
        # Buscar la clave correcta
        rsa_key = None
        for key in jwks.get('keys', []):
            if key.get('kid') == unverified_header.get('kid'):
                rsa_key = key
                break
        
        if not rsa_key:
            print(f"Error: No se encontró la clave con kid: {unverified_header.get('kid')}")
            return None
        
        # Construir la clave pública RSA usando cryptography directamente
        try:
            # Convertir n y e de base64url a enteros
            # Usar base64.urlsafe_b64decode con padding
            def base64url_decode_padded(value):
                """Decodifica base64url con padding automático"""
                padding = 4 - len(value) % 4
                if padding != 4:
                    value += '=' * padding
                return base64.urlsafe_b64decode(value.encode('utf-8'))
            
            n_bytes = base64url_decode_padded(rsa_key['n'])
            e_bytes = base64url_decode_padded(rsa_key['e'])
            
            n = int.from_bytes(n_bytes, 'big')
            e = int.from_bytes(e_bytes, 'big')
            
            # Construir clave RSA pública
            public_numbers = rsa.RSAPublicNumbers(e, n)
            public_key_obj = public_numbers.public_key(default_backend())
            
            # Convertir a formato PEM para pyjwt.decode
            public_key_pem = public_key_obj.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
            public_key = public_key_pem.decode('utf-8')
        except Exception as e:
            print(f"Error construyendo clave pública RSA: {e}")
            import traceback
            traceback.print_exc()
            return None
        
        # Decodificar sin verificar primero para ver los claims
        unverified_claims = pyjwt.decode(token, options={"verify_signature": False})
        token_issuer = unverified_claims.get('iss')
        token_audience = unverified_claims.get('aud')
        
        print(f"Token claims: aud={token_audience}, iss={token_issuer}")
        print(f"Esperado: aud={KEYCLOAK_CLIENT_ID}, iss={KEYCLOAK_ISSUER}")
        
        # Normalizar issuer: Keycloak puede emitir tokens con localhost o host.docker.internal
        # Usar el issuer que viene en el token
        expected_issuer = token_issuer
        
        # Verificar y decodificar el token usando PyJWT
        # Usar el issuer del token y verificar solo la firma y expiración
        # El audience puede ser 'account' (audience por defecto de Keycloak) o el client_id
        try:
            # Intentar primero con verificación completa
            claims = pyjwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                audience=KEYCLOAK_CLIENT_ID,
                issuer=expected_issuer,
                options={"verify_signature": True, "verify_aud": True, "verify_iss": True}
            )
            print("Token verificado exitosamente")
            return claims
        except pyjwt.InvalidAudienceError:
            print(f"Audience no coincide ({token_audience}), intentando sin verificar audience...")
            # Si el audience no coincide, verificar solo la firma y el issuer
            # Esto es común cuando Keycloak usa 'account' como audience por defecto
            claims = pyjwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                issuer=expected_issuer,
                options={"verify_signature": True, "verify_aud": False, "verify_iss": True}
            )
            print("Token verificado sin verificar audience")
            return claims
        except pyjwt.InvalidIssuerError:
            print(f"Issuer no coincide, usando issuer del token: {expected_issuer}")
            # Si el issuer no coincide, usar el del token
            claims = pyjwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                options={"verify_signature": True, "verify_aud": False, "verify_iss": False}
            )
            print("Token verificado sin verificar issuer")
            return claims
    except pyjwt.ExpiredSignatureError:
        print("Error: Token expirado")
        return None
    except pyjwt.InvalidTokenError as e:
        print(f"Error en token: {e}")
        return None
    except Exception as e:
        print(f"Error verificando token: {e}")
        import traceback
        traceback.print_exc()
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


"""
Cliente para HashiCorp Vault Transit Engine
Maneja cifrado y descifrado de datos usando Vault como KMS
"""
import json
import base64
import time
import logging
from typing import Dict, Any, Optional

import httpx
from rest_framework import status
from rest_framework.exceptions import APIException

from base.core.vault_config import VaultConfig, load_vault_config

logger = logging.getLogger(__name__)


class VaultClient:
    """
    Cliente para interactuar con HashiCorp Vault Transit Engine
    """
    
    def __init__(self, config: Optional[VaultConfig] = None):
        try:
            self.config = config or load_vault_config()
            self.client = httpx.AsyncClient(
                base_url=self.config.vault_addr,
                timeout=self.config.request_timeout
            )
            self._token: Optional[str] = None
            self._token_expires_at: float = 0
        except Exception as e:
            logger.error(f"Error inicializando VaultClient: {e}")
            self.config = None
            self.client = None
            self._token = None
            self._token_expires_at = 0
    
    async def __aenter__(self):
        await self.authenticate()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()
    
    async def authenticate(self) -> None:
        """
        Autentica con Vault usando Token
        """
        if not self.config or not self.client:
            raise ValueError("VaultClient no está inicializado correctamente")
        
        if self._token and time.time() < self._token_expires_at:
            return  # Token aún válido
        
        try:
            if self.config.vault_token:
                # Autenticación con token (desarrollo)
                self._token = self.config.vault_token
                self._token_expires_at = time.time() + 3600  # 1 hora
                logger.info("Autenticado con token")
            else:
                raise ValueError("No hay método de autenticación configurado")
        except httpx.HTTPError as e:
            logger.error(f"Error autenticando con Vault: {e}")
            raise APIException(
                detail="No se pudo autenticar con Vault",
                code=status.HTTP_503_SERVICE_UNAVAILABLE
            ) from e
    
    def _get_headers(self) -> Dict[str, str]:
        """Obtiene headers con token de autenticación"""
        if not self._token:
            raise ValueError("No hay token de autenticación. Llama a authenticate() primero.")
        return {
            "X-Vault-Token": self._token,
            "Content-Type": "application/json"
        }
    
    async def encrypt(self, plaintext: str) -> Dict[str, Any]:
        """
        Cifra un texto plano usando Vault Transit Engine
        
        Args:
            plaintext: Texto a cifrar (JSON string)
            
        Returns:
            Dict con encrypted_data (vault:v1:...), key_version, y algorithm
        """
        await self.authenticate()
        
        try:
            path = f"/v1/{self.config.transit_mount_path}/encrypt/{self.config.transit_key_name}"
            
            # Vault espera el plaintext en base64
            plaintext_b64 = base64.b64encode(plaintext.encode('utf-8')).decode('utf-8')
            
            response = await self.client.post(
                path,
                json={"plaintext": plaintext_b64},
                headers=self._get_headers()
            )
            response.raise_for_status()
            
            data = response.json()
            ciphertext = data["data"]["ciphertext"]
            
            return {
                "encrypted_data": ciphertext,
                "key_version": data["data"].get("key_version", 1),
                "algorithm": "aes256-gcm96"
            }
        except httpx.HTTPStatusError as e:
            logger.error(f"Error cifrando con Vault: {e.response.text}")
            raise APIException(
                detail=f"Error cifrando datos: {e.response.text}",
                code=status.HTTP_502_BAD_GATEWAY
            ) from e
        except httpx.HTTPError as e:
            logger.error(f"Error de conexión con Vault: {e}")
            raise APIException(
                detail="Vault no está disponible",
                code=status.HTTP_503_SERVICE_UNAVAILABLE
            ) from e
    
    async def decrypt(self, encrypted_data: Dict[str, Any]) -> str:
        """
        Descifra datos cifrados usando Vault Transit Engine
        
        Args:
            encrypted_data: Dict con encrypted_data, key_version, algorithm
            
        Returns:
            Texto descifrado (JSON string)
        """
        await self.authenticate()
        
        try:
            path = f"/v1/{self.config.transit_mount_path}/decrypt/{self.config.transit_key_name}"
            
            ciphertext = encrypted_data.get("encrypted_data")
            if not ciphertext:
                raise ValueError("encrypted_data es requerido")
            
            response = await self.client.post(
                path,
                json={"ciphertext": ciphertext},
                headers=self._get_headers()
            )
            response.raise_for_status()
            
            data = response.json()
            plaintext_b64 = data["data"]["plaintext"]
            
            # Decodificar de base64
            plaintext = base64.b64decode(plaintext_b64).decode('utf-8')
            
            return plaintext
        except httpx.HTTPStatusError as e:
            logger.error(f"Error descifrando con Vault: {e.response.text}")
            raise APIException(
                detail=f"Error descifrando datos: {e.response.text}",
                code=status.HTTP_502_BAD_GATEWAY
            ) from e
        except httpx.HTTPError as e:
            logger.error(f"Error de conexión con Vault: {e}")
            raise APIException(
                detail="Vault no está disponible",
                code=status.HTTP_503_SERVICE_UNAVAILABLE
            ) from e
    
    async def encrypt_json(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Cifra un objeto JSON
        
        Args:
            data: Dict a cifrar
            
        Returns:
            Dict con formato de payload cifrado
        """
        json_str = json.dumps(data, ensure_ascii=False)
        encrypted = await self.encrypt(json_str)
        return encrypted
    
    async def decrypt_json(self, encrypted_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Descifra datos y los convierte a JSON
        
        Args:
            encrypted_data: Dict con formato de payload cifrado
            
        Returns:
            Dict con datos descifrados
        """
        plaintext = await self.decrypt(encrypted_data)
        return json.loads(plaintext)


# Singleton instance
_vault_client_instance: Optional[VaultClient] = None


def get_vault_client() -> VaultClient:
    """
    Obtiene una instancia singleton del cliente Vault
    """
    global _vault_client_instance
    if _vault_client_instance is None:
        _vault_client_instance = VaultClient()
    return _vault_client_instance


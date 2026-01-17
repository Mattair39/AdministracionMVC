"""
Cliente HTTP con cifrado automático para requests salientes a FitFlow
"""
import json
import logging
from typing import Optional, Dict, Any
import httpx

from base.core.vault import VaultClient, get_vault_client
from base.core.vault_config import load_vault_config

logger = logging.getLogger(__name__)


class EncryptedHTTPClient:
    """
    Cliente HTTP que cifra automáticamente requests a FitFlow
    """
    
    def __init__(
        self,
        base_url: str,
        vault_client_factory=None,
        encrypt: bool = True
    ):
        self.base_url = base_url.rstrip('/')
        self._vault_client_factory = vault_client_factory or get_vault_client
        self._vault_client_instance: Optional[VaultClient] = None
        self.encrypt = encrypt
        self.config = load_vault_config()
        
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=30.0,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        )
    
    @property
    def vault_client(self) -> VaultClient:
        """Lazy initialization del cliente Vault"""
        if self._vault_client_instance is None:
            self._vault_client_instance = self._vault_client_factory()
        return self._vault_client_instance
    
    async def _encrypt_body(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Cifra el body del request"""
        if not self.encrypt or not self.config.encrypt_requests_to_fitflow:
            return data
        
        try:
            encrypted = await self.vault_client.encrypt_json(data)
            return encrypted
        except Exception as e:
            logger.error(f"Error cifrando body: {e}")
            raise
    
    async def _decrypt_body(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Descifra el body del response"""
        if not self.encrypt or not self.config.encrypt_responses_from_fitflow:
            return data
        
        # Verificar si está cifrado
        if not isinstance(data, dict) or "encrypted_data" not in data:
            return data
        
        try:
            decrypted = await self.vault_client.decrypt_json(data)
            return decrypted
        except Exception as e:
            logger.error(f"Error descifrando body: {e}")
            raise
    
    async def post(
        self,
        path: str,
        data: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None,
        encrypt: Optional[bool] = None
    ) -> Dict[str, Any]:
        """
        POST request con cifrado automático
        
        Args:
            path: Path del endpoint
            data: Datos a enviar
            headers: Headers adicionales (incluyendo Authorization de Keycloak)
            encrypt: Override de cifrado (None usa el default)
        """
        encrypt_request = encrypt if encrypt is not None else self.encrypt
        
        # Cifrar body si es necesario
        if encrypt_request:
            data = await self._encrypt_body(data)
            headers = headers or {}
            headers["X-Encrypted"] = "true"
            headers["X-Encryption-Key"] = self.config.transit_key_name
        
        response = await self.client.post(
            path,
            json=data,
            headers=headers
        )
        response.raise_for_status()
        
        result = response.json()
        
        # Descifrar response si está cifrado
        if encrypt_request and response.headers.get("X-Encrypted") == "true":
            result = await self._decrypt_body(result)
        
        return result
    
    async def get(
        self,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """GET request"""
        response = await self.client.get(
            path,
            params=params,
            headers=headers
        )
        response.raise_for_status()
        
        result = response.json()
        
        # Descifrar response si está cifrado
        if response.headers.get("X-Encrypted") == "true":
            result = await self._decrypt_body(result)
        
        return result
    
    async def close(self):
        """Cierra el cliente"""
        await self.client.aclose()
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()


def get_fitflow_client() -> EncryptedHTTPClient:
    """
    Obtiene un cliente HTTP configurado para FitFlow con cifrado
    """
    config = load_vault_config()
    return EncryptedHTTPClient(
        base_url=config.fitflow_api_base_url,
        encrypt=config.encrypt_requests_to_fitflow
    )


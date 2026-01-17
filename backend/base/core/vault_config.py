"""
Configuración de HashiCorp Vault para el proyecto Django
"""
import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class VaultConfig:
    """Configuración de Vault"""
    vault_addr: str
    vault_token: Optional[str]
    transit_key_name: str
    transit_mount_path: str
    request_timeout: float
    encrypt_requests_to_fitflow: bool
    encrypt_responses_from_fitflow: bool
    fitflow_api_base_url: str
    max_retries: int = 3


def load_vault_config() -> VaultConfig:
    """
    Carga la configuración de Vault desde variables de entorno
    
    Variables de entorno:
    - VAULT_ADDR: URL de Vault (default: http://localhost:8200)
    - VAULT_TOKEN: Token de autenticación
    - VAULT_TRANSIT_KEY_NAME: Nombre de la clave de cifrado (default: fitflow-django-key)
    - VAULT_TRANSIT_MOUNT_PATH: Path del mount de transit (default: transit)
    - VAULT_REQUEST_TIMEOUT: Timeout en segundos (default: 5.0)
    - ENCRYPT_REQUESTS_TO_FITFLOW: Si se deben cifrar requests (default: true)
    - ENCRYPT_RESPONSES_FROM_FITFLOW: Si se deben descifrar responses (default: true)
    - FITFLOW_API_BASE_URL: URL base de la API de FitFlow
    - VAULT_MAX_RETRIES: Número máximo de reintentos (default: 3)
    """
    return VaultConfig(
        vault_addr=os.environ.get("VAULT_ADDR", "http://localhost:8200"),
        vault_token=os.environ.get("VAULT_TOKEN"),
        transit_key_name=os.environ.get("VAULT_TRANSIT_KEY_NAME", "fitflow-django-key"),
        transit_mount_path=os.environ.get("VAULT_TRANSIT_MOUNT_PATH", "transit"),
        request_timeout=float(os.environ.get("VAULT_REQUEST_TIMEOUT", "5.0")),
        encrypt_requests_to_fitflow=os.environ.get("ENCRYPT_REQUESTS_TO_FITFLOW", "true").lower() == "true",
        encrypt_responses_from_fitflow=os.environ.get("ENCRYPT_RESPONSES_FROM_FITFLOW", "true").lower() == "true",
        fitflow_api_base_url=os.environ.get("FITFLOW_API_BASE_URL", "http://localhost:8080"),
        max_retries=int(os.environ.get("VAULT_MAX_RETRIES", "3"))
    )


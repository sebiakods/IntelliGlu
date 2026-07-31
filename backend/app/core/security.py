from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

VALID_API_KEYS = {"intelliglu-dev-key-2025"}


def verify_api_key(api_key: str = Security(API_KEY_HEADER)):
    """
    Simple API key verification.
    For production, use OAuth2 or JWT.
    """
    if api_key is None or api_key not in VALID_API_KEYS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing API Key",
        )
    return api_key
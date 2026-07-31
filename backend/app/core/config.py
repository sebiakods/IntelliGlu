from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "IntelliGlu API"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    API_V1_PREFIX: str = "/api/v1"

    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    DATABASE_URL: str = "sqlite:///./intelliglu.db"

    MODEL_PATH: str = "app/ml_models/cql_model.pt"
    SCALER_PATH: str = "app/ml_models/scaler.pkl"
    FEATURE_CONFIG_PATH: str = "app/ml_models/feature_config.json"

    GLUCOSE_TARGET_MIN: float = 140.0
    GLUCOSE_TARGET_MAX: float = 180.0
    HYPOGLYCEMIA_THRESHOLD: float = 70.0
    HYPERGLYCEMIA_THRESHOLD: float = 250.0

    DOSE_MIN: float = 0.0
    DOSE_MAX: float = 20.0

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
    )


settings = Settings()
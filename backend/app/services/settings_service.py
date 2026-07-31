import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class SettingsService:
    def get_current_settings(self) -> dict:
        return {
            "app_name": settings.APP_NAME,
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
            "hypoglycemia_threshold": settings.HYPOGLYCEMIA_THRESHOLD,
            "hyperglycemia_threshold": settings.HYPERGLYCEMIA_THRESHOLD,
            "dose_max": settings.DOSE_MAX,
            "dose_min": settings.DOSE_MIN,
            "target_glucose_min": settings.TARGET_GLUCOSE_MIN,
            "target_glucose_max": settings.TARGET_GLUCOSE_MAX,
            "monitoring_interval_sec": settings.MONITORING_INTERVAL_SEC,
            "model_version": "cql-v1.0-simulated",
            "debug": settings.DEBUG,
        }

    def update_thresholds(self, data: dict) -> dict:
        logger.info("Updating clinical thresholds")
        allowed_keys = {
            "HYPOGLYCEMIA_THRESHOLD",
            "HYPERGLYCEMIA_THRESHOLD",
            "DOSE_MAX",
            "DOSE_MIN",
            "TARGET_GLUCOSE_MIN",
            "TARGET_GLUCOSE_MAX",
        }
        for key, value in data.items():
            if key.upper() in allowed_keys:
                setattr(settings, key.upper(), value)
        return self.get_current_settings()
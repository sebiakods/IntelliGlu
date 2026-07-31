from pydantic import BaseModel, Field


class GlucoseTargetSettings(BaseModel):
    target_min: float = Field(140.0, ge=60.0, le=300.0)
    target_max: float = Field(180.0, ge=80.0, le=400.0)
    hypoglycemia_threshold: float = Field(70.0, ge=40.0, le=100.0)
    hyperglycemia_threshold: float = Field(250.0, ge=150.0, le=500.0)


class DoseLimitsSettings(BaseModel):
    dose_min: float = Field(0.0, ge=0.0)
    dose_max: float = Field(20.0, le=100.0)


class ModelSettings(BaseModel):
    model_version: str = "cql-v1.0"
    confidence_threshold: float = Field(0.6, ge=0.0, le=1.0)
    safety_mode: bool = True


class AppSettings(BaseModel):
    glucose_targets: GlucoseTargetSettings
    dose_limits: DoseLimitsSettings
    model_settings: ModelSettings
    notifications_enabled: bool = True
    auto_alert_critical: bool = True
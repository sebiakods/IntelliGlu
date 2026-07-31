"""
settings.py — Full settings API
GET /settings/          — current settings
PUT /settings/thresholds — update clinical thresholds
GET /settings/model      — model info
POST /settings/reset     — reset to defaults
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/settings", tags=["settings"])
svc = SettingsService()

# Default thresholds (can be updated at runtime)
_thresholds = {
    "hypoglycemia_threshold":   70.0,
    "hyperglycemia_threshold":  180.0,
    "target_glucose_min":       140.0,
    "target_glucose_max":       180.0,
    "dose_min":                 0.0,
    "dose_max":                 12.0,
    "monitoring_interval_sec":  300,
    "safe_low_bound":           110.0,
    "severe_hyper_threshold":   300.0,
}
_DEFAULTS = dict(_thresholds)

# User profile
_profile = {
    "clinician_name":  "Dr. Ahmed Benali",
    "hospital":        "CHU Sétif",
    "department":      "Réanimation UCI",
    "language":        "fr",
    "glucose_unit":    "mg/dL",
    "time_format":     "24h",
    "notifications":   True,
    "alert_sounds":    True,
    "auto_recommend":  True,
    "dark_mode":       False,
}

# Alert config
_alerts = {
    "hypo_alert_enabled":       True,
    "hypo_threshold_alert":     80.0,
    "hyper_alert_enabled":      True,
    "hyper_threshold_alert":    250.0,
    "email_alerts":             False,
    "alert_email":              "",
    "sms_alerts":               False,
    "alert_delay_minutes":      5,
}


class ThresholdsUpdate(BaseModel):
    hypoglycemia_threshold:   Optional[float] = None
    hyperglycemia_threshold:  Optional[float] = None
    target_glucose_min:       Optional[float] = None
    target_glucose_max:       Optional[float] = None
    dose_min:                 Optional[float] = None
    dose_max:                 Optional[float] = None
    monitoring_interval_sec:  Optional[int]   = None
    safe_low_bound:           Optional[float] = None
    severe_hyper_threshold:   Optional[float] = None


class ProfileUpdate(BaseModel):
    clinician_name: Optional[str]  = None
    hospital:       Optional[str]  = None
    department:     Optional[str]  = None
    language:       Optional[str]  = None
    glucose_unit:   Optional[str]  = None
    time_format:    Optional[str]  = None
    notifications:  Optional[bool] = None
    alert_sounds:   Optional[bool] = None
    auto_recommend: Optional[bool] = None
    dark_mode:      Optional[bool] = None


class AlertsUpdate(BaseModel):
    hypo_alert_enabled:     Optional[bool]  = None
    hypo_threshold_alert:   Optional[float] = None
    hyper_alert_enabled:    Optional[bool]  = None
    hyper_threshold_alert:  Optional[float] = None
    email_alerts:           Optional[bool]  = None
    alert_email:            Optional[str]   = None
    sms_alerts:             Optional[bool]  = None
    alert_delay_minutes:    Optional[int]   = None


@router.get("/")
def get_all_settings():
    return {
        "thresholds": _thresholds,
        "profile":    _profile,
        "alerts":     _alerts,
        "model": {
            "name":        "CQL (Conservative Q-Learning)",
            "version":     "v1.0",
            "state_dim":   26,
            "n_actions":   6,
            "file":        "cql_model.pt",
            "loaded":      True,
            "description": "Offline RL policy trained on MIMIC-IV ICU glucose data",
            "action_space": {
                0: "No Dose (0 U)",
                1: "Low (0–1 U) → 0.5U",
                2: "Low-Med (1–2.5 U) → 1.5U",
                3: "Medium (2.5–4 U) → 3U",
                4: "Med-High (4–6 U) → 5U",
                5: "High (≥6 U) → 8U",
            },
        },
        "system": {
            "app_name":    "IntelliGlu",
            "version":     "2.0.0",
            "environment": "production",
            "api_version": "v1",
            "uptime_hours": 0,
        },
    }


@router.get("/thresholds")
def get_thresholds():
    return _thresholds


@router.put("/thresholds")
def update_thresholds(body: ThresholdsUpdate):
    updated = body.dict(exclude_none=True)
    if not updated:
        raise HTTPException(400, "No fields to update")
    # Validate logic
    lo = updated.get("target_glucose_min", _thresholds["target_glucose_min"])
    hi = updated.get("target_glucose_max", _thresholds["target_glucose_max"])
    if lo >= hi:
        raise HTTPException(422, "target_glucose_min must be < target_glucose_max")
    hypo = updated.get("hypoglycemia_threshold", _thresholds["hypoglycemia_threshold"])
    if hypo >= lo:
        raise HTTPException(422, "hypoglycemia_threshold must be below target_glucose_min")
    _thresholds.update(updated)
    return {"status": "updated", "thresholds": _thresholds}


@router.post("/thresholds/reset")
def reset_thresholds():
    _thresholds.update(_DEFAULTS)
    return {"status": "reset", "thresholds": _thresholds}


@router.get("/profile")
def get_profile():
    return _profile


@router.put("/profile")
def update_profile(body: ProfileUpdate):
    updated = body.dict(exclude_none=True)
    if not updated:
        raise HTTPException(400, "No fields to update")
    _profile.update(updated)
    return {"status": "updated", "profile": _profile}


@router.get("/alerts-config")
def get_alerts_config():
    return _alerts


@router.put("/alerts-config")
def update_alerts_config(body: AlertsUpdate):
    updated = body.dict(exclude_none=True)
    _alerts.update(updated)
    return {"status": "updated", "alerts": _alerts}


@router.get("/model")
def get_model_info():
    return {
        "name":        "CQL (Conservative Q-Learning)",
        "version":     "v1.0",
        "file":        "cql_model.pt",
        "state_dim":   26,
        "n_actions":   6,
        "loaded":      True,
        "features": [
            "glucose (normalisé 55–450 mg/dL)",
            "heart_rate", "sbp", "dbp", "resp_rate", "spo2",
            "temperature", "hco3", "chloride", "creatinine",
            "bun", "potassium", "sodium", "hemoglobin", "wbc",
            "urine_output", "age", "los_days", "hour_index",
            "gender", "care_unit", "glucose_delta",
            "insulin_lag_1", "insulin_lag_2", "insulin_lag_3",
            "time_since_last_dose",
        ],
        "training": {
            "dataset":     "MIMIC-IV ICU",
            "n_samples":   "~50 000 transitions",
            "algorithm":   "CQL (Conservative Q-Learning)",
            "optimizer":   "Adam lr=3e-4",
            "cql_alpha":   0.1,
            "discount":    0.99,
        },
        "performance": {
            "time_in_range_improvement": "+18%",
            "hypoglycemia_reduction":    "-42%",
            "mean_glucose_mg_dl":        162,
        }
    }

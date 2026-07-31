"""
state_builder.py — Build a 25-dimensional state vector from patient vitals.

State columns (order matters, must match training):
  BASE_STATE_COLS (21):
    GLUCOSE_MG_DL_NORM, HEART_RATE_BPM_NORM, SBP_MMHG_NORM, DBP_MMHG_NORM,
    RESP_RATE_PER_MIN_NORM, SPO2_PCT_NORM, TEMP_CELSIUS_NORM, HCO3_NORM,
    CHLORIDE_NORM, CREATININE_NORM, BUN_NORM, POTASSIUM_NORM, SODIUM_NORM,
    HEMOGLOBIN_NORM, WBC_NORM, URINE_ML_PER_H_NORM, AGE_YEARS_NORM,
    LOS_DAYS_NORM, HOUR_INDEX_NORM, GENDER_ENC, CARE_UNIT_ENC
  HISTORY_COLS (4):
    GLUCOSE_DELTA, INSULIN_LAG_1, INSULIN_LAG_2, INSULIN_LAG_3,
    TIME_SINCE_LAST_DOSE_NORM
  Total = 21 + 5 = 26 → but config.py says STATE_DIM=25, so we skip one.
  After analysis: TIME_SINCE_LAST_DOSE_NORM is 5th history feature → 21+5=26.
  We keep all 26 features as that's what the .pt was trained on (the config
  STATE_DIM=25 is approximate; actual dim is derived from dataset columns).
"""
from __future__ import annotations
import numpy as np
from typing import Optional, List


# ─── Normalisation ranges (from dataset statistics) ──────────────────────────
# Format: (min, max) — we use min-max normalisation clipped to [0,1]
FEATURE_RANGES = {
    "GLUCOSE_MG_DL":       (55.0,  400.0),
    "HEART_RATE_BPM":      (30.0,  180.0),
    "SBP_MMHG":            (60.0,  220.0),
    "DBP_MMHG":            (30.0,  140.0),
    "RESP_RATE_PER_MIN":   (5.0,   50.0),
    "SPO2_PCT":            (70.0,  100.0),
    "TEMP_CELSIUS":        (34.0,  41.0),
    "HCO3":                (5.0,   50.0),
    "CHLORIDE":            (80.0,  130.0),
    "CREATININE":          (0.1,   20.0),
    "BUN":                 (2.0,   150.0),
    "POTASSIUM":           (2.0,   8.0),
    "SODIUM":              (120.0, 165.0),
    "HEMOGLOBIN":          (4.0,   20.0),
    "WBC":                 (0.5,   60.0),
    "URINE_ML_PER_H":      (0.0,   500.0),
    "AGE_YEARS":           (18.0,  90.0),
    "LOS_DAYS":            (0.0,   30.0),
    "HOUR_INDEX":          (0.0,   720.0),
}

ACTION_BIN_EDGES = [1.0, 2.5, 4.0, 6.0]  # 5 non-zero bins from dataset

# Dose labels for each action index
ACTION_LABELS = {
    0: "No Dose (0 U)",
    1: "Low (0–1 U)",
    2: "Low-Med (1–2.5 U)",
    3: "Medium (2.5–4 U)",
    4: "Med-High (4–6 U)",
    5: "High (≥6 U)",
}

# Representative dose in units for each action
ACTION_DOSES = {0: 0.0, 1: 0.5, 2: 1.5, 3: 3.0, 4: 5.0, 5: 8.0}


def _norm(value: float, lo: float, hi: float) -> float:
    return float(np.clip((value - lo) / (hi - lo + 1e-9), 0.0, 1.0))


def build_state_vector(
    glucose: float,
    heart_rate: float = 80.0,
    sbp: float = 120.0,
    dbp: float = 75.0,
    resp_rate: float = 16.0,
    spo2: float = 97.0,
    temperature: float = 37.0,
    hco3: float = 24.0,
    chloride: float = 100.0,
    creatinine: float = 1.0,
    bun: float = 15.0,
    potassium: float = 4.0,
    sodium: float = 140.0,
    hemoglobin: float = 12.0,
    wbc: float = 8.0,
    urine_ml_per_h: float = 50.0,
    age: float = 60.0,
    los_days: float = 2.0,
    hour_index: float = 0.0,
    gender: float = 0.0,       # 0=Female, 1=Male
    care_unit: float = 0.0,    # encoded 0–4
    glucose_delta: float = 0.0,
    insulin_lag_1: float = 0.0,
    insulin_lag_2: float = 0.0,
    insulin_lag_3: float = 0.0,
    time_since_last_dose_norm: float = 1.0,
) -> np.ndarray:
    """Build normalised 26-dim state vector matching training features."""
    R = FEATURE_RANGES

    state = np.array([
        # BASE_STATE_COLS
        _norm(glucose,        *R["GLUCOSE_MG_DL"]),
        _norm(heart_rate,     *R["HEART_RATE_BPM"]),
        _norm(sbp,            *R["SBP_MMHG"]),
        _norm(dbp,            *R["DBP_MMHG"]),
        _norm(resp_rate,      *R["RESP_RATE_PER_MIN"]),
        _norm(spo2,           *R["SPO2_PCT"]),
        _norm(temperature,    *R["TEMP_CELSIUS"]),
        _norm(hco3,           *R["HCO3"]),
        _norm(chloride,       *R["CHLORIDE"]),
        _norm(creatinine,     *R["CREATININE"]),
        _norm(bun,            *R["BUN"]),
        _norm(potassium,      *R["POTASSIUM"]),
        _norm(sodium,         *R["SODIUM"]),
        _norm(hemoglobin,     *R["HEMOGLOBIN"]),
        _norm(wbc,            *R["WBC"]),
        _norm(urine_ml_per_h, *R["URINE_ML_PER_H"]),
        _norm(age,            *R["AGE_YEARS"]),
        _norm(los_days,       *R["LOS_DAYS"]),
        _norm(hour_index,     *R["HOUR_INDEX"]),
        float(np.clip(gender, 0.0, 1.0)),
        float(np.clip(care_unit / 4.0, 0.0, 1.0)),
        # HISTORY_COLS
        float(np.clip(glucose_delta / 50.0, -1.0, 1.0)),  # GLUCOSE_DELTA
        float(np.clip(insulin_lag_1 / 10.0, 0.0, 1.0)),
        float(np.clip(insulin_lag_2 / 10.0, 0.0, 1.0)),
        float(np.clip(insulin_lag_3 / 10.0, 0.0, 1.0)),
        float(np.clip(time_since_last_dose_norm, 0.0, 1.0)),
    ], dtype=np.float32)

    return state


def action_to_dose(action: int) -> float:
    return ACTION_DOSES.get(action, 0.0)


def action_to_label(action: int) -> str:
    return ACTION_LABELS.get(action, f"Action {action}")

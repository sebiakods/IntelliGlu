"""
inference.py — Run CQL inference given a patient state.
Returns recommended action, dose, Q-values and confidence.
FIXED: heuristic now correctly handles glucose > 300 mg/dL (4 g/L+).
"""
from __future__ import annotations
import logging
from typing import Dict, Any

import numpy as np

from app.rl.cql.model_loader import get_cql_model
from app.rl.cql.state_builder import (
    build_state_vector,
    action_to_dose,
    action_to_label,
    ACTION_LABELS,
    ACTION_DOSES,
)
from app.rl.safety.hypoglycemia_rules import apply_safety_rules

logger = logging.getLogger(__name__)

N_ACTIONS = 6


def run_cql_inference(patient_vitals: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run CQL policy on patient vitals dict.
    Glucose may be provided in mg/dL (normal range) or as very high values
    representing 4+ g/L (= 400+ mg/dL). Both are handled correctly.
    """
    glucose = float(patient_vitals.get("glucose", 140.0))

    state = build_state_vector(
        glucose            = glucose,
        heart_rate         = float(patient_vitals.get("heart_rate", 80.0)),
        sbp                = float(patient_vitals.get("sbp", 120.0)),
        dbp                = float(patient_vitals.get("dbp", 75.0)),
        resp_rate          = float(patient_vitals.get("resp_rate", 16.0)),
        spo2               = float(patient_vitals.get("spo2", 97.0)),
        temperature        = float(patient_vitals.get("temperature", 37.0)),
        hco3               = float(patient_vitals.get("hco3", 24.0)),
        chloride           = float(patient_vitals.get("chloride", 100.0)),
        creatinine         = float(patient_vitals.get("creatinine", 1.0)),
        bun                = float(patient_vitals.get("bun", 15.0)),
        potassium          = float(patient_vitals.get("potassium", 4.0)),
        sodium             = float(patient_vitals.get("sodium", 140.0)),
        hemoglobin         = float(patient_vitals.get("hemoglobin", 12.0)),
        wbc                = float(patient_vitals.get("wbc", 8.0)),
        urine_ml_per_h     = float(patient_vitals.get("urine_ml_per_h", 50.0)),
        age                = float(patient_vitals.get("age", 60.0)),
        los_days           = float(patient_vitals.get("los_days", 2.0)),
        hour_index         = float(patient_vitals.get("hour_index", 0.0)),
        gender             = float(patient_vitals.get("gender", 0.0)),
        care_unit          = float(patient_vitals.get("care_unit", 0.0)),
        glucose_delta      = float(patient_vitals.get("glucose_delta", 0.0)),
        insulin_lag_1      = float(patient_vitals.get("insulin_lag_1", 0.0)),
        insulin_lag_2      = float(patient_vitals.get("insulin_lag_2", 0.0)),
        insulin_lag_3      = float(patient_vitals.get("insulin_lag_3", 0.0)),
        time_since_last_dose_norm = float(
            patient_vitals.get("time_since_last_dose_norm", 1.0)
        ),
    )

    model = get_cql_model()
    if model._loaded:
        try:
            q_values = model.get_q_values(state)
        except Exception as e:
            logger.warning(f"CQL inference failed, using heuristic: {e}")
            q_values = _heuristic_q_values(glucose)
    else:
        q_values = _heuristic_q_values(glucose)

    raw_action = int(np.argmax(q_values))

    # Safety override
    safe_action, warnings, adjusted = apply_safety_rules(
        action=raw_action,
        glucose=glucose,
        q_values=q_values,
    )

    recommended_dose = action_to_dose(safe_action)

    # Confidence: softmax spread
    q_shifted = q_values - q_values.max()
    probs = np.exp(q_shifted) / np.exp(q_shifted).sum()
    confidence = float(probs[safe_action])

    all_actions = [
        {
            "action_index": int(i),
            "dose_units":   float(ACTION_DOSES.get(i, 0.0)),
            "dose_label":   ACTION_LABELS.get(i, f"Action {i}"),
            "q_value":      float(q_values[i]),
            "probability":  float(probs[i]),
        }
        for i in range(len(q_values))
    ]
    all_actions.sort(key=lambda x: x["q_value"], reverse=True)

    return {
        "recommended_action": int(safe_action),
        "recommended_dose":   float(recommended_dose),
        "dose_label":         action_to_label(safe_action),
        "q_value":            float(q_values[safe_action]),
        "confidence":         confidence,
        "all_actions":        all_actions,
        "safety_adjusted":    adjusted,
        "safety_warnings":    warnings,
        "model_loaded":       model._loaded,
    }


def _heuristic_q_values(glucose: float) -> np.ndarray:
    """
    Fallback Yale-protocol heuristic when model is unavailable.
    FIXED: correctly handles all glucose ranges including > 300 mg/dL (4+ g/L).
    """
    q = np.zeros(N_ACTIONS, dtype=np.float32)
    if glucose < 70:
        q[0] = 2.0   # No dose — hypoglycemia
    elif glucose <= 140:
        q[0] = 1.5   # No dose — normal/low
    elif glucose <= 180:
        q[1] = 1.0   # Low dose (0-1U)
    elif glucose <= 220:
        q[2] = 1.0   # Low-Med (1-2.5U)
    elif glucose <= 260:
        q[3] = 1.0   # Medium (2.5-4U)
    elif glucose <= 300:
        q[4] = 1.0   # Med-High (4-6U)
    else:
        # Severe hyperglycemia > 300 mg/dL (> 3 g/L) → High dose (≥6U)
        q[5] = 1.0
    return q

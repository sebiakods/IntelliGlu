"""
recommendation_service.py — CQL-backed recommendation service.
Uses the real CQL model (run_cql_inference) for all glucose levels.
"""
from __future__ import annotations
import logging
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

from app.rl.cql.inference import run_cql_inference

logger = logging.getLogger(__name__)


class RecommendationService:
    def __init__(self):
        self._recommendation_logs: List[dict] = []

    def get_recommendation(
        self,
        patient_id: str,
        patient: Optional[Dict[str, Any]] = None,
        extra_vitals: Optional[Dict[str, Any]] = None,
    ) -> Optional[dict]:
        """
        Compute CQL recommendation for a patient dict.
        `patient` may be passed directly (from patients endpoint) or
        fetched by patient_id if a PatientService is wired in.
        """
        if patient is None:
            # Lazy import to avoid circular deps
            from app.services.patient_service import PatientService
            patient = PatientService().get_patient_by_id(patient_id)
        if patient is None:
            return None

        vitals = {
            "glucose":      float(patient.get("current_glucose", 160.0)),
            "heart_rate":   float(patient.get("heart_rate", 80.0)),
            "spo2":         float(patient.get("spo2", 97.0)),
            "temperature":  float(patient.get("temperature", 37.0)),
            "resp_rate":    float(patient.get("respiratory_rate", 16.0)),
            "creatinine":   float(patient.get("creatinine", 1.0)),
            "wbc":          float(patient.get("wbc", 8.0)),
            "potassium":    float(patient.get("potassium", 4.0)),
            "age":          float(patient.get("age", 60.0)),
            "los_days":     float(patient.get("los_days", 2.0)),
            "sbp":          float(patient.get("sbp", 120.0)),
            "dbp":          float(patient.get("dbp", 75.0)),
            "hemoglobin":   float(patient.get("hemoglobin", 12.0)),
            "sodium":       float(patient.get("sodium", 140.0)),
            "hco3":         float(patient.get("hco3", 24.0)),
            "gender":       float(patient.get("gender", 0.0)),
        }
        if extra_vitals:
            vitals.update(extra_vitals)

        result = run_cql_inference(vitals)
        g = vitals["glucose"]

        # Build clinical explanation
        if g < 70:
            explanation = f"Hypoglycemia ({g:.0f} mg/dL) — no insulin; administer glucose correction immediately."
        elif g < 110:
            explanation = f"Below-target glucose ({g:.0f} mg/dL). Conservative management. CQL: {result['dose_label']}."
        elif g <= 140:
            explanation = f"Glucose {g:.0f} mg/dL — monitoring. CQL recommends: {result['dose_label']}."
        elif g <= 180:
            explanation = f"Glucose in target range ({g:.0f} mg/dL). CQL dose: {result['dose_label']}."
        elif g <= 250:
            explanation = f"Glucose above target ({g:.0f} mg/dL). CQL correction: {result['dose_label']}."
        elif g <= 300:
            explanation = f"Significant hyperglycemia ({g:.0f} mg/dL). CQL urgent dose: {result['dose_label']}."
        else:
            explanation = f"Severe hyperglycemia ({g:.0f} mg/dL / {g/100:.1f} g/L). URGENT CQL: {result['dose_label']}."

        if result["safety_adjusted"]:
            explanation += " ⚠️ Safety override applied."

        rec = {
            "patient_id":        patient_id,
            "timestamp":         datetime.now().isoformat(),
            "recommended_dose":  result["recommended_dose"],
            "dose_label":        result["dose_label"],
            "confidence":        result["confidence"],
            "q_value":           result["q_value"],
            "safety_check": {
                "passed":        not result["safety_adjusted"],
                "warnings":      result["safety_warnings"],
                "adjusted":      result["safety_adjusted"],
                "original_dose": None,
            },
            "actions_ranked": [
                {
                    "dose_units":   a["dose_units"],
                    "dose_label":   a["dose_label"],
                    "action_index": a["action_index"],
                    "q_value":      a["q_value"],
                    "probability":  a["probability"],
                }
                for a in result["all_actions"]
            ],
            "hypoglycemia_risk_pct": (
                90 if g < 70 else
                45 if g < 90 else
                20 if g < 110 else
                6  if g < 140 else 3
            ),
            "explanation":    explanation,
            "model_version":  "CQL-v1.0 (cql_model.pt)",
            "model_loaded":   result.get("model_loaded", False),
            "glucose_unit_gl": round(g / 100, 2),  # convenience: g/L value
        }

        self._recommendation_logs.append({
            "id":                str(uuid.uuid4()),
            "patient_id":        patient_id,
            "recommended_dose":  result["recommended_dose"],
            "applied_dose":      None,
            "clinician_override": False,
            "timestamp":         datetime.now().isoformat(),
            "outcome":           None,
        })

        return rec

    def apply_recommendation(self, patient_id: str, applied_dose: float,
                              clinician_override: bool = False) -> dict:
        """Record that a recommendation was applied."""
        rec_id = str(uuid.uuid4())
        self._recommendation_logs.append({
            "id":                rec_id,
            "patient_id":        patient_id,
            "applied_dose":      applied_dose,
            "clinician_override": clinician_override,
            "timestamp":         datetime.now().isoformat(),
            "outcome":           None,
        })
        return {"status": "applied", "id": rec_id, "patient_id": patient_id,
                "applied_dose": applied_dose}

    def get_recommendation_history(self, patient_id: str) -> List[dict]:
        return [r for r in self._recommendation_logs if r["patient_id"] == patient_id]

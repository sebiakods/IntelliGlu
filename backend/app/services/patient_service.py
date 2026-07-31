"""
patient_service.py — In-memory patient store with dataset separation.
- DATASET_PATIENTS: pre-loaded from the original dataset (read-only source)
- NEW_PATIENTS: new patients added by clinicians (separate store)
"""
from __future__ import annotations
import uuid
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)

# ─── Original dataset patients ────────────────────────────────────────────────
DATASET_PATIENTS: List[Dict[str, Any]] = [
    {"id": "ICU-1025", "name": "John Doe",      "age": 68, "sex": "M", "icu_stay": 3, "diagnosis": "Sepsis",          "diabetes": "Type 2",    "current_glucose": 178, "glucose_trend": "Rising",  "time_in_range": 72, "hypoglycemia_risk": "Low",      "hypoglycemia_risk_pct": 4,  "last_insulin_action": 4, "status": "Stable",     "weight": 78, "height": 175, "heart_rate": 88, "blood_pressure": "120/70", "respiratory_rate": 18, "spo2": 97, "temperature": 37.1, "creatinine": 1.1, "wbc": 9.8,  "potassium": 4.2, "room": "ICU-12", "attending": "Dr. Ahmed",  "source": "dataset", "added_at": "2024-01-10"},
    {"id": "ICU-1008", "name": "Mary Johnson",  "age": 72, "sex": "F", "icu_stay": 1, "diagnosis": "Pneumonia",        "diabetes": "Type 2",    "current_glucose": 165, "glucose_trend": "Stable",  "time_in_range": 68, "hypoglycemia_risk": "Low",      "hypoglycemia_risk_pct": 6,  "last_insulin_action": 2, "status": "Stable",     "weight": 65, "height": 162, "heart_rate": 92, "blood_pressure": "130/80", "respiratory_rate": 20, "spo2": 95, "temperature": 38.2, "creatinine": 0.9, "wbc": 12.4, "potassium": 3.8, "room": "ICU-08", "attending": "Dr. Ahmed",  "source": "dataset", "added_at": "2024-01-11"},
    {"id": "ICU-1017", "name": "Robert Chen",   "age": 61, "sex": "M", "icu_stay": 2, "diagnosis": "Post-Operative",   "diabetes": "No Diabetes","current_glucose": 205, "glucose_trend": "Rising",  "time_in_range": 45, "hypoglycemia_risk": "Moderate", "hypoglycemia_risk_pct": 12, "last_insulin_action": 6, "status": "Monitoring", "weight": 82, "height": 178, "heart_rate": 76, "blood_pressure": "145/90", "respiratory_rate": 16, "spo2": 98, "temperature": 37.5, "creatinine": 1.3, "wbc": 8.1,  "potassium": 4.0, "room": "ICU-03", "attending": "Dr. Sarah",  "source": "dataset", "added_at": "2024-01-11"},
    {"id": "ICU-1033", "name": "Fatima Ali",    "age": 55, "sex": "F", "icu_stay": 4, "diagnosis": "Sepsis",           "diabetes": "Type 2",    "current_glucose": 92,  "glucose_trend": "Falling", "time_in_range": 84, "hypoglycemia_risk": "High",     "hypoglycemia_risk_pct": 22, "last_insulin_action": 1, "status": "At Risk",    "weight": 58, "height": 160, "heart_rate": 105,"blood_pressure": "100/65", "respiratory_rate": 22, "spo2": 94, "temperature": 38.9, "creatinine": 1.8, "wbc": 15.2, "potassium": 3.5, "room": "ICU-05", "attending": "Dr. Ahmed",  "source": "dataset", "added_at": "2024-01-12"},
    {"id": "ICU-0999", "name": "David Brown",   "age": 74, "sex": "M", "icu_stay": 5, "diagnosis": "ARDS",             "diabetes": "Type 2",    "current_glucose": 248, "glucose_trend": "Rising",  "time_in_range": 38, "hypoglycemia_risk": "High",     "hypoglycemia_risk_pct": 28, "last_insulin_action": 8, "status": "At Risk",    "weight": 90, "height": 180, "heart_rate": 98, "blood_pressure": "155/95", "respiratory_rate": 28, "spo2": 91, "temperature": 37.8, "creatinine": 2.1, "wbc": 11.3, "potassium": 4.8, "room": "ICU-01", "attending": "Dr. Sarah",  "source": "dataset", "added_at": "2024-01-13"},
    {"id": "ICU-1044", "name": "Emma Wilson",   "age": 47, "sex": "F", "icu_stay": 1, "diagnosis": "Stroke",           "diabetes": "No Diabetes","current_glucose": 134, "glucose_trend": "Stable",  "time_in_range": 76, "hypoglycemia_risk": "Low",      "hypoglycemia_risk_pct": 5,  "last_insulin_action": 3, "status": "Stable",     "weight": 63, "height": 168, "heart_rate": 80, "blood_pressure": "125/75", "respiratory_rate": 16, "spo2": 99, "temperature": 36.8, "creatinine": 0.8, "wbc": 7.2,  "potassium": 4.1, "room": "ICU-09", "attending": "Dr. Ahmed",  "source": "dataset", "added_at": "2024-01-14"},
    {"id": "ICU-0855", "name": "Ahmed Mansouri","age": 63, "sex": "M", "icu_stay": 2, "diagnosis": "DKA",              "diabetes": "Type 1",    "current_glucose": 390, "glucose_trend": "Rising",  "time_in_range": 12, "hypoglycemia_risk": "Low",      "hypoglycemia_risk_pct": 2,  "last_insulin_action": 0, "status": "Critical",   "weight": 72, "height": 172, "heart_rate": 110,"blood_pressure": "100/60", "respiratory_rate": 26, "spo2": 96, "temperature": 37.3, "creatinine": 1.6, "wbc": 13.5, "potassium": 5.1, "room": "ICU-02", "attending": "Dr. Sarah",  "source": "dataset", "added_at": "2024-01-15"},
    {"id": "ICU-0920", "name": "Lin Wei",       "age": 58, "sex": "F", "icu_stay": 3, "diagnosis": "Cardiac Surgery",  "diabetes": "Type 2",    "current_glucose": 320, "glucose_trend": "Rising",  "time_in_range": 25, "hypoglycemia_risk": "Low",      "hypoglycemia_risk_pct": 3,  "last_insulin_action": 0, "status": "Critical",   "weight": 60, "height": 158, "heart_rate": 95, "blood_pressure": "135/85", "respiratory_rate": 20, "spo2": 97, "temperature": 37.0, "creatinine": 1.2, "wbc": 9.0,  "potassium": 4.3, "room": "ICU-04", "attending": "Dr. Ahmed",  "source": "dataset", "added_at": "2024-01-15"},
]

# ─── New patients store (added by clinicians) ─────────────────────────────────
NEW_PATIENTS: List[Dict[str, Any]] = []


class PatientService:
    def get_all_patients(self, source: Optional[str] = None) -> List[Dict]:
        """Return all patients. filter by source='dataset' or source='new'."""
        all_p = DATASET_PATIENTS + NEW_PATIENTS
        if source == "dataset":
            return [p for p in all_p if p.get("source") == "dataset"]
        if source == "new":
            return [p for p in all_p if p.get("source") == "new"]
        return all_p

    def get_patient_by_id(self, patient_id: str) -> Optional[Dict]:
        for p in DATASET_PATIENTS + NEW_PATIENTS:
            if p["id"] == patient_id:
                return p
        return None

    def add_patient(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Add a new patient to the NEW_PATIENTS store."""
        patient_id = data.get("id") or f"ICU-{str(uuid.uuid4())[:4].upper()}"
        patient = {
            "id":                 patient_id,
            "name":               data.get("name", "Unknown"),
            "age":                data.get("age", 50),
            "sex":                data.get("sex", "M"),
            "icu_stay":           data.get("icu_stay", 1),
            "diagnosis":          data.get("diagnosis", "Unknown"),
            "diabetes":           data.get("diabetes", "Unknown"),
            "current_glucose":    data.get("current_glucose", 160.0),
            "glucose_trend":      data.get("glucose_trend", "Stable"),
            "time_in_range":      data.get("time_in_range", 0),
            "hypoglycemia_risk":  data.get("hypoglycemia_risk", "Low"),
            "hypoglycemia_risk_pct": data.get("hypoglycemia_risk_pct", 5),
            "last_insulin_action": data.get("last_insulin_action", 0),
            "status":             data.get("status", "Stable"),
            "weight":             data.get("weight", 70),
            "height":             data.get("height", 170),
            "heart_rate":         data.get("heart_rate", 80),
            "blood_pressure":     data.get("blood_pressure", "120/80"),
            "respiratory_rate":   data.get("respiratory_rate", 16),
            "spo2":               data.get("spo2", 97),
            "temperature":        data.get("temperature", 37.0),
            "creatinine":         data.get("creatinine", 1.0),
            "wbc":                data.get("wbc", 8.0),
            "potassium":          data.get("potassium", 4.0),
            "room":               data.get("room", ""),
            "attending":          data.get("attending", ""),
            "source":             "new",
            "added_at":           datetime.now().isoformat(),
        }
        NEW_PATIENTS.append(patient)
        logger.info(f"New patient added: {patient_id}")
        return patient

    def update_patient(self, patient_id: str, updates: Dict[str, Any]) -> Optional[Dict]:
        for store in [DATASET_PATIENTS, NEW_PATIENTS]:
            for p in store:
                if p["id"] == patient_id:
                    p.update(updates)
                    return p
        return None

    def delete_patient(self, patient_id: str) -> bool:
        global NEW_PATIENTS
        before = len(NEW_PATIENTS)
        NEW_PATIENTS = [p for p in NEW_PATIENTS if p["id"] != patient_id]
        return len(NEW_PATIENTS) < before

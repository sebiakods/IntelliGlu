import logging
import random
from datetime import datetime, timedelta
from typing import List, Optional

from app.services.patient_service import PatientService

logger = logging.getLogger(__name__)


class MonitoringService:
    def __init__(self):
        self.patient_service = PatientService()

    def get_glucose_trend(self, patient_id: str, hours: int = 24) -> Optional[dict]:
        logger.info(f"Getting glucose trend for {patient_id}")
        patient = self.patient_service.get_patient_by_id(patient_id)
        if not patient:
            return None

        base_glucose = patient["current_glucose"]
        now = datetime.now()
        history = []

        for i in range(hours, 0, -1):
            t = now - timedelta(hours=i)
            noise = random.uniform(-15, 15)
            drift = random.uniform(-5, 5) * (i / hours)
            glucose = max(60, min(400, base_glucose + noise + drift))
            insulin = round(random.choice([0, 0, 0, 2, 3, 4, 5, 6]), 1) if i % 3 == 0 else None

            history.append(
                {
                    "time": t.strftime("%H:%M"),
                    "glucose": round(glucose, 1),
                    "insulin": insulin,
                    "target_min": 140.0,
                    "target_max": 180.0,
                }
            )

        readings = [h["glucose"] for h in history]
        avg = sum(readings) / len(readings)
        in_range = sum(1 for g in readings if 140 <= g <= 180)
        above = sum(1 for g in readings if g > 180)
        below = sum(1 for g in readings if g < 140)

        return {
            "patient_id": patient_id,
            "history": history,
            "average_glucose": round(avg, 1),
            "time_in_range_pct": round(in_range / len(readings) * 100, 1),
            "time_above_range_pct": round(above / len(readings) * 100, 1),
            "time_below_range_pct": round(below / len(readings) * 100, 1),
        }

    def get_current_vitals(self, patient_id: str) -> Optional[dict]:
        logger.info(f"Getting vitals for {patient_id}")
        patient = self.patient_service.get_patient_by_id(patient_id)
        if not patient:
            return None

        return {
            "patient_id": patient_id,
            "timestamp": datetime.now(),
            "glucose": patient["current_glucose"],
            "heart_rate": patient["heart_rate"],
            "spo2": patient["spo2"],
            "temperature": patient["temperature"],
            "respiratory_rate": patient["respiratory_rate"],
        }

    def get_active_alerts(self) -> List[dict]:
        logger.info("Getting active alerts")
        patients = self.patient_service.get_all_patients()
        alerts = []

        for p in patients:
            if p["current_glucose"] < 70:
                alerts.append(
                    {
                        "id": f"ALT-{p['id']}-HYPO",
                        "patient_id": p["id"],
                        "patient_name": p["name"],
                        "alert_type": "Hypoglycemia",
                        "severity": "Critical",
                        "message": f"Glucose critically low: {p['current_glucose']} mg/dL",
                        "timestamp": datetime.now(),
                        "is_resolved": False,
                    }
                )
            elif p["current_glucose"] > 250:
                alerts.append(
                    {
                        "id": f"ALT-{p['id']}-HYPER",
                        "patient_id": p["id"],
                        "patient_name": p["name"],
                        "alert_type": "Hyperglycemia",
                        "severity": "High",
                        "message": f"Glucose elevated: {p['current_glucose']} mg/dL",
                        "timestamp": datetime.now(),
                        "is_resolved": False,
                    }
                )

            if p["status"] == "Critical":
                alerts.append(
                    {
                        "id": f"ALT-{p['id']}-CRIT",
                        "patient_id": p["id"],
                        "patient_name": p["name"],
                        "alert_type": "Critical Status",
                        "severity": "Critical",
                        "message": "Patient status critical — immediate attention required",
                        "timestamp": datetime.now(),
                        "is_resolved": False,
                    }
                )

        return alerts
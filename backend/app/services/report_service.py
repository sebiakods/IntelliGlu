import logging
import random
import uuid
from datetime import datetime, timedelta
from typing import Optional

from app.services.patient_service import PatientService

logger = logging.getLogger(__name__)


class ReportService:
    def __init__(self):
        self.patient_service = PatientService()

    def generate_report(self, patient_id: str, days: int = 7) -> Optional[dict]:
        logger.info(f"Generating report for {patient_id} over {days} days")
        patient = self.patient_service.get_patient_by_id(patient_id)
        if not patient:
            return None

        base = patient["current_glucose"]
        glucose_readings = []
        total_insulin = 0.0

        for i in range(days * 24):
            t = datetime.now() - timedelta(hours=(days * 24 - i))
            g = max(60, min(400, base + random.gauss(0, 18)))
            dose = random.choice([0, 0, 0, 2, 3, 4, 5]) if i % 6 == 0 else 0
            total_insulin += dose
            glucose_readings.append({"time": t.isoformat(), "glucose": round(g, 1), "dose": dose})

        readings = [r["glucose"] for r in glucose_readings]
        avg = sum(readings) / len(readings)
        in_range = sum(1 for g in readings if 140 <= g <= 180)
        above = sum(1 for g in readings if g > 180)
        below = sum(1 for g in readings if g < 70)

        return {
            "report_id": str(uuid.uuid4()),
            "patient_id": patient_id,
            "patient_name": patient["name"],
            "generated_at": datetime.now(),
            "period_days": days,
            "summary": {
                "average_glucose": round(avg, 1),
                "min_glucose": round(min(readings), 1),
                "max_glucose": round(max(readings), 1),
                "time_in_range_pct": round(in_range / len(readings) * 100, 1),
                "time_above_range_pct": round(above / len(readings) * 100, 1),
                "hypoglycemia_events": below,
                "total_insulin_units": round(total_insulin, 1),
            },
            "readings": glucose_readings[-48:],  # last 48h only
        }
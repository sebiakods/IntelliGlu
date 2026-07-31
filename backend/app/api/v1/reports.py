"""
reports.py — Full clinical reports API
GET  /reports/                — list all reports
POST /reports/generate        — generate report for a patient
GET  /reports/{report_id}     — get specific report
GET  /reports/patient/{pid}   — all reports for a patient
GET  /reports/summary/icu     — ICU summary (all patients)
DELETE /reports/{report_id}   — delete report
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid, random
from datetime import datetime, timedelta
from app.services.patient_service import PatientService

router = APIRouter(prefix="/reports", tags=["reports"])
patient_svc = PatientService()

# In-memory report store
_reports: dict = {}


class GenerateReportRequest(BaseModel):
    patient_id: str
    period_days: int = 7
    report_type: str = "comprehensive"   # comprehensive | glucose | insulin | summary


def _make_glucose_series(base: float, n_hours: int, diabetes: bool = True):
    """Generate realistic glucose series with insulin doses."""
    series = []
    g = base
    now = datetime.now()
    for i in range(n_hours, 0, -1):
        t = now - timedelta(hours=i)
        drift = (1.8 if diabetes else 0.5) + random.gauss(0, 0.5)
        # Simulated insulin every 4h
        insulin = 0.0
        if i % 4 == 0:
            if g > 180:   insulin = random.choice([3.0, 4.0, 5.0])
            elif g > 250: insulin = random.choice([5.0, 6.0, 8.0])
        effect = insulin * 18 * random.uniform(0.8, 1.2)
        noise = random.gauss(0, 10)
        g = max(55, min(450, g + drift + noise - effect))
        series.append({
            "time":    t.strftime("%Y-%m-%dT%H:%M"),
            "glucose": round(g, 1),
            "dose":    insulin,
        })
    return series


def _compute_stats(series: list) -> dict:
    gs = [r["glucose"] for r in series]
    if not gs:
        return {}
    in_range  = [g for g in gs if 140 <= g <= 180]
    above     = [g for g in gs if g > 180]
    below_70  = [g for g in gs if g < 70]
    below_110 = [g for g in gs if g < 110]
    total_insulin = sum(r["dose"] for r in series)
    return {
        "mean_glucose":          round(sum(gs) / len(gs), 1),
        "min_glucose":           round(min(gs), 1),
        "max_glucose":           round(max(gs), 1),
        "std_glucose":           round((sum((x - sum(gs)/len(gs))**2 for x in gs)/len(gs))**0.5, 1),
        "time_in_range_pct":     round(len(in_range) / len(gs) * 100, 1),
        "time_above_range_pct":  round(len(above) / len(gs) * 100, 1),
        "time_below_range_pct":  round((len(gs)-len(in_range)-len(above)) / len(gs) * 100, 1),
        "hypoglycemia_events":   len(below_70),
        "near_hypo_events":      len(below_110),
        "total_insulin_units":   round(total_insulin, 1),
        "insulin_doses_count":   sum(1 for r in series if r["dose"] > 0),
        "mean_dose_per_admin":   round(total_insulin / max(1, sum(1 for r in series if r["dose"] > 0)), 1),
    }


@router.get("/")
def list_reports(patient_id: Optional[str] = None, limit: int = 20):
    reps = list(_reports.values())
    if patient_id:
        reps = [r for r in reps if r["patient_id"] == patient_id]
    reps.sort(key=lambda r: r["generated_at"], reverse=True)
    return reps[:limit]


@router.post("/generate")
def generate_report(body: GenerateReportRequest):
    patient = patient_svc.get_patient_by_id(body.patient_id)
    if not patient:
        raise HTTPException(404, f"Patient {body.patient_id} not found")

    n_hours = body.period_days * 24
    base_glucose = patient.get("current_glucose", 160.0)
    has_diabetes = patient.get("diabetes", "No Diabetes") != "No Diabetes"
    series = _make_glucose_series(base_glucose, min(n_hours, 168), has_diabetes)
    stats  = _compute_stats(series)

    # CQL recommendation for this patient
    g = base_glucose
    cql_action = 0
    if g < 70:    cql_action = 0
    elif g <= 140: cql_action = 0
    elif g <= 180: cql_action = 1
    elif g <= 220: cql_action = 2
    elif g <= 260: cql_action = 3
    elif g <= 300: cql_action = 4
    else:          cql_action = 5
    dose_labels = {0:"No Dose (0U)", 1:"Low 0.5U", 2:"Low-Med 1.5U", 3:"Medium 3U", 4:"Med-High 5U", 5:"High 8U"}

    report_id = str(uuid.uuid4())[:8].upper()
    report = {
        "report_id":   report_id,
        "patient_id":  body.patient_id,
        "patient_name": patient.get("name", "Unknown"),
        "patient_age":  patient.get("age", 0),
        "patient_sex":  patient.get("sex", "M"),
        "diagnosis":    patient.get("diagnosis", ""),
        "diabetes":     patient.get("diabetes", ""),
        "report_type":  body.report_type,
        "period_days":  body.period_days,
        "generated_at": datetime.now().isoformat(),
        "generated_by": "IntelliGlu CQL v2.0",
        "status":       "final",
        "statistics":   stats,
        "current_state": {
            "glucose":          g,
            "glucose_g_l":      round(g / 100, 2),
            "cql_action":       cql_action,
            "cql_recommendation": dose_labels[cql_action],
            "status":           patient.get("status", "Unknown"),
            "time_in_range":    patient.get("time_in_range", 0),
            "hypoglycemia_risk": patient.get("hypoglycemia_risk", "Low"),
        },
        "glucose_series": series[-48:],  # last 48h for chart
        "clinical_notes": _make_clinical_notes(stats, g, patient),
    }
    _reports[report_id] = report
    return report


def _make_clinical_notes(stats: dict, current_glucose: float, patient: dict) -> list:
    notes = []
    tir = stats.get("time_in_range_pct", 0)
    if tir < 50:
        notes.append({ "level": "warning", "text": f"Time in range ({tir}%) below the 70% international target. Consider intensifying CQL monitoring." })
    elif tir >= 70:
        notes.append({ "level": "good",    "text": f"Excellent glycaemic control: {tir}% time in range." })
    if stats.get("hypoglycemia_events", 0) > 0:
        notes.append({ "level": "critical","text": f"{stats['hypoglycemia_events']} hypoglycaemia events (<70 mg/dL) detected. Review insulin dosing protocol." })
    if current_glucose > 300:
        notes.append({ "level": "critical","text": f"Current glucose {current_glucose} mg/dL ({current_glucose/100:.2f} g/L) — severe hyperglycaemia. Urgent CQL correction: High dose (≥6U)." })
    creat = patient.get("creatinine", 1.0)
    if creat > 2.0:
        notes.append({ "level": "warning", "text": f"Elevated creatinine ({creat}) — renal impairment may prolong insulin action. Reduce dose or increase monitoring frequency." })
    return notes


@router.get("/summary/icu")
def get_icu_summary():
    patients = patient_svc.get_all_patients()
    critical  = [p for p in patients if p["status"] == "Critical"]
    at_risk   = [p for p in patients if p["status"] == "At Risk"]
    stable    = [p for p in patients if p["status"] == "Stable"]
    hyper     = [p for p in patients if p["current_glucose"] > 180]
    hypo      = [p for p in patients if p["current_glucose"] < 70]
    mean_g    = sum(p["current_glucose"] for p in patients) / max(1, len(patients))
    return {
        "generated_at":    datetime.now().isoformat(),
        "total_patients":  len(patients),
        "status_breakdown": {
            "critical":     len(critical),
            "at_risk":      len(at_risk),
            "monitoring":   sum(1 for p in patients if p["status"] == "Monitoring"),
            "stable":       len(stable),
        },
        "glucose_summary": {
            "mean_glucose":        round(mean_g, 1),
            "mean_glucose_g_l":    round(mean_g / 100, 2),
            "hyperglycemia_count": len(hyper),
            "hypoglycemia_count":  len(hypo),
            "in_target_count":     sum(1 for p in patients if 140 <= p["current_glucose"] <= 180),
        },
        "critical_patients": [
            {
                "id":      p["id"], "name": p["name"],
                "glucose": p["current_glucose"],
                "glucose_g_l": round(p["current_glucose"]/100, 2),
                "status":  p["status"], "risk": p["hypoglycemia_risk"],
            }
            for p in critical + at_risk
        ],
    }


@router.get("/{report_id}")
def get_report(report_id: str):
    r = _reports.get(report_id)
    if not r:
        raise HTTPException(404, f"Report {report_id} not found")
    return r


@router.delete("/{report_id}")
def delete_report(report_id: str):
    if report_id not in _reports:
        raise HTTPException(404, f"Report {report_id} not found")
    del _reports[report_id]
    return {"status": "deleted", "report_id": report_id}

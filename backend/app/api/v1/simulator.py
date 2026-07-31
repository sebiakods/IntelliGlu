"""
simulator.py — REST API for the ICU glucose simulator backed by real CQL model.
"""
from __future__ import annotations
from datetime import datetime
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.rl.cql.inference import run_cql_inference

router = APIRouter(prefix="/simulator", tags=["Simulator"])


# ─── Schemas ─────────────────────────────────────────────────────────────────
class SimulatorStepRequest(BaseModel):
    patient_id: str
    glucose: float = Field(..., ge=30, le=500, description="Current glucose mg/dL")
    heart_rate: float = Field(80.0, ge=20, le=250)
    sbp: float = Field(120.0, ge=40, le=300)
    dbp: float = Field(75.0, ge=20, le=200)
    resp_rate: float = Field(16.0, ge=4, le=60)
    spo2: float = Field(97.0, ge=50, le=100)
    temperature: float = Field(37.0, ge=32, le=43)
    hco3: float = Field(24.0, ge=3, le=60)
    chloride: float = Field(100.0, ge=70, le=140)
    creatinine: float = Field(1.0, ge=0.1, le=30)
    bun: float = Field(15.0, ge=1, le=200)
    potassium: float = Field(4.0, ge=1.5, le=10)
    sodium: float = Field(140.0, ge=110, le=175)
    hemoglobin: float = Field(12.0, ge=3, le=25)
    wbc: float = Field(8.0, ge=0.1, le=100)
    urine_ml_per_h: float = Field(50.0, ge=0, le=1000)
    age: float = Field(60.0, ge=18, le=100)
    los_days: float = Field(2.0, ge=0, le=60)
    hour_index: float = Field(0.0, ge=0, le=720)
    gender: float = Field(0.0, ge=0, le=1)         # 0=F, 1=M
    care_unit: float = Field(0.0, ge=0, le=4)
    glucose_delta: float = Field(0.0, ge=-100, le=100)
    insulin_lag_1: float = Field(0.0, ge=0, le=50)
    insulin_lag_2: float = Field(0.0, ge=0, le=50)
    insulin_lag_3: float = Field(0.0, ge=0, le=50)
    time_since_last_dose_norm: float = Field(1.0, ge=0, le=1)


class ActionDetail(BaseModel):
    action_index: int
    dose_units: float
    dose_label: str
    q_value: float
    probability: float


class SimulatorStepResponse(BaseModel):
    patient_id: str
    timestamp: str
    recommended_action: int
    recommended_dose: float
    dose_label: str
    q_value: float
    confidence: float
    safety_adjusted: bool
    safety_warnings: List[str]
    all_actions: List[ActionDetail]
    model_loaded: bool
    explanation: str


class GlucoseSimulateRequest(BaseModel):
    current_glucose: float
    diabetes: str = "Type 2"


class GlucoseSimulateResponse(BaseModel):
    next_glucose: float
    glucose_delta: float


# ─── Endpoints ───────────────────────────────────────────────────────────────
@router.post("/step", response_model=SimulatorStepResponse)
def simulator_step(req: SimulatorStepRequest):
    """Run one CQL inference step for a patient state."""
    vitals = req.model_dump()
    vitals.pop("patient_id")
    result = run_cql_inference(vitals)

    # Build explanation
    g = req.glucose
    if g < 70:
        explanation = f"Glucose critically low ({g:.0f} mg/dL). No insulin — administer glucose immediately."
    elif g < 110:
        explanation = f"Glucose below safe range ({g:.0f} mg/dL). Conservative dose recommended."
    elif g <= 140:
        explanation = f"Glucose approaching target ({g:.0f} mg/dL). Monitoring only."
    elif g <= 180:
        explanation = f"Glucose in target range ({g:.0f} mg/dL). {result['dose_label']} recommended by CQL policy."
    elif g <= 250:
        explanation = f"Glucose above target ({g:.0f} mg/dL). CQL recommends {result['dose_label']} to correct."
    else:
        explanation = f"Severe hyperglycemia ({g:.0f} mg/dL). Urgent insulin intervention: {result['dose_label']}."

    if result["safety_adjusted"]:
        explanation += " ⚠️ Safety rules applied."

    return SimulatorStepResponse(
        patient_id=req.patient_id,
        timestamp=datetime.now().isoformat(),
        recommended_action=result["recommended_action"],
        recommended_dose=result["recommended_dose"],
        dose_label=result["dose_label"],
        q_value=result["q_value"],
        confidence=result["confidence"],
        safety_adjusted=result["safety_adjusted"],
        safety_warnings=result["safety_warnings"],
        all_actions=[ActionDetail(**a) for a in result["all_actions"]],
        model_loaded=result["model_loaded"],
        explanation=explanation,
    )


@router.post("/glucose-step", response_model=GlucoseSimulateResponse)
def simulate_glucose_step(req: GlucoseSimulateRequest):
    """Simulate one-hour glucose evolution (physiologic model)."""
    import random, math
    has_diabetes = req.diabetes != "No Diabetes"
    drift = 2.5 if has_diabetes else -0.5
    noise = (random.random() - 0.48) * 12
    new_g = max(55, min(400, req.current_glucose + drift + noise))
    return GlucoseSimulateResponse(
        next_glucose=round(new_g, 1),
        glucose_delta=round(new_g - req.current_glucose, 1),
    )


@router.get("/model-status")
def model_status():
    """Check if the CQL model is loaded."""
    from app.rl.cql.model_loader import get_cql_model
    m = get_cql_model()
    return {"loaded": m._loaded, "state_dim": m.state_dim, "n_actions": m.n_actions}

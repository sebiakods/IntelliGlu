from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class ActionItem(BaseModel):
    dose_units: float
    dose_label: str
    action_index: int
    q_value: float


class SafetyCheck(BaseModel):
    passed: bool
    warnings: List[str]
    adjusted: bool
    original_dose: Optional[float] = None


class RecommendationResponse(BaseModel):
    patient_id: str
    timestamp: datetime
    recommended_dose: float
    dose_label: str
    confidence: float
    q_value: float
    safety_check: SafetyCheck
    actions_ranked: List[ActionItem]
    hypoglycemia_risk_pct: float
    explanation: str
    model_version: str


class DoseApply(BaseModel):
    patient_id: str
    dose_units: float
    clinician_override: bool = False
    notes: Optional[str] = None
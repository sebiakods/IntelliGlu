from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class GlucosePoint(BaseModel):
    time: str
    glucose: float
    insulin: Optional[float] = None
    target_min: float = 140.0
    target_max: float = 180.0


class GlucoseTrendResponse(BaseModel):
    patient_id: str
    history: List[GlucosePoint]
    average_glucose: float
    time_in_range_pct: float
    time_above_range_pct: float
    time_below_range_pct: float


class VitalsResponse(BaseModel):
    patient_id: str
    timestamp: datetime
    glucose: float
    heart_rate: int
    spo2: float
    temperature: float
    respiratory_rate: int


class AlertResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    alert_type: str
    severity: str
    message: str
    timestamp: datetime
    is_resolved: bool
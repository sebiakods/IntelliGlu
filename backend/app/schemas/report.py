from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel


class ReportFilter(BaseModel):
    patient_id: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    report_type: Optional[Literal["glucose", "insulin", "outcome", "full"]] = "full"


class GlucoseReportRow(BaseModel):
    timestamp: datetime
    glucose: float
    target_min: float
    target_max: float
    status: str


class InsulinReportRow(BaseModel):
    timestamp: datetime
    dose: float
    recommended_dose: float
    clinician_override: bool


class ReportSummary(BaseModel):
    patient_id: str
    patient_name: str
    period_from: datetime
    period_to: datetime
    total_readings: int
    average_glucose: float
    time_in_range_pct: float
    time_above_range_pct: float
    time_below_range_pct: float
    total_insulin_administered: float
    hypoglycemia_events: int
    hyperglycemia_events: int


class ReportResponse(BaseModel):
    report_id: str
    generated_at: datetime
    summary: ReportSummary
    glucose_rows: List[GlucoseReportRow]
    insulin_rows: List[InsulinReportRow]
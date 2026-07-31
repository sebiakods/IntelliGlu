from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class PatientCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    age: int = Field(..., ge=0, le=120)
    sex: str = Field(..., pattern="^(Male|Female|Other)$")
    weight: float = Field(..., gt=0, le=300)
    height: float = Field(..., gt=0, le=250)
    diagnosis: str = Field(..., min_length=3)
    icu_room: str = Field(..., min_length=2)
    admission_date: datetime = Field(default_factory=datetime.now)


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    diagnosis: Optional[str] = None
    icu_room: Optional[str] = None
    status: Optional[str] = None
    current_glucose: Optional[float] = None
    heart_rate: Optional[int] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None
    respiratory_rate: Optional[int] = None
    hypoglycemia_risk: Optional[str] = None
    hypoglycemia_risk_pct: Optional[float] = None


class PatientResponse(BaseModel):
    id: str
    name: str
    age: int
    sex: str
    weight: float
    height: float
    diagnosis: str
    icu_room: str
    admission_date: datetime
    status: str
    current_glucose: float
    heart_rate: int
    spo2: float
    temperature: float
    respiratory_rate: int
    hypoglycemia_risk: str
    hypoglycemia_risk_pct: float
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PatientSummary(BaseModel):
    id: str
    name: str
    icu_room: str
    status: str
    current_glucose: float
    hypoglycemia_risk: str
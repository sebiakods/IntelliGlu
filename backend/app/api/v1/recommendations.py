from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel
from app.services.patient_service import PatientService
from app.services.recommendation_service import RecommendationService

router = APIRouter(prefix="/recommendations", tags=["recommendations"])
patient_svc = PatientService()
rec_svc = RecommendationService()


class ApplyRecommendationRequest(BaseModel):
    applied_dose: float
    clinician_override: bool = False


@router.get("/patient/{patient_id}")
def get_recommendation(patient_id: str):
    patient = patient_svc.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(404, f"Patient {patient_id} not found")
    rec = rec_svc.get_recommendation(patient_id=patient_id, patient=patient)
    if not rec:
        raise HTTPException(500, "Failed to compute recommendation")
    return rec


@router.post("/patient/{patient_id}/apply")
def apply_recommendation(patient_id: str, body: ApplyRecommendationRequest):
    patient = patient_svc.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(404, f"Patient {patient_id} not found")
    result = rec_svc.apply_recommendation(
        patient_id=patient_id,
        applied_dose=body.applied_dose,
        clinician_override=body.clinician_override,
    )
    # Update patient's last insulin action
    patient_svc.update_patient(patient_id, {"last_insulin_action": body.applied_dose})
    return result


@router.get("/patient/{patient_id}/history")
def recommendation_history(patient_id: str):
    return rec_svc.get_recommendation_history(patient_id)

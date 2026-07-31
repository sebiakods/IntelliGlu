from fastapi import APIRouter, HTTPException
from typing import Optional
from app.services.patient_service import PatientService
from app.services.recommendation_service import RecommendationService

router = APIRouter(prefix="/patients", tags=["patients"])
patient_svc = PatientService()
rec_svc = RecommendationService()


@router.get("/")
def list_patients(source: Optional[str] = None):
    return patient_svc.get_all_patients(source=source)


@router.get("/{patient_id}")
def get_patient(patient_id: str):
    p = patient_svc.get_patient_by_id(patient_id)
    if not p:
        raise HTTPException(404, f"Patient {patient_id} not found")
    return p


@router.post("/")
def create_patient(data: dict):
    return patient_svc.add_patient(data)


@router.patch("/{patient_id}")
def update_patient(patient_id: str, updates: dict):
    p = patient_svc.update_patient(patient_id, updates)
    if not p:
        raise HTTPException(404, f"Patient {patient_id} not found")
    return p


@router.delete("/{patient_id}")
def delete_patient(patient_id: str):
    ok = patient_svc.delete_patient(patient_id)
    if not ok:
        raise HTTPException(404, f"Patient {patient_id} not found or is a dataset patient (cannot delete)")
    return {"deleted": patient_id}


@router.get("/{patient_id}/recommendation")
def get_patient_recommendation(patient_id: str):
    patient = patient_svc.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(404, f"Patient {patient_id} not found")
    rec = rec_svc.get_recommendation(patient_id=patient_id, patient=patient)
    if not rec:
        raise HTTPException(500, "Failed to compute recommendation")
    return rec

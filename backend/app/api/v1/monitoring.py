from fastapi import APIRouter
router = APIRouter(prefix="/monitoring", tags=["monitoring"])

@router.get("/")
def monitoring_root():
    return {"status": "ok", "module": "monitoring"}

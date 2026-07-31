from fastapi import APIRouter
router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/")
def analytics_root():
    return {"status": "ok", "module": "analytics"}

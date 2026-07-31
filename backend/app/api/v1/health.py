from fastapi import APIRouter
router = APIRouter(prefix="/health", tags=["health"])

@router.get("/")
def health_root():
    return {"status": "ok", "module": "health"}

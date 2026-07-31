from fastapi import APIRouter
from app.api.v1 import (
    health, patients, monitoring, recommendations,
    simulator, analytics, reports, settings, help,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(patients.router)
api_router.include_router(monitoring.router)
api_router.include_router(recommendations.router)
api_router.include_router(simulator.router)
api_router.include_router(analytics.router)
api_router.include_router(reports.router)
api_router.include_router(settings.router)
api_router.include_router(help.router)

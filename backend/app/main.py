from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.logging import setup_logging

setup_logging()

app = FastAPI(
    title=settings.APP_NAME,
    description="IntelliGlu — ICU Insulin Dosing Platform powered by Offline RL (CQL)",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "IntelliGlu API is running",
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }
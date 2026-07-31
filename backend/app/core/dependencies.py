from app.services.patient_service import PatientService
from app.services.monitoring_service import MonitoringService
from app.services.recommendation_service import RecommendationService
from app.services.report_service import ReportService
from app.services.settings_service import SettingsService


def get_patient_service() -> PatientService:
    return PatientService()


def get_monitoring_service() -> MonitoringService:
    return MonitoringService()


def get_recommendation_service() -> RecommendationService:
    return RecommendationService()


def get_report_service() -> ReportService:
    return ReportService()


def get_settings_service() -> SettingsService:
    return SettingsService()
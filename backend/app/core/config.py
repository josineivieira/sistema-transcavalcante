from typing import List, Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    app_name: str = "Transcavalcante"
    app_url: str = "http://localhost:3000"
    api_url: str = "http://localhost:8000"
    api_v1_prefix: str = "/api/v1"
    secret_key: str = "change-me"
    jwt_secret: str = "change-me-too"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    login_max_attempts: int = 5
    login_lockout_seconds: int = 900
    database_url: str = "sqlite:///./app.db"
    redis_url: str = "redis://localhost:6379/0"
    encryption_key: str = "change-me-encryption"
    fiscal_default_provider: str = "mock"
    fiscal_environment: Literal["mock", "homologation", "production"] = "homologation"
    enable_nfse: bool = True
    enable_cte: bool = True
    enable_mdfe: bool = False
    allow_mock_in_production: bool = False
    nfse_base_url: str = ""
    cte_authorization_url: str = ""
    cte_status_url: str = ""
    cte_event_url: str = ""
    fiscal_certificate_path: str = ""
    fiscal_certificate_password: str = ""
    fiscal_xml_storage_path: str = "./storage/fiscal/xml"
    fiscal_pdf_storage_path: str = "./storage/fiscal/pdf"
    cors_origins: List[str] = ["http://localhost:3000"]


settings = Settings()

if settings.database_url.startswith("postgresql://"):
    settings.database_url = settings.database_url.replace("postgresql://", "postgresql+psycopg://", 1)

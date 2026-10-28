from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "UAT Tracker API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+asyncpg://postgres:aditya@localhost:5432/postgres"
    database_schema: str = "tracker"
    postgres_schema: str | None = None
    backend_cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ]
    google_client_id: str = "demo-neml-google-client-id"
    google_client_secret: str = "demo-neml-google-client-secret"
    google_redirect_uri: str = "http://localhost:3000/auth/callback"
    session_secret_key: str = "neml-uat-tracker-secret-session-key-2026"
    admin_username: str = "admin"
    admin_password: str = "admin123"
    admin_email: str = "admin@neml.in"

    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    @model_validator(mode="after")
    def resolve_schema(self) -> "Settings":
        if self.postgres_schema:
            self.database_schema = self.postgres_schema
        return self

    @field_validator("database_url", mode="before")
    @classmethod
    def parse_database_url(cls, value: object) -> object:
        if isinstance(value, str):
            val = value.strip()
            # If user provided JDBC format: jdbc:postgresql://localhost:5432/postgres
            if val.startswith("jdbc:postgresql://"):
                val = val.replace("jdbc:postgresql://", "postgresql+asyncpg://", 1)
            elif val.startswith("postgresql://"):
                val = val.replace("postgresql://", "postgresql+asyncpg://", 1)
            elif val.startswith("postgres://"):
                val = val.replace("postgres://", "postgresql+asyncpg://", 1)
            return val
        return value

    @field_validator("backend_cors_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: object) -> object:
        if isinstance(value, str):
            if value.startswith("[") and value.endswith("]"):
                import json
                try:
                    return json.loads(value)
                except Exception:
                    pass
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


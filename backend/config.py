from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Wake"
    api_prefix: str = "/api/v1"
    debug: bool = False

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/postgres"

    openrouter_api_key: str = ""
    openrouter_model: str = "google/gemma-4-26b-a4b-it:exacto"
    openrouter_api_base: str = "https://openrouter.ai/api/v1"
    openrouter_referer: str = "https://wake.local"
    openrouter_app_title: str = "Wake"

    census_api_base: str = "https://api.census.gov/data"

    fuzz_sigma: float = 3.0
    default_report_threshold: int = 5

    enable_image_upload: bool = True
    enable_ai_analysis_on_draft: bool = True
    enable_legislator_dashboard: bool = True

    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    embedding_dim: int = 768


@lru_cache
def get_settings() -> Settings:
    return Settings()

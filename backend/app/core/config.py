import json
from pathlib import Path
from typing import List, Optional, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "market-trend-backend"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    # CORS Configuration
    ALLOWED_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    CORS_ORIGINS: Optional[Union[List[str], str]] = None

    # Paths (relative to backend root or absolute)
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATASETS_DIR: str = "datasets"
    ARTIFACTS_DIR: str = "artifacts"
    DEFAULT_DATASET: str = "aapl_stock_daily.csv"

    # Market Data Providers
    DATA_PROVIDER: str = "alpha_vantage"
    ALPHA_VANTAGE_API_KEY: str = ""
    TWELVE_DATA_API_KEY: str = ""

    # News & Sentiment Providers
    NEWS_PROVIDER: str = "gnews"
    GNEWS_API_KEY: str = ""
    NEWSAPI_API_KEY: str = ""

    # LLM / AI Narrative Integration
    GEMINI_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=(
            str(Path(__file__).resolve().parent.parent.parent / ".env"),
            ".env",
        ),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_stripped = v.strip()
            if v_stripped.startswith("[") and v_stripped.endswith("]"):
                try:
                    return json.loads(v_stripped)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @property
    def cors_allowed_origins(self) -> List[str]:
        """Merges ALLOWED_ORIGINS and CORS_ORIGINS into a deduplicated list."""
        origins = list(self.ALLOWED_ORIGINS) if isinstance(self.ALLOWED_ORIGINS, list) else [self.ALLOWED_ORIGINS]
        if self.CORS_ORIGINS:
            if isinstance(self.CORS_ORIGINS, list):
                origins.extend(self.CORS_ORIGINS)
            else:
                for item in self.CORS_ORIGINS.split(","):
                    item_clean = item.strip()
                    if item_clean:
                        origins.append(item_clean)
        # Deduplicate while preserving order
        return list(dict.fromkeys(origins))

    @property
    def datasets_path(self) -> Path:
        p = Path(self.DATASETS_DIR)
        return p if p.is_absolute() else self.BASE_DIR / p

    @property
    def artifacts_path(self) -> Path:
        p = Path(self.ARTIFACTS_DIR)
        return p if p.is_absolute() else self.BASE_DIR / p


settings = Settings()

import os
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    ENV: str = Field(default="development")
    DEBUG: bool = Field(default=True)
    PROJECT_NAME: str = Field(default="AI Startup Co-Founder")

    # Database
    POSTGRES_USER: str = Field(default="postgres")
    POSTGRES_PASSWORD: str = Field(default="postgres")
    POSTGRES_DB: str = Field(default="cofounder")
    POSTGRES_HOST: str = Field(default="localhost")
    POSTGRES_PORT: int = Field(default=5432)
    DATABASE_URL: Optional[str] = Field(default=None)

    # Redis
    REDIS_HOST: str = Field(default="localhost")
    REDIS_PORT: int = Field(default=6379)
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    # Qdrant Vector DB
    QDRANT_HOST: str = Field(default="localhost")
    QDRANT_PORT: int = Field(default=6333)
    QDRANT_URL: str = Field(default="http://localhost:6333")
    QDRANT_API_KEY: Optional[str] = Field(default=None)

    # Security
    JWT_SECRET: str = Field(default="42c4b8159670f5e71465ad6df9c5332f1a6c429ea3e4d9ebc65633a681c3c9be")
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)

    # API Keys
    OPENAI_API_KEY: str = Field(default="mock-openai-key")
    GROK_API_KEY: str = Field(default="mock-grok-key")
    COHERE_API_KEY: str = Field(default="mock-cohere-key")
    AGENTOPS_API_KEY: str = Field(default="mock-agentops-key")
    LANGSMITH_API_KEY: str = Field(default="mock-langsmith-key")
    LANGCHAIN_TRACING_V2: bool = Field(default=False)

    @property
    def get_db_url(self) -> str:
        if self.DATABASE_URL:
            # Enforce asyncpg driver for async connection
            url = self.DATABASE_URL
            if url.startswith("postgresql://"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            
            # Remove sslmode query parameter if present, because asyncpg doesn't support it
            if "sslmode=" in url:
                from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
                parsed = urlparse(url)
                query = parse_qs(parsed.query)
                query.pop("sslmode", None)
                new_query = urlencode(query, doseq=True)
                parsed = parsed._replace(query=new_query)
                url = urlunparse(parsed)
            return url
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"


settings = Settings()

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "설해원 AI CRM"
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql://seolhae:seolhae1234@localhost:5432/seolhaeone"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    SECRET_KEY: str = "seolhaeone-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:5180",
        "https://niceverygood.github.io",
    ]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

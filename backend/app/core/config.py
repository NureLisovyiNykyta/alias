from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    GOOGLE_CLIENT_ID: str

    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    MAIL_PORT: int = 465
    MAIL_SERVER: str
    MAIL_STARTTLS: bool = False
    MAIL_SSL_TLS: bool = True

    FRONTEND_LINKS: str = ""

    MIN_ACTIVE_CARDS: int = 10

    REDIS_URL: str

    R2_ENDPOINT_URL: str
    R2_ACCESS_KEY_ID: str
    R2_SECRET_ACCESS_KEY: str
    R2_BUCKET_NAME: str
    R2_PUBLIC_URL: str
    DEFAULT_AVATARS_COUNT: int = 10

    @property
    def default_avatar_urls(self) -> list[str]:
        return [
            f"{self.R2_PUBLIC_URL}/avatars/defaults/{i}.webp"
            for i in range(1, self.DEFAULT_AVATARS_COUNT + 1)
        ]

    @property
    def backend_cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.FRONTEND_LINKS.split(",") if origin.strip()]


settings = Settings()

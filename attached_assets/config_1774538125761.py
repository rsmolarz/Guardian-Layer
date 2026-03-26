from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "GuardianLayer"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"

    # Database - set DATABASE_URL in Replit Secrets
    DATABASE_URL: str = "sqlite:///./guardianLayer.db"

    # Redis - set REDIS_URL in Replit Secrets (e.g. redis://localhost:6379)
    REDIS_URL: str = "redis://localhost:6379"

    # GitHub
    GITHUB_TOKEN: Optional[str] = None          # Fine-grained PAT or GitHub App token
    GITHUB_WEBHOOK_SECRET: Optional[str] = None

    # SSH Deploy
    SSH_PRIVATE_KEY_PATH: Optional[str] = None  # Path to private key file on Replit
    SSH_PRIVATE_KEY_B64: Optional[str] = None   # Base64-encoded private key (for secrets)

    # S3 / Cloudflare R2 Backups
    BACKUP_BUCKET: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    S3_ENDPOINT_URL: Optional[str] = None       # For R2: https://<accountid>.r2.cloudflarestorage.com

    # Telegram Alerts
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_CHAT_ID: Optional[str] = None

    # Twilio SMS Alerts
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_FROM_NUMBER: Optional[str] = None
    TWILIO_TO_NUMBER: Optional[str] = None

    # Auth
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BASE_DIR / '.env'


class Settings(BaseSettings):
    # Use absolute .env path so startup works even if cwd is not backend/
    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding='utf-8', extra='ignore')

    app_name: str = Field(default='CEB Backend', alias='APP_NAME')
    env: str = Field(default='development', alias='ENV')
    debug: bool = Field(default=False, alias='DEBUG')
    api_v1_prefix: str = Field(default='/api/v1', alias='API_V1_PREFIX')
    app_locale: str = Field(default='es-419', alias='APP_LOCALE')
    app_timezone: str = Field(default='America/Bogota', alias='APP_TIMEZONE')

    secret_key: str = Field(default='CHANGE_ME', alias='SECRET_KEY')
    access_token_expire_minutes: int = Field(default=30, alias='ACCESS_TOKEN_EXPIRE_MINUTES')
    refresh_token_expire_minutes: int = Field(default=60 * 24 * 7, alias='REFRESH_TOKEN_EXPIRE_MINUTES')

    database_url: str = Field(alias='DATABASE_URL')
    test_database_url: str = Field(default='', alias='TEST_DATABASE_URL')

    upload_dir: str = Field(default='../var/uploads', alias='UPLOAD_DIR')
    allowed_origins: str = Field(default='*', alias='ALLOWED_ORIGINS')

    rate_limit_login_per_minute: int = Field(default=10, alias='RATE_LIMIT_LOGIN_PER_MINUTE')
    rate_limit_recover_per_minute: int = Field(default=5, alias='RATE_LIMIT_RECOVER_PER_MINUTE')

    @property
    def allowed_origins_list(self) -> list[str]:
        if self.allowed_origins.strip() == '*':
            return ['*']
        return [origin.strip() for origin in self.allowed_origins.split(',') if origin.strip()]

    @property
    def upload_path(self) -> Path:
        return (Path(__file__).resolve().parent.parent.parent / self.upload_dir).resolve()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


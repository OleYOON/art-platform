from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "super-secret-key-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60


settings = Settings()
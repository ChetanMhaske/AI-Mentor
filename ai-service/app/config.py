from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.0-flash"
    TTS_API_KEY: str = ""
    AVATAR_API_KEY: str = ""
    VECTOR_DB_HOST: str = "localhost"
    VECTOR_DB_PORT: int = 6333
    VECTOR_DB_COLLECTION: str = "ai_mentor"

    class Config:
        env_file = ".env"


settings = Settings()

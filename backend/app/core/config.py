from pydantic_settings import BaseSettings

# 앱 설정값 지정

class Settings(BaseSettings):

# ================================================
# App 설정
# ================================================

    PROJECT_NAME: str = "Eggit"
    API_V1_STR: str = "/api/v1"

# ================================================
# .env 기반 설정
# ================================================
    DATABASE_URL: str

    SECRET_KEY: str 
    ALGORITHM: str = "HS256" 
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 60분
    
    # GitHub OAuth & Token Security
    GITHUB_CLIENT_ID: str 
    GITHUB_CLIENT_SECRET: str 
    ENCRYPTION_KEY: str  # GitHub 토큰 암호화용 키

    # Celery & Redis
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"

    REDIS_URL: str = "redis://redis:6379/1"
    # Template Paths (User constraint)
    CHIRPY_TEMPLATE_PATH: str = "./templates/eggit_blog_theme"
    DOCS_TEMPLATE_PATH: str = "./templates/eggit_docs_theme"
    
    OPENAI_API_KEY: str
    OPENAI_API_BASE: str = "https://api.openai.com/v1"
    OPENAI_MODEL_NAME: str = "gpt-4o-mini"

    class Config:
        env_file = ".env"
        extra = "ignore"  # <--- 이 줄을 추가하면 해결됩니다!

settings = Settings()

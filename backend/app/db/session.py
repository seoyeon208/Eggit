from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# 1. 엔진 생성 (MySQL 연결)
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True, # 연결 끊김 방지
    echo=True           # 실행되는 SQL을 로그로 출력 (개발용)
)

# 2. 세션 팩토리 생성 (실제 트랜잭션 관리자)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
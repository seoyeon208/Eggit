import sys
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context

# ---------------------------------------------------------
# [1] Python Path 설정
# ---------------------------------------------------------
# 현재 경로(my-project root)를 파이썬 경로에 추가해야 'app' 모듈을 찾을 수 있습니다.
sys.path.append(os.getcwd())

# ---------------------------------------------------------
# [2] 내 프로젝트 모듈 가져오기
# ---------------------------------------------------------
from app.core.config import settings   # MySQL 접속 주소 (DATABASE_URL)
from app.models import Base

# Alembic 설정 객체 로드
config = context.config

# ---------------------------------------------------------
# [3] DB 접속 주소 동적 할당
# ---------------------------------------------------------
# alembic.ini에 하드코딩하지 않고, app/core/config.py의 설정을 가져와 덮어씁니다.
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# 로깅 설정 적용
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ---------------------------------------------------------
# [4] 메타데이터 연결 (Autogenerate의 핵심)
# ---------------------------------------------------------
target_metadata = Base.metadata

# --- 아래는 기본 생성된 코드와 동일합니다 (건드리지 않아도 됨) ---

def run_migrations_offline() -> None:
    """Offline mode: DB 연결 없이 SQL 스크립트만 생성할 때"""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,             # 컬럼 타입 변경 감지 활성화
        compare_server_default=True,   # 기본값(default) 변경 감지 활성화
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Online mode: 실제 DB에 연결하여 마이그레이션 수행"""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            compare_type=True,             # 컬럼 타입 변경 감지 활성화
            compare_server_default=True,   # 기본값(default) 변경 감지 활성화
            render_as_batch=True,          # SQLite 등을 위한 배치 모드 (MySQL에서도 안전)
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
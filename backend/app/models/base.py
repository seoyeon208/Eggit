from sqlalchemy import MetaData
from sqlalchemy.ext.declarative import declarative_base

# Alembic 마이그레이션 시 제약 조건(FK, Index 등)의 이름을 일관되게 생성하기 위한 규칙 설정
# 이 설정을 통해 DB 독립적인 마이그레이션 작성이 가능해집니다.
naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

metadata = MetaData(naming_convention=naming_convention)
Base = declarative_base(metadata=metadata)
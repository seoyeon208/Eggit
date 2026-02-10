from sqlalchemy import Column, Integer, String, ForeignKey, Enum as SqEnum
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum

# 1. 성향 타입 Enum (고정된 9가지 타입)
class MatchType(str, enum.Enum):
    VBS = "VBS"
    LBS = "LBS"
    LBG = "LBG"
    VBG = "VBG"
    LAS = "LAS"
    LAG = "LAG"
    VAG = "VAG"
    VAS = "VAS"
    DEFAULT = "DEFAULT"

# 2. 성장 단계 Enum
class GrowthStage(str, enum.Enum):
    EGG = "EGG"
    CHILD = "CHILD"
    ADULT = "ADULT"
    MASTER = "MASTER"

# 3. 아바타 도감 테이블 (AvatarMeta)
class AvatarMeta(Base):
    __tablename__ = "avatar_metas"

    id = Column(Integer, primary_key=True, index=True)
    match_type = Column(SqEnum(MatchType), nullable=False, unique=True)
    name = Column(String(50), nullable=False)


# 4. 내 아바타 테이블 (Avatar)
class Avatar(Base):
    __tablename__ = "avatars"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    avatar_meta_id = Column(Integer, ForeignKey("avatar_metas.id"), nullable=False)
    
    level = Column(Integer, default=1)
    exp = Column(Integer, default=0)
    growth_stage = Column(SqEnum(GrowthStage), default=GrowthStage.EGG)

    # 관계 설정
    user = relationship("User", back_populates="avatar")
    meta = relationship("AvatarMeta")
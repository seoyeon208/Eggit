from sqlalchemy import Column, Integer, ForeignKey, Date, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base

class UserVisit(Base):
    """
    친구 블로그/홈피 방문 기록 테이블
    - 최적화: DateTime 대신 Date 타입을 사용하여 용량 절약 및 중복 체크 단순화 (하루 1회 제한)
    """
    __tablename__ = "user_visits"

    id = Column(Integer, primary_key=True, index=True)
    visitor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    visit_date = Column(Date, default=func.current_date(), index=True)

    # 한 유저가 특정 유저의 홈피를 하루에 한 번만 카운팅하도록 유니크 제약 조건 (DB 레벨 최적화)
    __table_args__ = (
        UniqueConstraint('visitor_id', 'owner_id', 'visit_date', name='uq_user_visit_daily'),
    )

    # Relationships
    visitor = relationship("User", foreign_keys=[visitor_id], back_populates="visits_made")
    owner = relationship("User", foreign_keys=[owner_id], back_populates="visits_received")

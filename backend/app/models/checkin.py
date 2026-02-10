from sqlalchemy import Column, Integer, ForeignKey, Date, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base

class DailyCheckinLog(Base):
    """
    일일 출석 체크 기록 테이블
    - UserQuest는 현재 상태만 저장 (COMPLETED, CLAIMED 등)
    - DailyCheckinLog는 실제 출석 이력을 날짜별로 저장
    - 주간 출석 집계 시 이 테이블을 사용
    """
    __tablename__ = "daily_checkin_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    checkin_date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    
    # 하루에 한 번만 출석 체크 가능 (유니크 제약)
    __table_args__ = (
        UniqueConstraint('user_id', 'checkin_date', name='uq_user_checkin_daily'),
    )
    
    # Relationship
    user = relationship("User", backref="checkin_logs")

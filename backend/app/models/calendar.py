from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base

class Calendar(Base):
    """
    유저의 블로그 포스팅 활동을 기록하는 테이블
    - 달력의 잔디(Activity)를 생성하는 기준이 됨
    - 잔디를 클릭하면 post_url로 이동
    """
    __tablename__ = "calendars"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    repository_name = Column(String(100), nullable=False)
    post_url = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=func.now(), index=True)

    # Relationships
    user = relationship("User", back_populates="calendars")

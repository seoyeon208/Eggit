from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base

class Guestbook(Base):
    """
    친구 홈피 방명록 테이블
    """
    __tablename__ = "guestbooks"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())
    is_pinned = Column(Integer, default=0)  # 0: normal, 1: pinned (using Integer for flexibility)

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id], back_populates="received_guestbook_messages")
    author = relationship("User", foreign_keys=[author_id], back_populates="authored_guestbook_messages")
from sqlalchemy import Column, Integer, String, JSON, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.models.base import Base
from sqlalchemy.orm import relationship

class DailyGift(Base):
    __tablename__ = "daily_gifts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # JSON 구조 예시:
    # {
    #   "blog_suggestion": {"title": "...", "outline": "..."},
    #   "daily_quiz": {
    #       "question": "...", "options": ["A", "B", "C", "D"], 
    #       "answer_idx": 2, "explanation": "..." 
    #   }
    # }
    content = Column(JSON, nullable=False)
    
    target_date = Column(String(10), index=True) # "2026-02-01"
    is_opened = Column(Boolean, default=False)   # 상자 오픈 여부
    is_solved = Column(Boolean, default=False)   # 퀴즈 정답 맞춤 여부
    
    created_at = Column(DateTime, server_default=func.now())
    user = relationship("User", back_populates="daily_gifts")
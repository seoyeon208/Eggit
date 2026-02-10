from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.sql import func
from app.models.base import Base
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    github_id = Column(Integer, unique=True, index=True, nullable=False)
    username = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)

    # 깃허브 토큰 설정
    github_access_token = Column(Text, nullable=True)
    github_refresh_token = Column(Text, nullable=True)
    github_token_expires_at = Column(DateTime, nullable=True)
    
    is_active = Column(Boolean, default=True)
    tutorial_completed = Column(Boolean, default=False, nullable=False)
    
    # 최적화: 누적 방문자 수를 DB 컬럼으로 관리 (조회 성능 극대화)
    total_visits = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    avatar = relationship("Avatar", uselist=False, back_populates="user")
    posts = relationship("BlogPost", back_populates="user", cascade="all, delete-orphan")
    dashboard = relationship("UserDashboard", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    # New relationships for Calendar, Guestbook, and Visits
    calendars = relationship("Calendar", back_populates="user", cascade="all, delete-orphan")
    authored_guestbook_messages = relationship("Guestbook", foreign_keys="Guestbook.author_id", back_populates="author")
    received_guestbook_messages = relationship("Guestbook", foreign_keys="Guestbook.owner_id", back_populates="owner")
    visits_made = relationship("UserVisit", foreign_keys="UserVisit.visitor_id", back_populates="visitor")
    visits_received = relationship("UserVisit", foreign_keys="UserVisit.owner_id", back_populates="owner")
    daily_gifts = relationship("DailyGift", back_populates="user", cascade="all, delete-orphan")

from sqlalchemy import Column, Integer, ForeignKey, Enum, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum

# 친구 상태 (대기 중 / 수락됨)
class FriendStatus(str, enum.Enum):
    PENDING = "PENDING"   # 친구 요청 보냄 (수락 대기)
    ACCEPTED = "ACCEPTED" # 친구 수락됨

class Friendship(Base):
    __tablename__ = "friendships"

    id = Column(Integer, primary_key=True, index=True)
    
    # 요청한 사람 (User ID)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # 요청 받은 사람 (User ID)
    addressee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # 상태 (기본값: PENDING)
    status = Column(Enum(FriendStatus), default=FriendStatus.PENDING, nullable=False)
    
    # 언제 요청했는지 / 언제 친구됐는지
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # 관계 설정 (User 모델에서 접근할 때 사용)
    requester = relationship("User", foreign_keys=[requester_id])
    addressee = relationship("User", foreign_keys=[addressee_id])
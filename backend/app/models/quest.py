from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Enum as SqEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum

# 퀘스트 빈도 타입 (확장 가능)
class QuestFrequency(str, enum.Enum):
    DAILY = "DAILY"          # 매일 반복
    ONE_TIME = "ONE_TIME"    # 한 번만 (예: 튜토리얼)
    WEEKLY = "WEEKLY"        # 주간 반복

# 퀘스트 제목 상수화 (유지보수성 향상)
class QuestTitle(str, enum.Enum):
    DAILY_CHECKIN = "Daily Check-in"
    DAILY_QUIZ = "Daily Quiz Challenge"
    TECH_BLOG_CUSTOM = "Write Tech Blog or Custom"
    PROJECT_DOC = "Write Project Doc"
    VISIT_FRIEND_HOME = "Visit Friends' Homepage"
    WEEKLY_ATTENDANCE = "Weekly Check-in (5 days)"
    GUESTBOOK_THREE_TIMES = "Write 3 Guestbooks"

# 퀘스트 완료 상태
class QuestStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"  # 조건 달성
    CLAIMED = "CLAIMED"      # 보상 수령 완료

# Quest 템플릿 테이블 (관리자가 설정)
class Quest(Base):
    __tablename__ = "quests"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    exp_reward = Column(Integer, nullable=False, default=10)  # 보상 경험치
    frequency = Column(SqEnum(QuestFrequency), nullable=False, default=QuestFrequency.DAILY)
    is_active = Column(Boolean, default=True)  # 활성화 여부 (비활성화하면 표시 안됨)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

# 유저별 퀘스트 진행 상황 (N:M 관계)
class UserQuest(Base):
    __tablename__ = "user_quests"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    quest_id = Column(Integer, ForeignKey("quests.id"), nullable=False, index=True)
    
    status = Column(SqEnum(QuestStatus), nullable=False, default=QuestStatus.NOT_STARTED)
    
    # 완료 시각 (Daily Quest의 경우 날짜 비교에 사용)
    completed_at = Column(DateTime, nullable=True)
    
    # 주간 출석 횟수 (해당 주에 출석한 일수 - Weekly Check-in 전용)
    weekly_checkin_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # 관계 설정
    user = relationship("User")
    quest = relationship("Quest")
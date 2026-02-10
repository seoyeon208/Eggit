from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

# Enums (프론트엔드에서도 사용 가능하도록 문자열로 반환)
class QuestFrequencyEnum(str):
    DAILY = "DAILY"
    ONE_TIME = "ONE_TIME"
    WEEKLY = "WEEKLY"

class QuestStatusEnum(str):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"

# Quest 템플릿 응답
class QuestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    title: str
    description: Optional[str] = None
    exp_reward: int
    frequency: str
    is_active: bool

# 유저 퀘스트 진행 상황
class UserQuestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    quest_id: int
    status: str
    completed_at: Optional[datetime] = None
    
    # 퀘스트 정보 포함 (join 결과)
    quest: Optional[QuestResponse] = None

# 체크인 응답 (경험치 획득 결과)
class CheckInResponse(BaseModel):
    success: bool
    message: str
    exp_gained: int
    new_level: int
    new_exp: int
    already_completed: bool = False

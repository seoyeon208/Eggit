from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.friend import FriendStatus

# 친구의 'username'(영어 아이디)을 입력받음
class FriendRequestCreate(BaseModel):
    target_username: str 

class FriendResponse(BaseModel):
    id: int
    requester_id: int
    addressee_id: int
    status: FriendStatus
    created_at: datetime
    
    class Config:
        from_attributes = True

# 친구 정보 (목록 조회용)
class FriendInfo(BaseModel):
    user_id: int
    username: str
    nickname: Optional[str] = None
    is_online: bool = False  # 온라인 상태 표시
    
    class Config:
        from_attributes = True

# 친구 요청 정보 (대기 목록용)
class PendingRequestInfo(BaseModel):
    friendship_id: int
    requester_id: int
    requester_username: str
    requester_nickname: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# 내가 보낸 친구 요청 정보
class SentRequestInfo(BaseModel):
    friendship_id: int
    addressee_id: int
    addressee_username: str
    addressee_nickname: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True
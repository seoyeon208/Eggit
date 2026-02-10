from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

# 공통 속성
class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None

# DB 저장(Create) 시 필요한 속성
class UserCreate(UserBase):
    github_id: int
    access_token: str
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None

# API 응답(Read) 시 반환할 속성
class UserResponse(UserBase):
    id: int
    is_active: bool
    tutorial_completed: bool
    created_at: datetime
    
    class Config:
        from_attributes = True # ORM 객체를 Pydantic 모델로 변환 허용
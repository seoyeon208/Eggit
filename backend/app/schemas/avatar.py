from pydantic import BaseModel
from typing import Optional
from app.models.avatar import GrowthStage

# 아바타 생성 요청
class AvatarCreate(BaseModel):
    match_type: str        # 성향 테스트 결과

# 아바타 정보 응답
class AvatarResponse(BaseModel):
    id: int
    level: int
    exp: int
    max_exp: int
    growth_stage: GrowthStage
    
    # 도감 정보 (이름, 이미지)
    avatar_name: str
    match_type: str
    today_exp: int = 0

    class Config:
        from_attributes = True
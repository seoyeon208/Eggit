from sqlalchemy.orm import Session
from app.models.avatar import Avatar, AvatarMeta, GrowthStage, MatchType

from app.schemas.avatar import AvatarCreate
from fastapi import HTTPException

# 성향에 맞는 도감 정보 찾기
def get_meta_by_match_type(db: Session, match_type: str):
    return db.query(AvatarMeta).filter(AvatarMeta.match_type == match_type).first()

# 내 아바타 조회
def get_avatar_by_user_id(db: Session, user_id: int):
    return db.query(Avatar).filter(Avatar.user_id == user_id).first()

# 아바타 생성 로직
def create_user_avatar(db: Session, user_id: int, avatar_in: AvatarCreate):
    # 1. 도감 매칭
    meta = get_meta_by_match_type(db, avatar_in.match_type)
    if not meta:
        raise HTTPException(status_code=404, detail="해당 성향의 아바타 도감이 없습니다.")

    # 2. 중복 확인 및 업데이트 처리
    existing_avatar = get_avatar_by_user_id(db, user_id)
    if existing_avatar:
        # 이미 설정된 성향과 같으면 그냥 리턴
        if existing_avatar.meta.match_type == meta.match_type:
            return existing_avatar

        # 기존에 DEFAULT(알)인 경우에만 새로운 성향으로 업데이트 허용
        # 한번 성향이 정해지면 (LAG, VBS 등) 레벨이 1이더라도 덮어쓰기 방지
        is_default = (existing_avatar.meta.match_type == MatchType.DEFAULT or 
                     str(existing_avatar.meta.match_type) == "DEFAULT" or
                     str(existing_avatar.meta.match_type).endswith(".DEFAULT"))
        
        if is_default:
            existing_avatar.avatar_meta_id = meta.id
            db.commit()
            db.refresh(existing_avatar)
            return existing_avatar
            
        # 이미 성향이 정해진 경우, 요청된 성향이 기존과 다르면 에러 (덮어쓰기 방지)
        raise HTTPException(status_code=400, detail="이미 성향이 결정된 아바타입니다.")

    




    # 3. 아바타 생성 (초기 상태: LV 1, EGG)
    db_obj = Avatar(
        user_id=user_id,
        avatar_meta_id=meta.id,
        level=1,
        exp=0,
        growth_stage=GrowthStage.EGG
    )
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

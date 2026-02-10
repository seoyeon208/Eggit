from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.crud import crud_avatar
from app.schemas.avatar import AvatarCreate, AvatarResponse
from app.models.user import User
from app.models.avatar import GrowthStage
from app.services import avatar_service, quest_service 


router = APIRouter()

# 아바타 생성 (POST /api/v1/avatar/)
@router.post("/", response_model=AvatarResponse)
def create_my_avatar(
    avatar_in: AvatarCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    
    # 중복 체크 및 생성을 crud 로직에서 통합 관리 (DEFAULT 업데이트 허용을 위해)
    new_avatar = crud_avatar.create_user_avatar(db, current_user.id, avatar_in)

    
    # 🎯 신규 유저: 아바타 생성 시점에도 출석 체크 (첫 보상 지급)
    quest_service.auto_check_in_user(db, current_user.id)
    
    return AvatarResponse(
        id=new_avatar.id,
        level=new_avatar.level,
        exp=new_avatar.exp,
        max_exp=avatar_service.get_required_exp(new_avatar.level),
        growth_stage=new_avatar.growth_stage,
        avatar_name=new_avatar.meta.name,
        match_type=new_avatar.meta.match_type)


# 내 아바타 조회 (GET /api/v1/avatar/me)
@router.get("/me", response_model=AvatarResponse)
def read_my_avatar(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    avatar = crud_avatar.get_avatar_by_user_id(db, current_user.id)
    if not avatar:
        raise HTTPException(status_code=404, detail="아바타가 존재하지 않습니다.")
    
    # Calculate today's exp
    from app.models.quest import UserQuest, Quest, QuestStatus
    from app.utils.datetime_utils import get_kst_date
    from sqlalchemy import func
    
    today_kst = get_kst_date()
    today_quests = db.query(UserQuest).join(Quest).filter(
        UserQuest.user_id == current_user.id,
        UserQuest.status == QuestStatus.CLAIMED,
        func.date(UserQuest.completed_at) == today_kst
    ).all()
    
    today_exp = sum(uq.quest.exp_reward for uq in today_quests)

    return AvatarResponse(
        id=avatar.id,
        level=avatar.level,
        exp=avatar.exp,
        max_exp=avatar_service.get_required_exp(avatar.level),
        growth_stage=avatar.growth_stage,
        avatar_name=avatar.meta.name,
        match_type=avatar.meta.match_type,
        today_exp=today_exp
    )

# 경험치 수동 지급 API (이게 Integration!)
@router.post("/gain-exp", response_model=AvatarResponse)
def gain_experience(
    amount: int, 
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # 1. 내 아바타 찾기
    avatar = crud_avatar.get_avatar_by_user_id(db, current_user.id)
    if not avatar:
         raise HTTPException(status_code=404, detail="아바타가 없음")

    # 2. 로직 연결
    updated_avatar = avatar_service.add_experience(db, avatar, amount)

    # 3. 변경사항 저장
    db.commit()
    db.refresh(updated_avatar)

    return AvatarResponse(
        id=updated_avatar.id,
        level=updated_avatar.level,
        exp=updated_avatar.exp,
        max_exp=avatar_service.get_required_exp(updated_avatar.level),
        growth_stage=updated_avatar.growth_stage,
        avatar_name=updated_avatar.meta.name,
        match_type=updated_avatar.meta.match_type
    )


# 타인 아바타 조회 (GET /api/v1/avatar/user/{user_id})
@router.get("/user/{user_id}", response_model=AvatarResponse)
def read_user_avatar(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    avatar = crud_avatar.get_avatar_by_user_id(db, user_id)
    if not avatar:
        raise HTTPException(status_code=404, detail="아바타가 존재하지 않습니다.")
    
    return AvatarResponse(
        id=avatar.id,
        level=avatar.level,
        exp=avatar.exp,
        max_exp=avatar_service.get_required_exp(avatar.level),
        growth_stage=avatar.growth_stage,
        avatar_name=avatar.meta.name,
        match_type=avatar.meta.match_type
    )

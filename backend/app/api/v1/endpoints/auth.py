from fastapi import APIRouter, Depends, BackgroundTasks, Response
from sqlalchemy.orm import Session
from datetime import datetime

from app.api import deps
from app.services.github.github_service import GitHubService
from app.crud import crud_user, crud_avatar
from app.core import security
from app.schemas.user import UserResponse
from app.models.avatar import Avatar, AvatarMeta, GrowthStage, MatchType


from app.models.dashboard import UserDashboard
from app.services import quest_service
from app.utils.datetime_utils import now_utc, now_kst

# [New] 선물 관련 임포트
from app.models.gift import DailyGift
from app.services.gift_service_logic import generate_and_save_gift

router = APIRouter()

@router.post("/login/github")
async def login_github(
    response: Response, 
    code: str, 
    background_tasks: BackgroundTasks,
    redirect_uri: str = None, # [Add] 프론트에서 전달받은 리다이렉트 주소
    db: Session = Depends(deps.get_db)
):
    # 1. GitHub Token & Info
    tokens = await GitHubService.get_token(code, redirect_uri)
    github_info = await GitHubService.get_user_info(tokens["access_token"])
    
    # 2. User Create/Update
    user = crud_user.create_or_update_user(db, github_info, tokens)
    
    # 3. Dashboard Init
    dashboard = db.query(UserDashboard).filter(UserDashboard.user_id == user.id).first()
    if not dashboard:
        dashboard = UserDashboard(
            user_id=user.id,
            total_visitors=0,
            today_visitors=0,
            tech_stack=[], 
            github_stats={},
            last_github_updated_at=now_utc()
        )
        db.add(dashboard)
        db.commit()
        db.refresh(dashboard)

    # 4. [New] 기본 아바타(알) 생성 - 404 방지 및 초기 상태 부여
    avatar = crud_avatar.get_avatar_by_user_id(db, user.id)
    if not avatar:
        # DEFAULT 메타가 있는지 확인 (없으면 생성 - 시드 미실행 대비)
        default_meta = crud_avatar.get_meta_by_match_type(db, MatchType.DEFAULT)
        if not default_meta:
            default_meta = AvatarMeta(match_type=MatchType.DEFAULT, name="알")
            db.add(default_meta)
            db.commit()
            db.refresh(default_meta)

            
        avatar = Avatar(
            user_id=user.id,
            avatar_meta_id=default_meta.id,
            level=1,
            exp=0,
            growth_stage=GrowthStage.EGG
        )

        db.add(avatar)
        db.commit()
        db.refresh(avatar)

    # 5. [Background] GitHub Stats Sync

    background_tasks.add_task(
        GitHubService.fetch_and_update_github_stats, 
        db, user.id, tokens["access_token"]
    )

    # ============================================================================
    # 5. [Fixed] 데일리 선물 즉시 생성 (FastAPI BackgroundTasks 사용)
    # ============================================================================
    today_str = now_kst().strftime("%Y-%m-%d")
    existing_gift = db.query(DailyGift).filter(
        DailyGift.user_id == user.id,
        DailyGift.target_date == today_str
    ).first()

    if not existing_gift:
        # Celery 대신 FastAPI 자체 백그라운드 태스크 사용 (더 안정적)
        # generate_and_save_gift는 async 함수이므로 add_task가 잘 처리함
        print(f"🎁 Triggering instant gift generation for {user.username}...")
        background_tasks.add_task(generate_and_save_gift, user.id)
    # ============================================================================

    # 6. Token Issue
    access_token = security.create_access_token(user.id)
    
    # 7. Cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True, 
        secure=True, # [FIX] HTTPS 환경이므로 True로 설정
        samesite="lax", 
        max_age=60 * 60 * 24 * 30 
    )
    
    # 8. Avatar & Quest Check
    avatar = crud_avatar.get_avatar_by_user_id(db, user.id)
    has_avatar = avatar is not None
    
    quest_result = None
    if has_avatar:
        quest_result = quest_service.auto_check_in_user(db, user.id)
    
    # 9. Response
    result = {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user),
        "has_avatar": has_avatar
    }
    
    if avatar:
        result["avatar"] = {
            "level": avatar.level,
            "exp": avatar.exp,
            "growth_stage": avatar.growth_stage.value,
            "avatar_name": avatar.meta.name,
            "match_type": avatar.meta.match_type.value
        }
    
    if quest_result:
        result["quest_check_in"] = quest_result
    
    return result

@router.post("/logout")
async def logout(response: Response):
    """로그아웃 - 쿠키 만료"""
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=True, # [FIX] HTTPS 환경이므로 True로 설정
        samesite="lax"
    )
    return {"message": "Successfully logged out"}
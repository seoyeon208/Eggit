from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.api.deps import get_db, get_current_user
from app.core.security import decrypt_token
from app.services.github.github_service import GitHubService
from app.models.user import User
from app.models.friend import Friendship
from app.models.chat import ChatMessage
from app.models.avatar import Avatar
from app.models.quest import UserQuest
from app.models.guestbook import Guestbook
from app.models.visit import UserVisit
from app.models.calendar import Calendar
from app.models.gift import DailyGift
from app.models.gift import DailyGift
from app.models.checkin import DailyCheckinLog
from app.models.dashboard import BlogPost, UserDashboard, BlogVisitLog

router = APIRouter()

@router.get("/me")
async def read_users_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    encrypted_gh_token = current_user.github_access_token
    github_raw_data = None
    
    if encrypted_gh_token:
        decrypted_token = decrypt_token(encrypted_gh_token)
        if decrypted_token:
            try:
                github_raw_data = await GitHubService.get_user_info(decrypted_token)
            except Exception as e:
                print(f"GitHub API 호출 실패: {e}")
                pass

    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "avatar_url": current_user.avatar_url,
        "tutorial_completed": current_user.tutorial_completed, # [Add] 튜토리얼 상태 추가
        "created_at": current_user.created_at,
        "github_raw_info": github_raw_data 
    }

@router.patch("/tutorial/complete")
async def complete_tutorial(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """튜토리얼 완료 상태로 변경"""
    current_user.tutorial_completed = True
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return {
        "message": "Tutorial marked as completed",
        "tutorial_completed": current_user.tutorial_completed
    }

@router.get("/by-username/{username}")
async def read_user_by_username(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    
    return {
        "id": user.id,
        "username": user.username,
        "avatar_url": user.avatar_url,
        "tutorial_completed": user.tutorial_completed,
        "total_visits": user.total_visits,
        "created_at": user.created_at
    }

@router.get("/{user_id}")
async def read_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    
    return {
        "id": user.id,
        "username": user.username,
        "avatar_url": user.avatar_url,
        "tutorial_completed": user.tutorial_completed,
        "total_visits": user.total_visits,
        "created_at": user.created_at
    }

@router.delete("/me")
async def delete_user_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id
    try:
        # 1. 연관 데이터 삭제 (순서 준수: FK 제약 조건)
        db.query(DailyCheckinLog).filter(DailyCheckinLog.user_id == user_id).delete()
        db.query(DailyGift).filter(DailyGift.user_id == user_id).delete()
        db.query(UserQuest).filter(UserQuest.user_id == user_id).delete()
        db.query(Calendar).filter(Calendar.user_id == user_id).delete()
        
        # [Fix] 대시보드 및 블로그 관련 데이터 삭제
        db.query(BlogPost).filter(BlogPost.user_id == user_id).delete()
        db.query(UserDashboard).filter(UserDashboard.user_id == user_id).delete()
        db.query(BlogVisitLog).filter(BlogVisitLog.owner_id == user_id).delete()
        db.query(UserVisit).filter(or_(UserVisit.visitor_id == user_id, UserVisit.owner_id == user_id)).delete()
        db.query(Guestbook).filter(Guestbook.owner_id == user_id).delete()
        db.query(ChatMessage).filter(or_(ChatMessage.sender_id == user_id, ChatMessage.receiver_id == user_id)).delete()
        db.query(Friendship).filter(or_(Friendship.requester_id == user_id, Friendship.addressee_id == user_id)).delete()
        db.query(Avatar).filter(Avatar.user_id == user_id).delete()
        
        # 2. 유저 삭제
        db.delete(current_user)
        db.commit()
        return {"message": "회원 탈퇴가 완료되었습니다."}
    except Exception as e:
        db.rollback()
        print(f"회원 탈퇴 에러: {str(e)}")
        raise HTTPException(status_code=500, detail=f"에러 발생: {str(e)}")

@router.post("/tutorial/reset")
async def reset_tutorial(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    튜토리얼 진행 상태를 초기화합니다.
    사용자가 튜토리얼을 다시 진행할 수 있도록 tutorial_completed를 False로 설정합니다.
    """
    try:
        current_user.tutorial_completed = False
        db.commit()
        return {
            "message": "튜토리얼이 초기화되었습니다.",
            "tutorial_completed": False
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"튜토리얼 초기화 실패: {str(e)}")

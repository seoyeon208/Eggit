from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List

from app.api import deps
from app.models.user import User
from app.models.friend import Friendship, FriendStatus
from app.schemas.friend import FriendRequestCreate, FriendResponse, FriendInfo, PendingRequestInfo, SentRequestInfo
from app.utils.friendship_utils import get_accepted_friendships, get_accepted_friendship

# [Config] 친구 요청을 자동으로 수락할 관리자(봇) ID 목록
# 이 리스트에 포함된 ID로 친구 요청을 보내면 즉시 '수락' 처리됩니다.
AUTO_ACCEPT_ADMINS = ["eggit_admin", "root", "eggit-official"]

router = APIRouter()

# 친구 요청 보내기 (POST /api/v1/friends/request)
@router.post("/request", response_model=FriendResponse)
def send_friend_request(
    request: FriendRequestCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # 1. 'username'(영어 아이디)으로 친구 찾기
    target_user = db.query(User).filter(User.username == request.target_username).first()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="해당 아이디를 가진 유저를 찾을 수 없습니다.")
    
    # 2. 자기 자신에게 요청 불가
    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="나 자신에게는 친구 요청을 보낼 수 없습니다.")

    # 3. 이미 친구 관계나 요청이 있는지 확인
    existing = db.query(Friendship).filter(
        or_(
            (Friendship.requester_id == current_user.id) & (Friendship.addressee_id == target_user.id),
            (Friendship.requester_id == target_user.id) & (Friendship.addressee_id == current_user.id)
        )
    ).first()

    if existing:
        msg = "이미 친구 사이입니다." if existing.status == FriendStatus.ACCEPTED else "이미 친구 요청을 보냈거나 받았습니다."
        raise HTTPException(status_code=400, detail=msg)

    # 4. 요청 저장
    # [Mod] 관리자/봇 계정에게 보내는 요청은 즉시 수락(ACCEPTED) 처리
    initial_status = FriendStatus.PENDING
    if target_user.username in AUTO_ACCEPT_ADMINS:
        initial_status = FriendStatus.ACCEPTED
        
    new_friendship = Friendship(
        requester_id=current_user.id,
        addressee_id=target_user.id,
        status=initial_status
    )
    db.add(new_friendship)
    db.commit()
    db.refresh(new_friendship)
    
    return new_friendship


# 친구 요청 수락 (PUT /api/v1/friends/{friendship_id}/accept)
@router.put("/{friendship_id}/accept", response_model=FriendResponse)
def accept_friend_request(
    friendship_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # 1. 친구 요청 조회
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    
    if not friendship:
        raise HTTPException(status_code=404, detail="친구 요청을 찾을 수 없습니다.")
    
    # 2. 내가 받은 요청인지 확인 (addressee만 수락 가능)
    if friendship.addressee_id != current_user.id:
        raise HTTPException(status_code=403, detail="이 요청을 수락할 권한이 없습니다.")
    
    # 3. 이미 수락된 요청인지 확인
    if friendship.status == FriendStatus.ACCEPTED:
        raise HTTPException(status_code=400, detail="이미 수락된 친구 요청입니다.")
    
    # 4. 상태를 ACCEPTED로 변경
    friendship.status = FriendStatus.ACCEPTED
    db.commit()
    db.refresh(friendship)
    
    return friendship


# 친구 요청 거절 (DELETE /api/v1/friends/{friendship_id}/reject)
@router.delete("/{friendship_id}/reject")
def reject_friend_request(
    friendship_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # 1. 친구 요청 조회
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    
    if not friendship:
        raise HTTPException(status_code=404, detail="친구 요청을 찾을 수 없습니다.")
    
    # 2. 내가 받은 요청인지 확인 (addressee만 거절 가능)
    if friendship.addressee_id != current_user.id:
        raise HTTPException(status_code=403, detail="이 요청을 거절할 권한이 없습니다.")
    
    # 3. 이미 수락된 친구는 거절 불가 (친구 삭제는 별도 API)
    if friendship.status == FriendStatus.ACCEPTED:
        raise HTTPException(status_code=400, detail="이미 친구입니다. 친구 삭제를 이용하세요.")
    
    # 4. 요청 삭제
    db.delete(friendship)
    db.commit()
    
    return {"message": "친구 요청이 거절되었습니다."}


# 친구 목록 조회 (GET /api/v1/friends)
@router.get("", response_model=List[FriendInfo])
def get_friend_list(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # ACCEPTED 상태인 친구 관계 조회 - friendship_utils 사용
    friendships = get_accepted_friendships(db, current_user.id)
    
    # ConnectionManager를 사용하여 온라인 상태 확인
    from app.core.socket_manager import manager
    
    friends = []
    for fs in friendships:
        # 상대방의 user_id 찾기
        friend_id = fs.addressee_id if fs.requester_id == current_user.id else fs.requester_id
        friend_user = db.query(User).filter(User.id == friend_id).first()
        
        if friend_user:
            friends.append(FriendInfo(
                user_id=friend_user.id,
                username=friend_user.username,
                nickname=getattr(friend_user, 'nickname', None),
                is_online=manager.is_user_online(friend_user.id)  # 온라인 상태 확인
            ))
    
    return friends


# 받은 친구 요청 목록 (GET /api/v1/friends/pending)
@router.get("/pending", response_model=List[PendingRequestInfo])
def get_pending_requests(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # 내가 받은 PENDING 상태의 친구 요청 조회
    pending_requests = db.query(Friendship).filter(
        Friendship.addressee_id == current_user.id,
        Friendship.status == FriendStatus.PENDING
    ).all()
    
    result = []
    for req in pending_requests:
        requester = db.query(User).filter(User.id == req.requester_id).first()
        
        if requester:
            result.append(PendingRequestInfo(
                friendship_id=req.id,
                requester_id=requester.id,
                requester_username=requester.username,
                requester_nickname=getattr(requester, 'nickname', None),
                created_at=req.created_at
            ))
    
    return result


# 친구 삭제 (DELETE /api/v1/friends/{friend_user_id})
@router.delete("/{friend_user_id}")
def delete_friend(
    friend_user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # 1. 친구 관계 조회 - friendship_utils.py
    friendship = get_accepted_friendship(db, current_user.id, friend_user_id)
    
    if not friendship:
        raise HTTPException(status_code=404, detail="친구 관계를 찾을 수 없습니다.")
    
    # 2. 친구 관계 삭제
    db.delete(friendship)
    db.commit()
    
    return {"message": "친구가 삭제되었습니다."}


# 내가 보낸 친구 요청 목록 (GET /api/v1/friends/sent)
@router.get("/sent", response_model=List[SentRequestInfo])
def get_sent_requests(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # 내가 보낸 PENDING 상태의 친구 요청 조회
    sent_requests = db.query(Friendship).filter(
        Friendship.requester_id == current_user.id,
        Friendship.status == FriendStatus.PENDING
    ).all()
    
    result = []
    for req in sent_requests:
        addressee = db.query(User).filter(User.id == req.addressee_id).first()
        
        if addressee:
            result.append(SentRequestInfo(
                friendship_id=req.id,
                addressee_id=addressee.id,
                addressee_username=addressee.username,
                addressee_nickname=getattr(addressee, 'nickname', None),
                created_at=req.created_at
            ))
    
    return result


# 보낸 친구 요청 취소 (DELETE /api/v1/friends/{friendship_id}/cancel)
@router.delete("/{friendship_id}/cancel")
def cancel_friend_request(
    friendship_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # 1. 친구 요청 조회
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    
    if not friendship:
        raise HTTPException(status_code=404, detail="친구 요청을 찾을 수 없습니다.")
    
    # 2. 내가 보낸 요청인지 확인 (requester만 취소 가능)
    if friendship.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="이 요청을 취소할 권한이 없습니다.")
    
    # 3. 이미 수락된 요청은 취소 불가
    if friendship.status == FriendStatus.ACCEPTED:
        raise HTTPException(status_code=400, detail="이미 친구가 된 상태입니다.")
    
    # 4. 요청 삭제
    db.delete(friendship)
    db.commit()
    
    return {"message": "친구 요청이 취소되었습니다."}


# 친구 홈피 방문 및 카운팅 (POST /api/v1/friends/{friend_id}/visit)
@router.post("/{friend_id}/visit")
def visit_friend_home(
    friend_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    친구 홈피 방문 기록 및 퀘스트 처리
    - 하루 1회 유니크 방문 체크 (visitor_id, owner_id, date)
    - 유니크 방문 시 피방문자의 total_visits 증가
    - 방문자(로그인 유저)의 'Visit Friends' Blog' 데일리 퀘스트 완료 처리
    """
    from app.models.visit import UserVisit
    from app.models.quest import QuestTitle
    from app.services import quest_service
    from app.utils.datetime_utils import get_kst_date
    
    # 1. 대상 유저 존재 확인
    target_user = db.query(User).filter(User.id == friend_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="해당 유저를 찾을 수 없습니다.")
    
    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="자신의 홈피 방문은 카운팅되지 않습니다.")

    # 2. 오늘 이미 방문했는지 확인
    today_kst = get_kst_date()
    existing_visit = db.query(UserVisit).filter(
        UserVisit.visitor_id == current_user.id,
        UserVisit.owner_id == friend_id,
        UserVisit.visit_date == today_kst
    ).first()
    
    visit_result = "already_visited_today"
    
    if not existing_visit:
        try:
            # 방문 기록 저장
            new_visit = UserVisit(
                visitor_id=current_user.id,
                owner_id=friend_id,
                visit_date=today_kst
            )
            db.add(new_visit)
            
            # 피방문자 누적 방문수 증가
            target_user.total_visits += 1
            db.commit()
            visit_result = "new_visit_recorded"
        except Exception:
            db.rollback()
            # 중복 제약 조건 등으로 에러 발생 시 (동시성) 이미 방문한 것으로 간주
            visit_result = "already_visited_today"

    # 3. '친구 방문' 데일리 퀘스트 완료 처리 (방문자 기준)
    quest_reward = quest_service.complete_quest_by_title(
        db, current_user.id, QuestTitle.VISIT_FRIEND_HOME
    )
    
    return {
        "status": "success",
        "visit_status": visit_result,
        "total_visits": target_user.total_visits,
        "quest_reward": quest_reward
    }
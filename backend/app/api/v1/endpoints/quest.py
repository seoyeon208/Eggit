from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.models.quest import Quest, UserQuest, QuestStatus, QuestTitle
from app.models.user import User
from datetime import datetime, timezone
from typing import List
from pydantic import BaseModel

router = APIRouter()

# Pydantic 모델
class QuestDto(BaseModel):
    id: int
    text: str
    exp: int
    status: str  # Enum 대신 str로 변환하여 반환 (직렬화 오류 방지)
    type: str    # DAILY or WEEKLY
    weekly_checkin_count: int = 0  # 주간 출석 횟수 (주간 퀘스트만 사용)

@router.get("/", response_model=List[QuestDto])
def read_quests_list(
    user_id: int = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    퀘스트 목록 및 달성 여부 조회
    """
    effective_user_id = user_id if user_id else current_user.id
    
    # 1. 유저 확인
    target_user = db.query(User).filter(User.id == effective_user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. 모든 활성 퀘스트 조회
    active_quests = db.query(Quest).filter(Quest.is_active == True).all()
    
    # [Debug] DB에 퀘스트가 없는 경우 로그 출력
    if not active_quests:
        print("⚠️ [Quest] No active quests found in DB. Please run 'init_default_quests' seed script.")
        return []

    # 3. 유저의 진행 상황 조회
    user_quests = db.query(UserQuest).filter(
        UserQuest.user_id == effective_user_id
    ).all()
    
    uq_map = {uq.quest_id: uq for uq in user_quests}
    from app.utils.datetime_utils import now_utc, now_kst, to_kst, get_monday_of_week_kst
    
    now = now_utc()
    today_kst = now_kst().date()
    current_monday_kst = to_kst(get_monday_of_week_kst(now)).date()

    result = []
    
    for q in active_quests:
        # ------------------------------------------------------------
        # [CRITICAL FIX] Enum 처리 안전 장치
        # ------------------------------------------------------------
        freq_val = q.frequency.value if hasattr(q.frequency, 'value') else str(q.frequency)
        if "." in freq_val:
            freq_val = freq_val.split(".")[-1]
            
        status_val = QuestStatus.NOT_STARTED.value
        weekly_count = 0

        # 진행 상황이 있으면 상태 업데이트
        uq = uq_map.get(q.id)
        if uq:
            status_val = uq.status.value if hasattr(uq.status, 'value') else str(uq.status)
            weekly_count = uq.weekly_checkin_count if hasattr(uq, 'weekly_checkin_count') else 0
            
            # [기간 체크 로직] KST 기준으로 날짜가 지났으면 리셋하여 표시
            if uq.completed_at:
                last_completed_kst = to_kst(uq.completed_at).date()
                
                # 1. 데일리 퀘스트: 오늘 날짜(KST)가 아니면 NOT_STARTED로 표시
                if "DAILY" in freq_val and last_completed_kst != today_kst:
                    status_val = QuestStatus.NOT_STARTED.value
                
                # 2. 위클리 퀘스트: 이번 주(월요일 기준 KST)가 아니면 리셋 표시
                elif "WEEKLY" in freq_val:
                    last_monday_kst = to_kst(get_monday_of_week_kst(uq.completed_at)).date()
                    if last_monday_kst != current_monday_kst:
                        status_val = QuestStatus.NOT_STARTED.value
                        weekly_count = 0
        
        # 아직 uq가 없더라도 위클리 퀘스트라면 카운트는 0으로 유지 (기본값)

        # DTO 생성
        result.append(QuestDto(
            id=q.id,
            text=q.title,
            exp=q.exp_reward,
            status=status_val,
            type=freq_val,
            weekly_checkin_count=weekly_count
        ))
        
    return result

@router.post("/claim/{quest_id}")
def claim_quest(
    quest_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    from app.services import quest_service
    result = quest_service.claim_quest_reward(db, current_user.id, quest_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result

class QuestCompleteRequest(BaseModel):
    title: str # Enum 매칭 문제 방지를 위해 str로 받음

@router.post("/complete")
def complete_quest(
    request: QuestCompleteRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    from app.services import quest_service
    
    # 입력받은 문자열 타이틀을 Enum으로 변환 시도
    try:
        q_title_enum = QuestTitle(request.title)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest title: {request.title}")

    result = quest_service.complete_quest_by_title(db, current_user.id, q_title_enum)
    if not result:
        raise HTTPException(status_code=404, detail="Quest not found or conditions not met")
    return result
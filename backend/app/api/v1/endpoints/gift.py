from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from datetime import datetime

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.gift import DailyGift
from app.models.quest import QuestTitle
from app.services import quest_service  # 작성해주신 서비스 함수들이 포함된 모듈

router = APIRouter()

@router.get("/today")
def check_today_gift(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.utils.datetime_utils import now_kst
    now = now_kst()
    today = now.strftime("%Y-%m-%d")
    now_time = now.time() # 현재 시간 (KST)
    
    # [Option] 18:00 이전이면, 데이터가 있어도 '선물 없음'으로 처리 (엄격 모드)
    # KST 기준 18시, 서버 시간이 UTC라면 로직 조정 필요
    # target_hour = 18 
    # if now_time.hour < target_hour:
    #     return {"has_gift": False, "message": "오늘의 선물은 18시에 도착합니다!"}

    gift = db.query(DailyGift).filter(
        DailyGift.user_id == current_user.id,
        DailyGift.target_date == today
    ).first()
    
    if not gift:
        return {"has_gift": False}
    
    return {
        "has_gift": True,
        "gift_id": gift.id,
        "is_opened": gift.is_opened,
        "is_solved": gift.is_solved
    }

# 2. 선물 상자 열기 (애니메이션 후 호출)
@router.post("/{gift_id}/open")
def open_gift(gift_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    gift = db.query(DailyGift).filter(DailyGift.id == gift_id, DailyGift.user_id == current_user.id).first()
    if not gift:
        raise HTTPException(status_code=404, detail="Gift not found")
        
    if not gift.is_opened:
        from app.utils.datetime_utils import now_utc
        gift.is_opened = True
        gift.opened_at = now_utc()
        db.commit()
        
    # 퀴즈 정답(answer_idx)은 클라이언트에 보내지 않거나, 숨겨서 보냄
    response_content = gift.content.copy()
    if not gift.is_solved:
        # 정답 유출 방지 (선택 사항)
        del response_content['quiz_item']['answer_idx'] 
        
    return response_content

@router.post("/{gift_id}/solve")
def solve_daily_quiz(
    gift_id: int, 
    answer_idx: int = Body(..., embed=True), # Request Body: { "answer_idx": 2 }
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    데일리 퀴즈 정답 제출 및 퀘스트 클리어 처리
    """
    # 1. 선물 데이터 조회
    gift = db.query(DailyGift).filter(
        DailyGift.id == gift_id, 
        DailyGift.user_id == current_user.id
    ).first()

    if not gift:
        raise HTTPException(status_code=404, detail="Gift not found")
    
    if gift.is_solved:
        return {"result": "already_solved", "message": "이미 완료한 퀴즈입니다."}

    # 2. 정답 검증
    # content JSON 구조: { "quiz_item": { "answer_idx": 1, ... } } 라고 가정
    quiz_data = gift.content.get("quiz_item", {})
    correct_idx = quiz_data.get("answer_idx")

    if correct_idx is None:
         raise HTTPException(status_code=500, detail="Quiz data is corrupted")

    if answer_idx == correct_idx:
        # -------------------------------------------------------
        # [STEP 1] 선물 상태 업데이트 (정답 처리)
        # -------------------------------------------------------
        gift.is_solved = True
        db.add(gift) # 세션에 명시 (혹은 commit시 자동 반영되지만 안전하게)
        
        # -------------------------------------------------------
        # [STEP 2] 데일리 퀘스트 달성 처리 (COMPLETED)
        # -------------------------------------------------------
        # 작성해주신 complete_quest_by_title 함수 재사용
        quest_result = quest_service.complete_quest_by_title(
            db=db, 
            user_id=current_user.id, 
            quest_title=QuestTitle.DAILY_QUIZ
        )
        
        # 변경사항 저장
        db.commit()

        # -------------------------------------------------------
        # [STEP 3] 결과 반환
        # -------------------------------------------------------
        response = {
            "result": "correct",
            "message": "정답입니다! 훌륭해요.",
            "explanation": quiz_data.get("explanation", ""),
            "quest_status": None
        }

        # 퀘스트가 이번에 새로 완료되었거나, 이미 완료된 상태라면 정보 포함
        if quest_result:
            # already_completed 키가 있으면 이미 깬 것, 없으면 이번에 깬 것
            if quest_result.get("already_completed"):
                response["quest_status"] = "already_cleared"
            else:
                response["quest_status"] = "cleared" # 프론트에서 폭죽 효과 트리거
                response["message"] += " '일일 퀴즈' 퀘스트가 달성되었습니다! 보상을 수령하세요."

        return response

    else:
        # [오답 처리]
        return {
            "result": "incorrect",
            "message": "아쉽네요! 다시 한번 생각해보세요."
        }
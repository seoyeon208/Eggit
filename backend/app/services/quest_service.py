from sqlalchemy.orm import Session
from app.models.quest import Quest, UserQuest, QuestStatus, QuestTitle
from app.services import avatar_service
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from app.utils.datetime_utils import now_utc, now_kst, to_kst, get_monday_of_week_kst, to_utc

# ------------------------------------------------------------------
# [Core] 주간 출석 체크 (월-일 중 5일 출석)
# ------------------------------------------------------------------
def check_weekly_attendance(db: Session, user_id: int) -> Optional[Dict[str, Any]]:
    """주간 출석 체크 (월-일 중 5일 출석)"""
    attendance_quest = db.query(Quest).filter(
        Quest.title == QuestTitle.WEEKLY_ATTENDANCE,
        Quest.is_active == True
    ).first()
    
    if not attendance_quest:
        return None

    now = now_utc()
    monday = get_monday_of_week_kst(now)
    monday_kst_date = to_kst(monday).date()
    
    # ✨ Daily CheckinLog 테이블에서 이번 주 출석 횟수 조회
    from app.models.checkin import DailyCheckinLog
    
    checkins = db.query(DailyCheckinLog).filter(
        DailyCheckinLog.user_id == user_id,
        DailyCheckinLog.checkin_date >= monday_kst_date
    ).all()
    
    checkin_count = len(checkins)
    
    user_quest = db.query(UserQuest).filter(
        UserQuest.user_id == user_id,
        UserQuest.quest_id == attendance_quest.id
    ).first()
    
    if user_quest:
        if user_quest.status == QuestStatus.CLAIMED and user_quest.completed_at and to_utc(user_quest.completed_at) >= monday:
            return None
        
        is_new_week = user_quest.completed_at and to_utc(user_quest.completed_at) < monday
        user_quest.weekly_checkin_count = checkin_count
        
        if is_new_week or (checkin_count >= 5 and user_quest.status != QuestStatus.COMPLETED):
            user_quest.status = QuestStatus.COMPLETED if checkin_count >= 5 else QuestStatus.IN_PROGRESS
            if checkin_count >= 5:
                user_quest.completed_at = now
    else:
        user_quest = UserQuest(
            user_id=user_id,
            quest_id=attendance_quest.id,
            status=QuestStatus.COMPLETED if checkin_count >= 5 else QuestStatus.IN_PROGRESS,
            weekly_checkin_count=checkin_count,
            completed_at=now if checkin_count >= 5 else None
        )
        db.add(user_quest)
    
    db.commit()
    
    if checkin_count >= 5:
        return {
            "quest_title": attendance_quest.title,
            "status": QuestStatus.COMPLETED,
            "checkin_count": checkin_count
        }
    return None

# ------------------------------------------------------------------
# [Core] 자동 출석 체크 (로그인 시 호출)
# ------------------------------------------------------------------
def auto_check_in_user(db: Session, user_id: int) -> Optional[Dict[str, Any]]:
    """
    자동 출석 체크 (로그인 시 호출)
    - DailyCheckinLog 테이블에 출석 기록 저장
    - UserQuest는 상태 관리용으로만 사용
    """
    daily_quest = db.query(Quest).filter(
        Quest.title == QuestTitle.DAILY_CHECKIN,
        Quest.is_active == True
    ).first()
    
    if not daily_quest:
        return None
    
    from app.utils.datetime_utils import now_kst, to_kst
    now = now_utc()
    today_kst = now_kst().date()
    
    # 1. 중복 출석 확인 (오늘 이미 달성했거나 보상을 받았는지)
    existing_quest = db.query(UserQuest).filter(
        UserQuest.user_id == user_id,
        UserQuest.quest_id == daily_quest.id,
        UserQuest.status.in_([QuestStatus.COMPLETED, QuestStatus.CLAIMED])
    ).order_by(UserQuest.completed_at.desc()).first()
    
    if existing_quest and existing_quest.completed_at and existing_quest.completed_at.date() == today_kst:
        return {
            "already_completed": True,
            "status": existing_quest.status,
            "exp_gained": 0,
            "message": "오늘 이미 출석했습니다."
        }
    
    # 2. 보상 지급 (아바타 경험치) - 수동 수령 방식으로 변경 (여기서는 지급하지 않음)
    from app.crud import crud_avatar
    avatar = crud_avatar.get_avatar_by_user_id(db, user_id)
    if not avatar:
        return None
    
    # ✨ DailyCheckinLog 테이블에 출석 기록
    from app.models.checkin import DailyCheckinLog
    from sqlalchemy.exc import IntegrityError
    
    try:
        # 오늘 출석 기록 시도
        checkin_log = DailyCheckinLog(
            user_id=user_id,
            checkin_date=today_kst
        )
        db.add(checkin_log)
        db.flush()  # DB에 반영하여 UniqueConstraint 체크
        
        # 출석 성공! UserQuest 상태를 COMPLETED로 설정
        user_quest = db.query(UserQuest).filter(
            UserQuest.user_id == user_id,
            UserQuest.quest_id == daily_quest.id
        ).first()
        
        if user_quest:
            # 기존 레코드가 있으면 업데이트
            user_quest.status = QuestStatus.COMPLETED
            user_quest.completed_at = now
        else:
            # 없으면 새로 생성
            user_quest = UserQuest(
                user_id=user_id,
                quest_id=daily_quest.id,
                status=QuestStatus.COMPLETED,
                completed_at=now
            )
            db.add(user_quest)
        
        db.commit()

        # ✨ 주간 출석 현황 즉시 업데이트 (사용자가 '보상 받기'를 누르기 전에도 circles가 채워지도록)
        check_weekly_attendance(db, user_id)
        
        message = "출석 퀘스트 달성! '보상 받기' 버튼을 눌러 경험치를 수령하세요."
        
        return {
            "already_completed": False,
            "exp_gained": 0,
            "current_level": avatar.level,
            "current_exp": avatar.exp,
            "message": message
        }
        
    except IntegrityError:
        # 이미 오늘 출석함 (UniqueConstraint 위반)
        db.rollback()
        return {
            "already_completed": True,
            "exp_gained": 0,
            "message": "오늘 이미 출석했습니다."
        }
# ------------------------------------------------------------------
# [Core] 퀘스트 달성 처리 (Complete)
# ------------------------------------------------------------------
def complete_quest_by_title(db: Session, user_id: int, quest_title: QuestTitle) -> Optional[Dict[str, Any]]:
    quest = db.query(Quest).filter(
        Quest.title == quest_title,
        Quest.is_active == True
    ).first()
    
    if not quest:
        return None
        
    today = now_kst().date()
    today = now_kst().date()

    
    existing_quest = db.query(UserQuest).filter(
        UserQuest.user_id == user_id,
        UserQuest.quest_id == quest.id,
        UserQuest.status.in_([QuestStatus.COMPLETED, QuestStatus.CLAIMED])
    ).first()
    
    if existing_quest:
        last_completed = to_kst(existing_quest.completed_at).date() if existing_quest.completed_at else None
        last_completed = to_kst(existing_quest.completed_at).date() if existing_quest.completed_at else None
        freq_str = str(quest.frequency.name if hasattr(quest.frequency, 'name') else quest.frequency)

        # [DAILY]
        if "DAILY" in freq_str:
            if existing_quest.status == QuestStatus.CLAIMED:
                if last_completed == today:
                    return {"already_completed": True, "message": "오늘 이미 완료한 퀘스트입니다."}
                else:
                    existing_quest.status = QuestStatus.COMPLETED
                    existing_quest.completed_at = now_utc()

            else:
                existing_quest.status = QuestStatus.COMPLETED
                existing_quest.completed_at = now_utc()
        
        # [WEEKLY]
        elif "WEEKLY" in freq_str and last_completed:
            current_year, current_week, _ = today.isocalendar()
            last_year, last_week, _ = last_completed.isocalendar()
            
            if existing_quest.status == QuestStatus.CLAIMED:
                if current_year == last_year and current_week == last_week:
                    return {"already_completed": True, "message": "이번 주에 이미 완료한 퀘스트입니다."}
                else:
                    existing_quest.status = QuestStatus.COMPLETED
                    existing_quest.completed_at = now_utc()
            else:
                existing_quest.status = QuestStatus.COMPLETED
                existing_quest.completed_at = now_utc()

        # [ONE TIME 등 기타]
        else:
             if existing_quest.status != QuestStatus.CLAIMED:
                 existing_quest.status = QuestStatus.COMPLETED
                 existing_quest.completed_at = now_utc()

    # 보상 지급을 하지 않고 상태만 COMPLETED로 변경 (이미 CLAIMED 면 변경 안 함)
    if existing_quest:
        if existing_quest.status != QuestStatus.CLAIMED:
            existing_quest.completed_at = datetime.now(timezone.utc)
            existing_quest.status = QuestStatus.COMPLETED
    else:
        new_uq = UserQuest(
            user_id=user_id,
            quest_id=quest.id,
            status=QuestStatus.COMPLETED,
            completed_at=now_utc()
        )
        db.add(new_uq)
    
    db.commit()
    return {
        "quest_title": quest.title,
        "status": QuestStatus.COMPLETED
    }

# ------------------------------------------------------------------
# [Core] 퀘스트 보상 수령 (Claim)
# ------------------------------------------------------------------
def claim_quest_reward(db: Session, user_id: int, quest_id: int) -> Dict[str, Any]:
    user_quest = db.query(UserQuest).filter(
        UserQuest.user_id == user_id,
        UserQuest.quest_id == quest_id
    ).first()

    if not user_quest:
        return {"success": False, "message": "퀘스트 기록이 없습니다."}

    if user_quest.status == QuestStatus.CLAIMED:
        return {"success": False, "message": "이미 보상을 수령했습니다."}
    
    if user_quest.status != QuestStatus.COMPLETED:
        return {"success": False, "message": "아직 퀘스트 조건을 달성하지 못했습니다."}

    from app.crud import crud_avatar
    avatar = crud_avatar.get_avatar_by_user_id(db, user_id)
    if not avatar:
        return {"success": False, "message": "아바타를 찾을 수 없습니다."}

    quest = db.query(Quest).filter(Quest.id == quest_id).first()
    
    try:
        old_level = avatar.level
        avatar_service.add_experience(db, avatar, quest.exp_reward)
        
        user_quest.status = QuestStatus.CLAIMED
        db.commit()

        if quest.title == QuestTitle.DAILY_CHECKIN:
            check_weekly_attendance(db, user_id)
            
        db.refresh(avatar)

        return {
            "success": True,
            "exp_gained": quest.exp_reward,
            "old_level": old_level,
            "new_level": avatar.level,
            "new_exp": avatar.exp,
            "max_exp": avatar_service.get_required_exp(avatar.level),
            "status": "CLAIMED"
        }
    except Exception as e:
        print(f"❌ [Claim Error] {e}")
        db.rollback()
        return {"success": False, "message": "보상 처리 중 오류가 발생했습니다."}

# ------------------------------------------------------------------
# [Helper] 방명록 퀘스트 체크
# ------------------------------------------------------------------
def check_guestbook_quest_achievements(db: Session, user_id: int) -> Optional[Dict[str, Any]]:
    quest = db.query(Quest).filter(
        Quest.title == QuestTitle.GUESTBOOK_THREE_TIMES,
        Quest.is_active == True
    ).first()
    
    if not quest:
        return None

    now = now_utc()
    monday = get_monday_of_week_kst(now)

    # 이번 주에 이미 완료(COMPLETED) 또는 수령(CLAIMED)했는지 확인
    already_done = db.query(UserQuest).filter(
        UserQuest.user_id == user_id,
        UserQuest.quest_id == quest.id,
        UserQuest.status.in_([QuestStatus.COMPLETED, QuestStatus.CLAIMED]),
        UserQuest.completed_at >= monday.replace(tzinfo=None)
    ).first()

    if already_done:
        return None

    from app.models.guestbook import Guestbook
    count = db.query(Guestbook).filter(
        Guestbook.author_id == user_id,
        Guestbook.created_at >= monday.replace(tzinfo=None)
    ).count()

    if count >= 3:
        return complete_quest_by_title(db, user_id, QuestTitle.GUESTBOOK_THREE_TIMES)
        
    return None
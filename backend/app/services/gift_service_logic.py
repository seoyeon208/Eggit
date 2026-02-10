# app/services/gift_service_logic.py

import asyncio
import logging
from datetime import datetime
from sqlalchemy.orm import Session, joinedload  # [Fix] joinedload 추가

from app.models.user import User
from app.models.gift import DailyGift
# from app.models.dashboard import UserDashboard # 필요 시 import (관계설정 되어있으면 생략 가능)
from app.services.ai.gift_generator import GiftGeneratorService
from app.core.security import decrypt_token
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)

async def generate_and_save_gift(user_id: int, db: Session = None, force_update: bool = False):
    """
    [Core Logic] 유저 ID를 받아 선물을 생성하고 DB에 저장하는 공통 함수
    - force_update: True일 경우, 이미 오늘 선물이 있어도 내용을 덮어씁니다 (매일 17:30 갱신용)
    """
    should_close_db = False
    if db is None:
        db = SessionLocal()
        should_close_db = True

    try:
        # [Fix 1] User 조회 시 Dashboard도 함께 로드 (Eager Loading)하여 속성 에러 방지
        user = db.query(User).options(joinedload(User.dashboard)).filter(User.id == user_id).first()
        
        if not user or not user.github_access_token:
            logger.warning(f"⚠️ User {user_id} not found or no token.")
            return

        from app.utils.datetime_utils import now_kst
        # 1. 오늘 이미 선물이 있는지 재확인 (중복 방지)
        today_str = now_kst().strftime("%Y-%m-%d")
        existing = db.query(DailyGift).filter(
            DailyGift.user_id == user.id, 
            DailyGift.target_date == today_str
        ).first()
        
        if existing and not force_update:
            logger.info(f"🎁 Gift already exists for user {user.username}")
            return

        # 2. AI 서비스 호출 준비
        token = decrypt_token(user.github_access_token)
        service = GiftGeneratorService(token=token)
        
        # [Fix 2] 기술 스택 안전하게 가져오기 & 문자열 변환
        tech_stack_context = "General Software Development"
        
        if user.dashboard and user.dashboard.tech_stack:
            raw_stack = user.dashboard.tech_stack
            if isinstance(raw_stack, list):
                stacks = []
                for item in raw_stack:
                    if isinstance(item, dict):
                        stacks.append(item.get('name', str(item)))
                    else:
                        stacks.append(str(item))
                tech_stack_context = ", ".join(stacks)
            else:
                tech_stack_context = str(raw_stack)

        logger.info(f"🧠 Generating gift for {user.username} (Context: {tech_stack_context[:30]}...)...")
        
        # 3. AI 생성 요청
        gift_content = await service.generate_daily_gift(user.username, tech_stack_context)
        
        # 4. DB 저장 (Update or Insert)
        if existing and force_update:
            logger.info(f"🔄 Overwriting gift for {user.username} (Force Update)")
            existing.content = gift_content
            existing.is_opened = False
            existing.is_solved = False
            existing.created_at = datetime.now() # 갱신 시간 업데이트
        else:
            new_gift = DailyGift(
                user_id=user.id,
                content=gift_content,
                target_date=today_str,
                is_opened=False,
                is_solved=False
            )
            db.add(new_gift)
            
        db.commit()
        logger.info(f"✅ Gift generated and saved for {user.username}")

    except Exception as e:
        logger.error(f"❌ Gift Generation Logic Failed: {e}")
        db.rollback()
    finally:
        if should_close_db:
            db.close()

def run_gift_generation_sync(user_id: int, force_update: bool = False):
    """
    Async 함수를 동기 환경(Celery 등)에서 실행하기 위한 래퍼
    """
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    loop.run_until_complete(generate_and_save_gift(user_id, db=None, force_update=force_update))
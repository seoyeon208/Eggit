import hashlib
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models import User, UserDashboard, BlogVisitLog

def process_visit_log(db: Session, username: str, client_ip: str):
    """
    [UV Tracking] 중복 방문자 제외하고 카운트 증가
    """
    # 1. 블로그 주인 찾기
    owner = db.query(User).filter(User.username == username).first()
    if not owner:
        return

    # 2. IP 해싱 (개인정보 보호)
    visitor_hash = hashlib.sha256(client_ip.encode()).hexdigest()
    today = date.today()

    # 3. 중복 체크 (DB 레벨)
    try:
        # 로그 생성 시도
        new_log = BlogVisitLog(
            owner_id=owner.id,
            visitor_ip_hash=visitor_hash,
            visit_date=today
        )
        db.add(new_log)
        db.commit() # 여기서 중복이면 IntegrityError 발생

        # 4. 성공 시(처음 온 경우) -> 대시보드 카운트 증가
        dashboard = db.query(UserDashboard).filter(UserDashboard.user_id == owner.id).first()
        if not dashboard:
            dashboard = UserDashboard(user_id=owner.id)
            db.add(dashboard)
        
        dashboard.total_visitors += 1
        dashboard.today_visitors = (dashboard.today_visitors or 0) + 1
        db.commit()
        print(f"✅ Visit counted for {username}")

    except IntegrityError:
        db.rollback()
        print(f"ℹ️ Duplicate visit ignored for {username}")
    except Exception as e:
        db.rollback()
        print(f"❌ Tracking Error: {e}")
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
from app.models import UserDashboard, BlogPost, User, BlogVisitLog
from app.utils.github_client import fetch_github_stats
from app.utils.datetime_utils import now_utc, get_kst_date, get_monday_of_week_kst, days_ago_utc, KST, to_kst, to_utc

def get_combined_dashboard(db: Session, user: User) -> dict:
    """
    [Core Logic] GitHub 캐싱 데이터 + 블로그 실시간 데이터 병합
    """
    # 1. 대시보드 조회 (없으면 생성)
    dashboard = db.query(UserDashboard).filter(UserDashboard.user_id == user.id).first()
    if not dashboard:
        dashboard = UserDashboard(user_id=user.id)
        db.add(dashboard)
        db.commit()
        db.refresh(dashboard)

    now = now_utc()

    # 2. GitHub 데이터 갱신 여부 체크 (1시간 쿨타임)
    should_update = False
    if not dashboard.last_github_updated_at:
        should_update = True
    elif now - to_utc(dashboard.last_github_updated_at) > timedelta(hours=1):
        should_update = True

    if should_update and user.github_access_token:
        print(f"🔄 Fetching fresh GitHub stats for {user.username}...")
        gh_data = fetch_github_stats(user.github_access_token, user.username)
        
        if gh_data:
            dashboard.github_stats = {
                "total_commits": gh_data["total_commits"],
                "total_prs": gh_data["total_prs"],
                "total_issues": gh_data["total_issues"],
                "total_stars": gh_data["total_stars"],
                "calendar": gh_data["calendar"]
            }
            dashboard.tech_stack = gh_data["top_languages"]
            dashboard.last_github_updated_at = now
            db.commit()
            db.refresh(dashboard)

    # 3. 방문자 데이터 집계 (Real-time)
    today_kst = get_kst_date(now)
    monday_utc = get_monday_of_week_kst(now)
    monday_kst_date = to_kst(monday_utc).date() # DB Date filter용

    today_count = db.query(BlogVisitLog).filter(
        BlogVisitLog.owner_id == user.id,
        BlogVisitLog.visit_date == today_kst
    ).count()

    weekly_visitor_count = db.query(BlogVisitLog).filter(
        BlogVisitLog.owner_id == user.id,
        BlogVisitLog.visit_date >= monday_kst_date
    ).count()

    # 4. 블로그 포스팅 데이터 집계
    one_week_ago_utc = days_ago_utc(7)
    weekly_post_count = db.query(BlogPost).filter(
        BlogPost.user_id == user.id,
        BlogPost.created_at >= one_week_ago_utc
    ).count()

    # 5. 최종 데이터 구조 반환
    return {
        "username": user.username,
        "total_visitors": dashboard.total_visitors,
        "today_visitors": today_count,
        "weekly_visitors": weekly_visitor_count,
        "weekly_post_count": weekly_post_count,
        "tech_stack": dashboard.tech_stack,
        "github_stats": dashboard.github_stats,
        "last_updated": dashboard.last_github_updated_at
    }
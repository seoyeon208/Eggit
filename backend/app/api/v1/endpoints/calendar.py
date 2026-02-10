from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.api import deps
from app.models.dashboard import BlogPost # BlogPost 모델 임포트
from app.schemas.calendar import CalendarEventDto

router = APIRouter()

@router.get("/events", response_model=List[CalendarEventDto])
def get_calendar_events(
    user_id: Optional[int] = Query(None, description="조회할 사용자 ID (없으면 본인)"),
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    캘린더 이벤트 목록을 가져옵니다.
    - user_id가 없으면 현재 로그인한 사용자의 이벤트
    - user_id가 있으면 해당 사용자의 이벤트 (친구 홈)
    """
    # user_id가 지정되지 않으면 현재 사용자
    target_user_id = user_id if user_id is not None else current_user.id
    
    posts = db.query(BlogPost).filter(
        BlogPost.user_id == target_user_id
    ).order_by(BlogPost.created_at.desc()).all()

    results = []
    for post in posts:
        # created_at이 DateTime이므로 Date 문자열로 변환
        date_str = post.created_at.strftime("%Y-%m-%d")
        
        results.append(CalendarEventDto(
            id=post.id,
            title=post.title,
            date=date_str,
            type=post.theme_type, # "chirpy" or "docs"
            repo_name=post.repo_simple_name, # @property 활용
            url=post.post_url
        ))
    
    return results
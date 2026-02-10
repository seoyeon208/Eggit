from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- GitHub 관련 하위 모델 ---
class TechStackItem(BaseModel):
    name: str
    color: Optional[str] = None
    percentage: float

class GithubStats(BaseModel):
    total_commits: int = 0
    total_stars: int = 0
    total_prs: int = 0
    total_issues: int = 0
    # 필요한 경우 잔디 데이터(calendar) 등 추가

# --- 메인 대시보드 응답 모델 ---
class DashboardResponse(BaseModel):
    # 블로그 지표
    total_visitors: int
    today_visitors: int = 0  # 구현 여부에 따라 선택
    
    # GitHub 지표
    tech_stack: List[TechStackItem] = []
    github_stats: GithubStats = GithubStats()
    
    # 메타 정보
    username: str
    last_updated: Optional[datetime]

    class Config:
        from_attributes = True  # ORM 객체를 Pydantic 모델로 변환 허용 (구 orm_mode)
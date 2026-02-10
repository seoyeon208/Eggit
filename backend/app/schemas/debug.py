from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime

# [Request] 프론트엔드 Payload와 1:1 매칭
class GithubAnalysisRequest(BaseModel):
    target_repo: str = Field(..., description="Target Repository (owner/repo)")
    branch: str = Field("main", description="Target Branch")
    period_days: int = Field(3, description="Analysis Period (1, 3, 7 days)")
    
    # 워커에서 동적 빌딩을 위해 사용하는 핵심 필드
    include: List[str] = Field(
        default=["tree", "diffs", "prs", "tech", "readme"],
        description="수집할 컨텍스트 항목 리스트"
    )
    
    user_intent: Optional[str] = Field("Debug Mode Analysis", description="사용자 의도")
    debug_mode: bool = True

# [Response] 워커가 반환하는 결과 구조 정의
class GithubAnalysisResult(BaseModel):
    project_structure: Optional[str] = None  # Tree
    detailed_changes: Optional[str] = None   # Diffs
    pr_background: Optional[str] = None      # PRs
    tech_stack: Optional[str] = None         # Tech Stack
    readme_summary: Optional[str] = None     # Readme (Docs)
    feature_summary: Optional[str] = None  # [New] 구조 요약
    change_summary: Optional[List[str]] = None
    analyzed_at: str = Field(default_factory=lambda: "2024-01-01T00:00:00Z") # Default placeholder
    
    @classmethod
    def create_result(cls, **kwargs):
        from app.utils.datetime_utils import now_utc, to_iso8601
        kwargs['analyzed_at'] = to_iso8601(now_utc())
        return cls(**kwargs)
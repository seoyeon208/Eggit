from pydantic import BaseModel
from datetime import datetime
from typing import List

class CalendarEventDto(BaseModel):
    id: int
    title: str
    date: str       # "YYYY-MM-DD" 형태
    type: str       # "chirpy" or "docs"
    repo_name: str  # "egg-project"
    url: str        # 이동할 링크

    class Config:
        from_attributes = True

class CalendarResponse(BaseModel):
    events: List[CalendarEventDto]
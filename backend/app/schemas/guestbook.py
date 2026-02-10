from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class GuestbookBase(BaseModel):
    content: str

class GuestbookCreate(GuestbookBase):
    owner_id: int

class GuestbookResponse(GuestbookBase):
    id: int
    owner_id: int
    author_id: Optional[int] = None
    author_name: Optional[str] = None
    created_at: str
    is_pinned: int = 0

    model_config = ConfigDict(from_attributes=True)
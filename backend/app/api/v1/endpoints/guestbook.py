from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api import deps
from app.models.user import User
from app.models.guestbook import Guestbook
from app.schemas.guestbook import GuestbookCreate, GuestbookResponse
from app.services import quest_service
from app.utils.datetime_utils import now_utc, to_iso8601

router = APIRouter()

@router.post("", response_model=GuestbookResponse)
def create_guestbook_entry(
    entry: GuestbookCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    owner = db.query(User).filter(User.id == entry.owner_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="User not found")

    new_entry = Guestbook(
        owner_id=entry.owner_id,
        author_id=current_user.id,
        content=entry.content,
        created_at=now_utc()
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)

    # 퀘스트 확인
    quest_service.check_guestbook_quest_achievements(db, current_user.id)
    
    # 응답 생성 (필드 할당 최적화)
    resp = GuestbookResponse(
        id=new_entry.id,
        owner_id=new_entry.owner_id,
        author_id=new_entry.author_id,
        content=new_entry.content,
        created_at=to_iso8601(new_entry.created_at),
        author_name=current_user.username,
        is_pinned=new_entry.is_pinned
    )
    return resp

@router.get("/{owner_id}", response_model=List[GuestbookResponse])
def get_guestbook_list(
    owner_id: int,
    db: Session = Depends(deps.get_db)
):
    try:
        entries = db.query(Guestbook).filter(Guestbook.owner_id == owner_id).order_by(Guestbook.is_pinned.desc(), Guestbook.created_at.desc()).all()
        
        result = []
        for e in entries:
            # 안전하게 데이터 매핑
            author_name = "Unknown"
            try:
                if e.author:
                    author_name = e.author.username
            except Exception as author_err:
                print(f"Error accessing author for guestbook {e.id}: {author_err}")
                
            resp = GuestbookResponse(
                id=e.id,
                owner_id=e.owner_id,
                author_id=e.author_id,
                content=e.content,
                created_at=to_iso8601(e.created_at),
                author_name=author_name,
                is_pinned=e.is_pinned
            )
            result.append(resp)
            
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch guestbook: {str(e)}")

@router.delete("/{guestbook_id}")
def delete_guestbook_entry(
    guestbook_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    방명록 삭제 (작성자 또는 홈피 주인만 가능)
    """
    entry = db.query(Guestbook).filter(Guestbook.id == guestbook_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="방명록을 찾을 수 없습니다.")
        
    if entry.author_id != current_user.id and entry.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")
        
    db.delete(entry)
    db.commit()
    return {"message": "방명록이 삭제되었습니다."}

@router.put("/{guestbook_id}/pin")
def toggle_pin_guestbook_entry(
    guestbook_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    방명록 고정/해제 (홈피 주인만 가능)
    """
    entry = db.query(Guestbook).filter(Guestbook.id == guestbook_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="방명록을 찾을 수 없습니다.")
    
    if entry.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="고정 권한이 없습니다. 홈피 주인만 가능합니다.")
    
    # Toggle pinned status (0 -> 1, 1 -> 0)
    entry.is_pinned = 1 if entry.is_pinned == 0 else 0
    db.commit()
    db.refresh(entry)
    
    return {
        "id": entry.id,
        "is_pinned": entry.is_pinned,
        "message": "고정 상태가 변경되었습니다."
    }
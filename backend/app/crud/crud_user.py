from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import encrypt_token # <--- 방금 만든 함수 import
from app.schemas.user import UserCreate
from datetime import datetime, timedelta, timezone

def get_by_github_id(db: Session, github_id: int):
    return db.query(User).filter(User.github_id == github_id).first()

def create_or_update_user(db: Session, github_user: dict, tokens: dict):
    from app.utils.datetime_utils import now_utc
    # 1. 토큰 만료 시간 계산
    expires_in = tokens.get("expires_in") # 보통 초 단위
    expires_at = None
    if expires_in:
        expires_at = now_utc() + timedelta(seconds=expires_in)

    # 2. 이미 존재하는 유저인지 확인
    user = get_by_github_id(db, github_id=github_user["id"])

    # [핵심] 저장하기 전에 암호화 수행!
    # DB에는 'gAAAAAB...' 처럼 알아볼 수 없는 문자가 저장됩니다.
    encrypted_access_token = encrypt_token(tokens["access_token"])
    encrypted_refresh_token = encrypt_token(tokens.get("refresh_token"))
    
    if user:
        # 3-A. 존재하면 정보 업데이트 (프로필 변경, 새 토큰 저장)
        user.username = github_user["login"]
        user.email = github_user.get("email")
        user.avatar_url = github_user.get("avatar_url")

        user.github_access_token = encrypted_access_token # 암호화된 값 저장
        user.github_refresh_token = encrypted_refresh_token
        user.github_token_expires_at = expires_at
    else:
        # 3-B. 없으면 신규 생성
        user = User(
            github_id=github_user["id"],
            username=github_user["login"],
            email=github_user.get("email"),
            avatar_url=github_user["avatar_url"],

            github_access_token=encrypted_access_token, # 암호화된 값 저장
            github_refresh_token=encrypted_refresh_token,
            github_token_expires_at=expires_at
        )
        db.add(user)
    
    db.commit()
    db.refresh(user)
    return user
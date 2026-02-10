from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials 
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from typing import Generator, Optional

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.user import User 

# HTTPBearer를 auto_error=False로 설정 (헤더 없어도 에러 안 냄)
security = HTTPBearer(auto_error=False)

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> User:
    
    # 🍪 1. Authorization 헤더 먼저 확인, 없으면 쿠키에서 찾기
    token = None
    if credentials:
        token = credentials.credentials
    else:
        # 쿠키에서 토큰 추출
        token = request.cookies.get("access_token")
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 토큰이 없습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="자격 증명을 검증할 수 없습니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise credentials_exception
    
    try:
        # 2. 토큰 디코딩
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        
        # 3. 토큰 안의 내용(sub) 꺼내기
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
    except JWTError:
        # 토큰 형식이 잘못되었거나, 만료되었거나, 서명이 안 맞을 때
        raise credentials_exception
        
    # 4. DB에서 유저 찾기
    user = db.query(User).filter(User.id == user_id).first()
    
    if user is None:
        raise credentials_exception
        
    return user

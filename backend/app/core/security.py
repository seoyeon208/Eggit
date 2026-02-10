from datetime import datetime, timedelta, timezone
from jose import jwt
from app.core.config import settings
from cryptography.fernet import Fernet

# 설정 파일에서 키를 가져와 Fernet 객체 생성 (이게 '자물쇠'이자 '열쇠'입니다) (암호화 객체)
fernet = Fernet(settings.ENCRYPTION_KEY)

# ==========================================
# 1. 브라우저 제공용 (JWT) 
# ==========================================

# JWT 토큰 생성
def create_access_token(subject: str | int) -> str:
    from app.utils.datetime_utils import now_utc
    expire = now_utc() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

# 브라우저 JWT 검증
def decode_token(token: str):
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

# ==========================================
# 2. DB 저장용 (GitHub Token) - Fernet 암호화 O
# ==========================================

def encrypt_token(token: str) -> str:
    """
    평문 토큰을 받아서 암호화된 문자열로 반환
    """
    if not token:
        return None
    # 1. 문자열을 바이트로 변환 (.encode())
    # 2. 암호화 (fernet.encrypt())
    # 3. DB 저장을 위해 다시 문자열로 변환 (.decode())
    return fernet.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token: str) -> str:
    """
    암호화된 토큰을 받아서 원래 평문으로 복호화
    """
    if not encrypted_token:
        return None
    try:
        return fernet.decrypt(encrypted_token.encode()).decode()
    except Exception:
        # 키가 안 맞거나 데이터가 손상된 경우 에러 처리
        return None
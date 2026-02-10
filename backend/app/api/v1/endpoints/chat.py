from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from pydantic import BaseModel
from datetime import datetime
import json

from app.api import deps
from app.core.socket_manager import manager
from app.models.chat import ChatMessage
from app.models.user import User
from app.models.friend import Friendship, FriendStatus
from jose import jwt, JWTError
from app.core.config import settings
from app.db.session import SessionLocal
from app.utils.friendship_utils import check_friendship

router = APIRouter()


# 메시지 응답 스키마
class FrontendMessageResponse(BaseModel):
    id: int
    text: str
    sender: str  # "me" 또는 상대방 username
    timestamp: str
    
    class Config:
        from_attributes = True


# 메시지 전송 요청 스키마
class SendMessageRequest(BaseModel):
    friendId: int
    text: str


# 채팅 내역 조회 (GET /api/v1/chat/{friend_id}/messages)
@router.get("/{friend_id}/messages", response_model=List[FrontendMessageResponse])
def get_chat_messages(
    friend_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # 1. 친구 관계 확인
    if not check_friendship(db, current_user.id, friend_id):
        raise HTTPException(status_code=403, detail="친구 관계가 아니므로 채팅 내역을 볼 수 없습니다.")
    
    # 2. 친구 정보 가져오기
    friend = db.query(User).filter(User.id == friend_id).first()
    friend_username = friend.username if friend else "Unknown"
    
    # 3. 대화 내역 조회
    messages = db.query(ChatMessage).filter(
        or_(
            (ChatMessage.sender_id == current_user.id) & (ChatMessage.receiver_id == friend_id),
            (ChatMessage.sender_id == friend_id) & (ChatMessage.receiver_id == current_user.id)
        )
    ).order_by(ChatMessage.created_at.asc()).offset(skip).limit(limit).all()
    
    # 4. 프론트엔드 형식으로 변환
    from app.utils.datetime_utils import to_iso8601
    result = []
    for msg in messages:
        result.append(FrontendMessageResponse(
            id=msg.id,
            text=msg.message,
            sender="me" if msg.sender_id == current_user.id else friend_username,
            timestamp=to_iso8601(msg.created_at)
        ))
    
    return result


# 프론트엔드용 메시지 전송 (POST /api/v1/chat/send)
@router.post("/send")
def send_message(
    request: SendMessageRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # 1. 친구 관계 확인
    if not check_friendship(db, current_user.id, request.friendId):
        raise HTTPException(status_code=403, detail="친구 관계가 아니므로 메시지를 보낼 수 없습니다.")
    
    # 2. 메시지 저장
    new_message = ChatMessage(
        sender_id=current_user.id,
        receiver_id=request.friendId,
        message=request.text
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    # 3. 응답 반환
    from app.utils.datetime_utils import to_iso8601
    return {
        "id": new_message.id,
        "text": new_message.message,
        "sender": "me",
        "timestamp": to_iso8601(new_message.created_at)
    }


# WebSocket은 헤더에 토큰을 넣기 힘들어서, 쿼리 파라미터로 받습니다.
# 예: ws://localhost:8000/api/v1/chat/ws/2?token=eyJ...
@router.websocket("/ws/{friend_id}")
async def chat_endpoint(
    websocket: WebSocket,
    friend_id: int,
    token: str = None,  # URL에서 토큰 받기 (?token=...)
):
    print(f"[WebSocket] 연결 시도: friend_id={friend_id}")
    
    # 0. 토큰 획득 (쿼리 스트링 -> 쿠키 순서)
    if not token:
        token = websocket.cookies.get("access_token")
    
    # 먼저 연결을 수락해야 메시지를 보낼 수 있음
    await websocket.accept()
    print(f"[WebSocket] 연결 수락됨")
    
    # 토큰이 없는 경우
    if not token:
        print(f"[WebSocket] 토큰 없음, 연결 종료")
        await websocket.close(code=1008)
        return
    
    # WebSocket에서는 Depends를 사용하면 세션 관리가 제대로 안되므로 직접 생성
    db = SessionLocal()
    
    # 1. 토큰 검증 및 내 ID 찾기
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: int = int(payload.get("sub"))
        print(f"[WebSocket] 토큰 검증 성공: user_id={user_id}")
    except (JWTError, ValueError) as e:
        print(f"[WebSocket] 토큰 검증 실패: {e}")
        db.close()
        await websocket.close(code=1008)  # 인증 실패
        return

    # 2. 친구 관계 확인
    if not check_friendship(db, user_id, friend_id):
        print(f"[WebSocket] 친구 관계 아님: user_id={user_id}, friend_id={friend_id}")
        db.close()
        await websocket.close(code=1003)  # 친구가 아님
        return
    
    print(f"[WebSocket] 친구 관계 확인 완료, 채팅방 입장")
    db.close()  # 초기 확인용 세션 닫기

    # 3. 방에 입장 (accept는 이미 했으므로 manager에서는 accept 호출 안함)
    room_id = manager.get_room_id(user_id, friend_id)
    manager.rooms[room_id].append((user_id, websocket))
    
    # 사용자를 온라인 상태로 등록
    manager.add_user_connection(user_id, websocket)
    
    print(f"[WebSocket] User {user_id} joined room {room_id}. Room size: {len(manager.rooms[room_id])}")

    try:
        while True:
            # 4. 클라이언트로부터 메시지 수신 (대기)
            data = await websocket.receive_text()
            
            # 5. DB에 메시지 저장 (매 메시지마다 새 세션 사용)
            db = SessionLocal()
            try:
                new_message = ChatMessage(
                    sender_id=user_id,
                    receiver_id=friend_id,
                    message=data
                )
                db.add(new_message)
                db.commit()
                db.refresh(new_message)  # DB에서 생성된 id, created_at 가져오기
                
                # 보낸 사람 정보 조회
                sender_user = db.query(User).filter(User.id == user_id).first()
                sender_username = sender_user.username if sender_user else "Unknown"

                from app.utils.datetime_utils import to_iso8601
                # 6-1. 보낸 사람(나)에게 전송할 메시지
                message_for_sender = {
                    "id": new_message.id,
                    "text": new_message.message,
                    "sender": "me",
                    "timestamp": to_iso8601(new_message.created_at),
                }
                
                # 6-2. 받는 사람에게 전송할 메시지
                message_for_receiver = {
                    "id": new_message.id,
                    "text": new_message.message,
                    "sender": sender_username,  # 보낸 사람의 username
                    "timestamp": to_iso8601(new_message.created_at),
                }
            finally:
                db.close()
            
            # 7. 각 사용자에게 맞는 메시지 전송
            room_id = manager.get_room_id(user_id, friend_id)
            sent_to_ws = set() # 중복 전송 방지
            
            for uid, ws in manager.rooms.get(room_id, []):
                try:
                    if uid == user_id:
                        await ws.send_text(json.dumps(message_for_sender))
                    else:
                        await ws.send_text(json.dumps(message_for_receiver))
                    sent_to_ws.add(ws)
                except Exception as e:
                    print(f"메시지 전송 실패 (user {uid}): {e}")

            # 8. 상대방의 다른 모든 연결(Presence 등)에게도 글로벌 알림 전송 (배경 알림용)
            if manager.is_user_online(friend_id):
                from app.utils.datetime_utils import now_utc, to_iso8601
                global_notification = {
                    "type": "new_message",
                    "sender_id": user_id,
                    "sender_username": sender_username,
                    "text": data, # 원본 메시지
                    "timestamp": to_iso8601(now_utc())
                }
                friend_connections = manager.user_connections.get(friend_id, set())
                for friend_ws in friend_connections:
                    if friend_ws not in sent_to_ws: # 이미 채팅방에서 받았으면 제외
                        try:
                            await friend_ws.send_text(json.dumps(global_notification))
                        except:
                            pass

    except WebSocketDisconnect:
        print(f"[WebSocket] User {user_id} disconnected")
    except Exception as e:
        print(f"[WebSocket] Error: {e}")
    finally:
        manager.disconnect(user_id, friend_id)
        manager.remove_user_connection(user_id, websocket)
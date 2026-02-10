from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import jwt, JWTError
from app.core.config import settings
from app.core.socket_manager import manager
from app.db.session import SessionLocal
from app.models.friend import Friendship, FriendStatus
from app.utils.friendship_utils import get_friend_ids
import json

router = APIRouter()


@router.websocket("/ws")
async def presence_endpoint(
    websocket: WebSocket,
    token: str = None,
):
    """
    실시간 온라인 상태 업데이트를 위한 WebSocket 엔드포인트
    """
    # 먼저 연결 수락
    await websocket.accept()
    
    # 토큰 가져오기: 쿼리 파라미터 우선, 없으면 쿠키에서
    if not token:
        # 쿠키에서 토큰 추출 시도
        token = websocket.cookies.get("access_token")
    
    print(f"[Presence] 연결 시도: token exists={token is not None}")
    
    # 토큰이 없는 경우
    if not token:
        print(f"[Presence] 토큰 없음, 연결 종료")
        await websocket.close(code=1008)
        return
    
    # 토큰 검증
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: int = int(payload.get("sub"))
        print(f"[Presence] 토큰 검증 성공: user_id={user_id}")
    except (JWTError, ValueError) as e:
        print(f"[Presence] 토큰 검증 실패: {e}")
        await websocket.close(code=1008)
        return
    
    # 사용자를 온라인 상태로 등록
    manager.add_user_connection(user_id, websocket)
    
    # 친구 목록 조회 - friendship_utils 사용
    db = SessionLocal()
    try:
        friend_ids = get_friend_ids(db, user_id)
        
        # 친구들에게 내가 온라인 상태임을 알림
        online_notification = json.dumps({
            "type": "user_online",
            "user_id": user_id
        })
        
        for friend_id in friend_ids:
            # 친구가 온라인이면 알림 전송
            if manager.is_user_online(friend_id):
                friend_connections = manager.user_connections.get(friend_id, set())
                for friend_ws in friend_connections:
                    try:
                        await friend_ws.send_text(online_notification)
                    except Exception as e:
                        print(f"[Presence] 친구 {friend_id}에게 온라인 알림 실패: {e}")
        
        # 현재 온라인인 친구 목록 전송
        online_friends = [fid for fid in friend_ids if manager.is_user_online(fid)]
        initial_status = json.dumps({
            "type": "initial_status",
            "online_friends": online_friends
        })
        await websocket.send_text(initial_status)
        
    finally:
        db.close()
    
    try:
        # 연결 유지 (ping-pong 또는 메시지 수신 대기)
        while True:
            # 클라이언트로부터 메시지 수신
            data = await websocket.receive_text()
            # presence 엔드포인트는 단순히 연결 유지만 하므로 메시지 처리 불필요
            
    except WebSocketDisconnect:
        print(f"[Presence] User {user_id} disconnected")
    except Exception as e:
        print(f"[Presence] Error: {e}")
    finally:
        # 사용자를 오프라인 상태로 변경
        manager.remove_user_connection(user_id, websocket)
        
        # 친구들에게 내가 오프라인 상태임을 알림
        db = SessionLocal()
        try:
            friend_ids = get_friend_ids(db, user_id)
            
            offline_notification = json.dumps({
                "type": "user_offline",
                "user_id": user_id
            })
            
            for friend_id in friend_ids:
                if manager.is_user_online(friend_id):
                    friend_connections = manager.user_connections.get(friend_id, set())
                    for friend_ws in friend_connections:
                        try:
                            await friend_ws.send_text(offline_notification)
                        except Exception as e:
                            print(f"[Presence] 친구 {friend_id}에게 오프라인 알림 실패: {e}")
        finally:
            db.close()

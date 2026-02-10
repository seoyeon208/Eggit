from typing import List, Dict, Set
from fastapi import WebSocket
from collections import defaultdict


class ConnectionManager:
    def __init__(self):
        # 방(room) 별로 연결된 웹소켓들을 관리
        # Key: room_id (str), Value: List of (user_id, websocket) tuples
        self.rooms: Dict[str, List[tuple]] = defaultdict(list)
        
        # 사용자별 활성 연결 추적 (온라인 상태 확인용)
        # Key: user_id (int), Value: Set of WebSocket connections
        self.user_connections: Dict[int, Set[WebSocket]] = defaultdict(set)

    def get_room_id(self, user_id: int, friend_id: int) -> str:
        """두 유저 간의 고유한 room_id 생성 (항상 같은 ID가 되도록 정렬)"""
        ids = sorted([user_id, friend_id])
        return f"chat_{ids[0]}_{ids[1]}"

    async def connect(self, websocket: WebSocket, user_id: int, friend_id: int):
        await websocket.accept()
        room_id = self.get_room_id(user_id, friend_id)
        self.rooms[room_id].append((user_id, websocket))
        print(f"User {user_id} joined room {room_id}. Room size: {len(self.rooms[room_id])}")

    def disconnect(self, user_id: int, friend_id: int):
        room_id = self.get_room_id(user_id, friend_id)
        # 해당 user_id의 연결을 찾아서 제거
        self.rooms[room_id] = [
            (uid, ws) for uid, ws in self.rooms[room_id] if uid != user_id
        ]
        print(f"User {user_id} left room {room_id}. Room size: {len(self.rooms[room_id])}")
        # 방이 비었으면 삭제
        if not self.rooms[room_id]:
            del self.rooms[room_id]

    async def send_to_room(self, message: str, user_id: int, friend_id: int):
        """같은 방에 있는 모든 사람에게 메시지 전송 (자신 포함)"""
        room_id = self.get_room_id(user_id, friend_id)
        for uid, websocket in self.rooms[room_id]:
            try:
                await websocket.send_text(message)
            except Exception as e:
                print(f"Error sending message to user {uid}: {e}")
    
    # === 온라인 상태 추적 메서드 ===
    
    def add_user_connection(self, user_id: int, websocket: WebSocket):
        """사용자의 WebSocket 연결 추가 (온라인 상태 추적)"""
        self.user_connections[user_id].add(websocket)
        print(f"User {user_id} connected. Total connections: {len(self.user_connections[user_id])}")
    
    def remove_user_connection(self, user_id: int, websocket: WebSocket):
        """사용자의 WebSocket 연결 제거"""
        if user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)
            # 연결이 모두 끊기면 사전에서 제거
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
            print(f"User {user_id} disconnected. Remaining connections: {len(self.user_connections.get(user_id, []))}")
    
    def is_user_online(self, user_id: int) -> bool:
        """사용자가 온라인 상태인지 확인"""
        return user_id in self.user_connections and len(self.user_connections[user_id]) > 0
    
    def get_online_users(self) -> List[int]:
        """현재 온라인 상태인 모든 사용자 ID 목록 반환"""
        return list(self.user_connections.keys())


manager = ConnectionManager()
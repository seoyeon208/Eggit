from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from app.models.friend import Friendship, FriendStatus


def check_friendship(db: Session, user_id: int, friend_id: int) -> bool:
    """
    두 유저가 친구인지 확인
    
    Args:
        db: Database session
        user_id: 첫 번째 유저 ID
        friend_id: 두 번째 유저 ID
        
    Returns:
        bool: 친구 관계이면 True, 아니면 False
    """
    friendship = db.query(Friendship).filter(
        Friendship.status == FriendStatus.ACCEPTED,
        or_(
            (Friendship.requester_id == user_id) & (Friendship.addressee_id == friend_id),
            (Friendship.requester_id == friend_id) & (Friendship.addressee_id == user_id)
        )
    ).first()
    return friendship is not None


def get_friendship(db: Session, user_id: int, friend_id: int) -> Optional[Friendship]:
    """
    두 유저 간의 친구 관계 객체를 반환 (상태 무관)
    
    Args:
        db: Database session
        user_id: 첫 번째 유저 ID
        friend_id: 두 번째 유저 ID
        
    Returns:
        Optional[Friendship]: 친구 관계 객체 또는 None
    """
    return db.query(Friendship).filter(
        or_(
            (Friendship.requester_id == user_id) & (Friendship.addressee_id == friend_id),
            (Friendship.requester_id == friend_id) & (Friendship.addressee_id == user_id)
        )
    ).first()


def get_accepted_friendship(db: Session, user_id: int, friend_id: int) -> Optional[Friendship]:
    """
    두 유저 간의 수락된(ACCEPTED) 친구 관계 객체만 반환
    
    Args:
        db: Database session
        user_id: 첫 번째 유저 ID
        friend_id: 두 번째 유저 ID
        
    Returns:
        Optional[Friendship]: ACCEPTED 상태의 친구 관계 객체 또는 None
    """
    return db.query(Friendship).filter(
        Friendship.status == FriendStatus.ACCEPTED,
        or_(
            (Friendship.requester_id == user_id) & (Friendship.addressee_id == friend_id),
            (Friendship.requester_id == friend_id) & (Friendship.addressee_id == user_id)
        )
    ).first()


def get_friend_ids(db: Session, user_id: int) -> List[int]:
    """
    특정 유저의 모든 친구 ID 목록 반환 (ACCEPTED 상태만)
    
    Args:
        db: Database session
        user_id: 유저 ID
        
    Returns:
        List[int]: 친구 ID 목록
    """
    friendships = db.query(Friendship).filter(
        Friendship.status == FriendStatus.ACCEPTED,
        or_(
            Friendship.requester_id == user_id,
            Friendship.addressee_id == user_id
        )
    ).all()
    
    friend_ids = []
    for fs in friendships:
        # 상대방 ID 추출
        friend_id = fs.addressee_id if fs.requester_id == user_id else fs.requester_id
        friend_ids.append(friend_id)
    
    return friend_ids


def get_accepted_friendships(db: Session, user_id: int) -> List[Friendship]:
    """
    특정 유저의 모든 수락된 친구 관계 목록 반환
    
    Args:
        db: Database session
        user_id: 유저 ID
        
    Returns:
        List[Friendship]: 친구 관계 객체 목록
    """
    return db.query(Friendship).filter(
        Friendship.status == FriendStatus.ACCEPTED,
        or_(
            Friendship.requester_id == user_id,
            Friendship.addressee_id == user_id
        )
    ).all()
# app/services/avatar_service.py
from app.models.avatar import Avatar, GrowthStage # Enum import 필요 및 실제 SQL Alchemy 모델
from sqlalchemy.orm import Session

def get_required_exp(level: int) -> int:
    """
    레벨별 필요 경험치를 반환하는 함수
    """
    # 1. 마스터 단계 (Lv 30~) - 엔드 콘텐츠
    if level >= 30:
        return 300  
    
    # 2. 유년기 단계 (Lv 1~9) 
    if level < 10:
        if level == 1: return 10
        if level == 2: return 15
        if level == 3: return 30
        if level <= 7: 
            return 40 + (level - 4) * 5  # [cite: 98]
        if level == 8: return 65
        if level == 9: return 75
        
    # 3. 성년기 단계 (Lv 10~29) -
    # 공식: 45 + (level - 10) * 4
    return 45 + (level - 10) * 4  


def get_growth_stage(level: int) -> GrowthStage:
    """
    레벨에 따른 성장 단계 반환
    1렙: EGG (알)
    1렙~9렙: CHILD (유년기)
    10렙~29렙: ADULT (성년기)
    30렙~: MASTER (마스터)
    """
    if level == 1:
        return GrowthStage.EGG
    if level < 10:
        return GrowthStage.CHILD
    elif level < 30:
        return GrowthStage.ADULT
    else:
        return GrowthStage.MASTER
    
def add_experience(db: Session, avatar: Avatar, amount: int):
    """
    경험치를 추가하고, 레벨업 조건을 체크하여 처리하는 로직 (재귀 or 루프)
    """
    avatar.exp += amount  # 일단 경험치 추가 
    
    # 레벨업 루프 (한 번에 2업 이상 할 수도 있으니 while문 사용)
    while True:
        required_exp = get_required_exp(avatar.level)
        
        # 현재 경험치가 필요 경험치보다 적으면 레벨업 없음 -> 루프 종료
        if avatar.exp < required_exp:
            break
            
        # 레벨업 발생! 
        avatar.exp -= required_exp  # 물통 비우고 남은 물 이월 
        avatar.level += 1           # 레벨 상승
        
        # 성장 단계(이미지) 변화 체크 및 반영 [cite: 40]
        new_stage = get_growth_stage(avatar.level)
        if avatar.growth_stage != new_stage:
            avatar.growth_stage = new_stage
    
    # 변경사항을 세션에 명시적으로 표시 (이미 loaded 객체이므로)
    db.flush()
    
    return avatar
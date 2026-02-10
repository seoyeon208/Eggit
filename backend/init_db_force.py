import sys
import os

# 현재 파일이 위치한 디렉토리(backend)를 sys.path에 추가하여 app 모듈을 찾을 수 있게 함
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from app.db.session import SessionLocal
from app.models.quest import Quest, QuestTitle, QuestFrequency

def init_default_quests():
    """기본 퀘스트 데이터 동기화 (Upsert 방식)"""
    
    db = SessionLocal()
    try:
        # 퀘스트 데이터 정의
        default_quests_data = [
            {
                "title": QuestTitle.DAILY_CHECKIN,
                "description": "매일 로그인하면 경험치를 획득합니다.",
                "exp_reward": 20,
                "frequency": QuestFrequency.DAILY
            },
            {
                "title": QuestTitle.DAILY_QUIZ,  # [New] 데일리 퀴즈
                "description": "AI가 출제한 오늘의 퀴즈를 맞추고 지식을 넓히세요.",
                "exp_reward": 30,                
                "frequency": QuestFrequency.DAILY 
            },
            {
                "title": QuestTitle.TECH_BLOG_CUSTOM,
                "description": "Tech Blog 또는 Custom 템플릿으로 새 글을 작성하세요.",
                "exp_reward": 40,
                "frequency": QuestFrequency.DAILY
            },
            {
                "title": QuestTitle.PROJECT_DOC,
                "description": "Project Doc 템플릿으로 새 문서를 작성하세요.",
                "exp_reward": 40,
                "frequency": QuestFrequency.DAILY
            },
            {
                "title": QuestTitle.VISIT_FRIEND_HOME,
                "description": "친구의 홈피를 방문하여 소통해보세요.",
                "exp_reward": 30,
                "frequency": QuestFrequency.DAILY
            },
            {
                "title": QuestTitle.WEEKLY_ATTENDANCE,
                "description": "이번 주에 5일 이상 출석하세요.",
                "exp_reward": 100,
                "frequency": QuestFrequency.WEEKLY
            },
            {
                "title": QuestTitle.GUESTBOOK_THREE_TIMES,
                "description": "이번 주에 친구 방명록을 3개 이상 남기세요.",
                "exp_reward": 70,
                "frequency": QuestFrequency.WEEKLY
            }
        ]

        print("🔄 Syncing default quests...")
        
        # Upsert 로직 (기존 ID 유지, 내용만 업데이트)
        for q_data in default_quests_data:
            existing_quest = db.query(Quest).filter(Quest.title == q_data["title"]).first()

            if existing_quest:
                # 변경사항이 있을 때만 업데이트 (불필요한 쓰기 방지)
                if (existing_quest.description != q_data["description"] or 
                    existing_quest.exp_reward != q_data["exp_reward"] or
                    existing_quest.frequency != q_data["frequency"]):
                    
                    existing_quest.description = q_data["description"]
                    existing_quest.exp_reward = q_data["exp_reward"]
                    existing_quest.frequency = q_data["frequency"]
                    existing_quest.is_active = True
                    print(f"  [UPDATE] {q_data['title']}")
            else:
                new_quest = Quest(**q_data, is_active=True)
                db.add(new_quest)
                print(f"  [CREATE] {q_data['title']}")

        db.commit()
        print("✅ Quest synchronization complete!")

    except Exception as e:
        print(f"❌ Error during initialization: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Initializing Quest Data (Standalone Mode)...")
    init_default_quests()
"""
아바타 메타 데이터 시드 스크립트
프론트엔드의 8가지 개발자 성향 테스트 결과에 맞는 아바타 메타를 생성합니다.
"""
from app.db.session import SessionLocal
from app.models.avatar import AvatarMeta, MatchType


def seed_avatar_metas():
    db = SessionLocal()
    try:
        # 이미 데이터가 있는지 확인
        existing_count = db.query(AvatarMeta).count()
        if existing_count > 0:
            print(f"Already seeded {existing_count} AvatarMeta records. Skipping...")
            return

        # 9가지 개발자 성향 타입에 맞는 아바타 메타 생성
        avatar_metas = [
            AvatarMeta(match_type=MatchType.VBS, name="프론트엔드"),            # 픽셀 아티스트 (프론트엔드)
            AvatarMeta(match_type=MatchType.LBS, name="백엔드"),                # 데이터 설계자 (백엔드)
            AvatarMeta(match_type=MatchType.LBG, name="풀스택"),                # 만능 올라운더 (풀스택)
            AvatarMeta(match_type=MatchType.VBG, name="게임/앱"),               # 인터랙티브 크리에이터 (게임/앱)
            AvatarMeta(match_type=MatchType.LAS, name="AI/데이터"),             # 미래를 읽는 예언자 (AI/데이터)
            AvatarMeta(match_type=MatchType.LAG, name="DevOps/보안"),           # 철벽의 수문장 (DevOps/보안)
            AvatarMeta(match_type=MatchType.VAG, name="PM"),                    # 큰 그림을 그리는 리더 (PM)
            AvatarMeta(match_type=MatchType.VAS, name="UI/UX"),                 # 사용자 경험 설계자 (UI/UX)
            AvatarMeta(match_type=MatchType.DEFAULT, name="알"),                 # 기본 알
        ]


        db.add_all(avatar_metas)
        db.commit()
        print(f"Successfully seeded {len(avatar_metas)} AvatarMeta records!")

    except Exception as e:
        print(f"Error seeding avatar metas: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("Starting AvatarMeta seed...")
    seed_avatar_metas()
    print("Seed completed!")

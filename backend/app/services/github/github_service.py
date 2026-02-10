import httpx
from app.core.config import settings
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.dashboard import UserDashboard
from app.models.user import User
from app.utils.github_client import fetch_github_stats # [연결] 님이 만든 유틸리티 import
from datetime import datetime
import asyncio

# 깃 로그인 과정
class GitHubService:
    @staticmethod
    async def get_token(code: str, redirect_uri: str = None):
        """프론트에서 받은 code를 사용하여 GitHub Access Token을 요청"""
        # [Fix] 전달받은 리다이렉트 주소가 없으면 기본값(로컬) 사용
        target_redirect_uri = redirect_uri or "http://localhost:5173/auth/callback"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": target_redirect_uri
                },
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="GitHub 통신 오류")
                
            data = response.json()
            if "error" in data:
                raise HTTPException(status_code=400, detail=data.get("error_description"))
                
            return data
    @staticmethod
    def fetch_and_update_github_stats(db: Session, user_id: int, access_token: str):
        """
        [백그라운드 작업] 
        GitHub API를 호출하여 유저의 통계(커밋, 스타, 언어 등)를 가져와 UserDashboard에 저장합니다.
        BackgroundTasks에서 호출되므로 async가 아닌 동기 함수로 작성해도 무방합니다.
        (requests 라이브러리는 동기 방식이므로 여기서 async/await를 섞지 않는 게 낫습니다.)
        """
        try:
            # 1. 유저 정보 조회 (username 필요)
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                print(f"❌ [Sync] User not found: {user_id}")
                return

            print(f"🔄 [Sync] Starting GitHub data sync for: {user.username}")
            
            # 2. [핵심] 님의 유틸리티 함수 호출 (실제 데이터 수집)
            # fetch_github_stats는 내부적으로 requests를 쓰므로 동기 함수입니다.
            stats_data = fetch_github_stats(access_token, user.username)
            
            if not stats_data:
                print(f"⚠️ [Sync] No data fetched for user: {user.username}")
                return

            # 3. DB 업데이트 (대시보드)
            dashboard = db.query(UserDashboard).filter(UserDashboard.user_id == user_id).first()
            
            if dashboard:
                # API 응답 구조를 DB 스키마에 맞게 매핑
                
                # (1) 기술 스택 (Top Languages)
                dashboard.tech_stack = stats_data.get("top_languages", [])
                
                # (2) 깃허브 활동 통계 (Stars, Commits, PRs, Issues)
                # DB의 github_stats 컬럼(JSON)에 저장할 데이터 구성
                dashboard.github_stats = {
                    "total_stars": stats_data.get("total_stars", 0),
                    "total_commits": stats_data.get("total_commits", 0),
                    "total_prs": stats_data.get("total_prs", 0),
                    "total_issues": stats_data.get("total_issues", 0),
                    # 잔디 데이터는 양이 많으므로 필요하면 저장하고, 아니면 제외 (여기선 포함)
                    # "calendar": stats_data.get("calendar", {}) 
                }
                
                # (3) 업데이트 시간 갱신
                from app.utils.datetime_utils import now_utc
                dashboard.last_github_updated_at = now_utc()
                
                db.commit()
                print(f"✅ [Sync] GitHub data updated successfully for: {user.username}")
            else:
                print(f"❌ [Sync] Dashboard not found for user: {user_id}")

        except Exception as e:
            print(f"❌ [Sync] Failed to update GitHub stats: {str(e)}")
            db.rollback() # 에러 시 롤백

    @staticmethod
    async def get_user_info(access_token: str):
        """Access Token으로 유저 프로필 정보 조회"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="GitHub 유저 정보 조회 실패")
                
            return response.json()
# app/api/endpoints/github.py (파일이 없다면 생성하고 main.py에 라우터 등록 필요)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from github import Github, GithubException

from app.api.deps import get_current_user, get_db
from app.core.security import decrypt_token
from app.models.user import User

router = APIRouter()

@router.get("/repos")
def get_my_repos(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    내 GitHub 계정의 Public 레포지토리 목록을 가져옵니다.
    (최신 업데이트순 정렬)
    """
    try:
        # 1. 토큰 복호화
        user_token = decrypt_token(current_user.github_access_token)
        
        g = Github(user_token)
        user = g.get_user()

        # 2. 레포지토리 가져오기 (type='owner': 내가 주인인 것만, sort='updated': 최근 수정순)
        # public_repo 스코프만 있으므로 자동으로 Public만 가져옴
        repos = user.get_repos(type='owner', sort='updated', direction='desc')
        
        # 3. 필요한 정보만 추출 (최대 30~50개 정도만 가져오는 것을 권장)
        repo_list = []
        for repo in repos[:50]: 
            repo_list.append({
                "id": repo.id,
                "name": repo.name,              # repo-name
                "full_name": repo.full_name,    # username/repo-name
                "description": repo.description,
                "html_url": repo.html_url,
                "language": repo.language,
                "updated_at": repo.updated_at
            })
            
        return repo_list

    except GithubException as e:
        raise HTTPException(status_code=500, detail=f"GitHub API Error: {e.data.get('message')}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
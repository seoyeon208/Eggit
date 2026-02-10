import logging
import base64
from typing import List, Optional, Literal
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, UploadFile, File, Form
from sqlalchemy.orm import Session
from celery.result import AsyncResult
from github import Github, GithubException
from pydantic import BaseModel

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.core.security import decrypt_token
from app.services.ai.ai_posting_service import AiPostingService 
from app.services.blog.blog_info_service import BlogInfoService
from app.services.ai.docs_generator import DocsGeneratorService
# [Workers]
from app.worker import (
    task_deploy_chirpy, 
    task_deploy_docs, 
    task_post_to_blog,
    task_generate_draft,
    celery_app
)

# [Schemas]
from app.schemas.blog import (
    # Deploy related
    BlogCreateMain, 
    BlogCreateDocs, 
    BlogDeployResponse, 
    ChirpyThemeSettings,
    DocsThemeSettings,
    AsyncTaskResponse,
    
    # AI Generation
    GenerateContentRequest,     
    GeneratedContentResponse,    
    
    # Manage related
    BlogRepoInfo, 
    BlogPostItem,
    PostContentResponse,
    BlogStructureResponse,
    FinalPostRequest,
    ReorderRequest,
    SourceRecommendRequest,
    ContentGenerateRequest
)

router = APIRouter()
logger = logging.getLogger(__name__)


# ========================================================================
# 1. [Deploy] Blog Creation & Deployment (중복 체크 및 강제 생성 적용)
# ========================================================================

@router.get("/check")
def check_blog_exists(
    user_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_user = current_user
    if user_id:
        target_user = db.query(User).filter(User.id == user_id).first()
        if not target_user:
            return {"exists": False}
    
    token = decrypt_token(current_user.github_access_token)
    try:
        g = Github(token)
        repo_name = f"{target_user.username}.github.io"
        try:
            g.get_user(target_user.username).get_repo(repo_name)
            return {"exists": True}
        except GithubException:
            return {"exists": False}
    except Exception:
        return {"exists": False}


# 1. 메인 블로그 생성
@router.post("/main", response_model=BlogDeployResponse, status_code=status.HTTP_202_ACCEPTED)
def deploy_main_blog(
    request: BlogCreateMain,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deploy Main Blog (Chirpy Theme) with Force Option"""
    user_token = decrypt_token(current_user.github_access_token)
    try:
        g = Github(user_token)
        github_user = g.get_user()
        username = github_user.login
        repo_name = f"{username}.github.io"

        # [Logic: Chirpy] 리포지토리 존재 여부 확인 및 처리
        try:
            repo = github_user.get_repo(repo_name)
            
            # 이미 존재함
            if request.is_force:
                # [수정] 삭제(delete) 대신 통과시킵니다. (403 Permission Error 방지)
                # 서비스 레이어의 git push --force가 내용을 덮어씁니다.
                logger.info(f"Repo {repo_name} exists. Proceeding to overwrite due to is_force=True.")
                pass 
                
            else:
                # 일반 모드: 중복 에러
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Repository '{repo_name}' already exists."
                )

        except GithubException as e:
            if e.status == 404:
                # 리포지토리가 없으면 생성 (기존 로직)
                try:
                    repo_desc = request.blog_tagline or "Tech blog powered by Eggit"
                    github_user.create_repo(
                        name=repo_name,
                        description=repo_desc,
                        auto_init=False, # 빈 리포지토리 생성
                        homepage=f"https://{repo_name}"
                    )
                    logger.info(f"Created new repo: {repo_name}")
                except GithubException as create_err:
                    raise HTTPException(status_code=500, detail=f"GitHub Error: {create_err.data.get('message')}")
            else:
                raise e

        theme_data = request.theme_settings.model_dump() if request.theme_settings else ChirpyThemeSettings().model_dump()

        user_info = {
            "github_username": username,
            "blog_title": request.blog_title,
            "blog_tagline": request.blog_tagline,
            "description": request.description,
            "email": request.author_email or github_user.email,
            "author_name": request.author_name or github_user.name or username,
            "theme_settings": theme_data,
            # [추가] 아바타 URL 전달 (스키마에 추가된 필드)
            "avatar_url": request.avatar_url 
        }

        task = task_deploy_chirpy.delay(user_token, repo_name, user_info)

        return BlogDeployResponse(
            task_id=task.id,
            status="processing",
            message=f"Deployment started for {repo_name}.",
            result_url=f"https://{username}.github.io"
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 1-2. 문서 사이트 생성 (Docs)
@router.post("/docs", response_model=BlogDeployResponse, status_code=status.HTTP_202_ACCEPTED)
def deploy_docs_site(
    request: BlogCreateDocs,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deploy Documentation Site (Docs Theme) with Force Option"""
    user_token = decrypt_token(current_user.github_access_token)
    
    theme_data = request.theme_settings.model_dump() if request.theme_settings else DocsThemeSettings().model_dump()
    project_info = {
        "project_name": request.project_name,
        "description": request.description,
        "theme_settings": theme_data
    }

    try:
        g = Github(user_token)
        repo = g.get_repo(request.target_repo)

        # [Logic: Docs] gh-pages 브랜치 존재 여부 확인
        branch_exists = False
        try:
            repo.get_branch("gh-pages")
            branch_exists = True
        except GithubException:
            branch_exists = False

        if branch_exists:
            if request.is_force:
                # 강제 모드: 브랜치 삭제 시도 (refs/heads/gh-pages)
                try:
                    ref = repo.get_git_ref("heads/gh-pages")
                    ref.delete()
                    logger.info(f"Deleted gh-pages branch in {request.target_repo}")
                except Exception as e:
                    logger.warning(f"Failed to delete branch: {e}")
            else:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Documentation site (gh-pages) already exists in '{request.target_repo}'."
                )

        task = task_deploy_docs.delay(user_token, request.target_repo, project_info)
        
        return BlogDeployResponse(
            task_id=task.id,
            status="processing",
            message=f"Deployment started for {request.target_repo}.",
            result_url=""
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/{task_id}")
def get_task_status(task_id: str):
    """Check Async Task Status"""
    task_result = AsyncResult(task_id, app=celery_app)
    response = {"task_id": task_id, "status": task_result.state}
    if task_result.state == 'SUCCESS':
        response["result"] = task_result.result
    elif task_result.state == 'FAILURE':
        response["error"] = str(task_result.info)
    return response


# ========================================================================
# 2. [Manage] Blog Discovery & Content Management
# ========================================================================

@router.get("/blogs", response_model=List[BlogRepoInfo])
async def get_blogs(current_user: User = Depends(get_current_user)):
    """Discover user's blogs (github.io or gh-pages branches)"""
    token = decrypt_token(current_user.github_access_token)
    service = BlogInfoService(token)
    return await service.get_my_blog_repos()


@router.get("/structure", response_model=BlogStructureResponse)
async def get_blog_structure(
    repo: str = Query(..., description="Target Repo Name"),
    branch: str = Query(..., description="Target Branch"),
    theme: str = Query(..., description="Theme Type (chirpy | docs)"),
    current_user: User = Depends(get_current_user)
):
    """
    [최적화됨] 카테고리 목록과 포스트 리스트를 한 번에 조회하고 Redis에 캐싱합니다.
    GitHub API 호출 횟수를 획기적으로 줄여줍니다.
    """
    # 1. DB User 조회는 여기서 1번만 일어남 (이후 Redis 캐시가 작동하면 GitHub 호출 X)
    token = decrypt_token(current_user.github_access_token)
    service = BlogInfoService(token)
    
    # 2. 통합된 서비스 호출
    return await service.get_blog_structure(repo, branch, theme)

@router.post("/reorder", status_code=200)
async def reorder_posts(
    request: ReorderRequest,
    current_user: User = Depends(get_current_user)
):
    """
    [Docs 전용] 포스트 순서 변경 (nav_order 재정렬)
    """
    token = decrypt_token(current_user.github_access_token)
    service = BlogInfoService(token)
    
    success = await service.update_nav_orders(request.repo_name, request.branch, request.ordered_paths)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to reorder posts.")
        
    return {"message": "Order updated successfully."}

@router.get("/blogs/post", response_model=PostContentResponse)
async def get_post_content(
    repo: str = Query(...),
    path: str = Query(...),
    branch: str = Query(...),
    current_user: User = Depends(get_current_user)
):
    """Fetch raw markdown content and SHA for editing"""
    token = decrypt_token(current_user.github_access_token)
    
    # Direct usage of GithubClient + Httpx for raw content fetch
    import httpx
    
    url = f"https://api.github.com/repos/{repo}/contents/{path}?ref={branch}"
    async with httpx.AsyncClient(headers={"Authorization": f"token {token}"}) as ac:
        resp = await ac.get(url)
        if resp.status_code != 200:
            raise HTTPException(status_code=404, detail="File not found")
        
        data = resp.json()
        content = base64.b64decode(data['content']).decode('utf-8')
        
        return PostContentResponse(content=content, sha=data['sha'])


# ========================================================================
# 3. [AI & Posting] Content Generation & Upload
# ========================================================================
# ========================================================================
# [통합] AI Generate Endpoint (Tech Blog & Docs 모두 처리)
# ========================================================================
@router.post("/generate", response_model=AsyncTaskResponse)
def generate_draft(
    request: GenerateContentRequest,
    current_user: User = Depends(get_current_user)
):
    """
    [Async] AI 통합 작업 요청
    - Tech Blog: 자동 포스팅
    - Docs: 파일 추천 및 내용 생성
    """
    token = decrypt_token(current_user.github_access_token)
    
    # 1. Celery Task 호출 (통합 워커 사용)
    task = task_generate_draft.delay(token, request.model_dump())
    
    logger.info(f"🚀 AI Task Started ({request.template_type}). Task ID: {task.id}")

    return AsyncTaskResponse(
        task_id=task.id,
        status="processing",
        message="AI 작업이 시작되었습니다. 잠시 후 완료됩니다."
    )


# [Image Upload Endpoint]
@router.post("/upload/image")
async def upload_blog_image(
    repo_name: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    이미지를 GitHub 레포지토리의 assets/img/posts/ 폴더에 업로드
    """
    token = decrypt_token(current_user.github_access_token)
    g = Github(token)
    
    try:
        repo = g.get_repo(repo_name)
        content = await file.read()
        
        # 1. 파일 경로 설정 (assets/img/posts/오늘날짜/파일명)
        from app.utils.datetime_utils import now_kst
        today_str = now_kst().strftime("%Y/%m/%d")
        file_path = f"assets/img/posts/{today_str}/{file.filename}"
        
        # 2. GitHub에 파일 생성 (덮어쓰기 로직)
        commit_msg = f"Upload image: {file.filename} (via Eggit)"
        
        try:
            contents = repo.get_contents(file_path)
            repo.update_file(file_path, commit_msg, content, contents.sha)
        except:
            repo.create_file(file_path, commit_msg, content)

        # 3. 반환
        final_path = f"/{file_path}"
        
        # LQIP (Base64 Preview) - 간단히 앞부분만 인코딩 (속도 최적화)
        lqip_data = base64.b64encode(content[:1024]).decode('utf-8')
        
        return {
            "path": final_path,
            "alt": file.filename.split('.')[0],
            "lqip": f"data:{file.content_type};base64,{lqip_data}" 
        }

    except Exception as e:
        logger.error(f"Image upload error: {e}")
        raise HTTPException(status_code=500, detail=f"GitHub 이미지 업로드 실패: {str(e)}")

# @router.post("/docs/recommend-sources")
# async def recommend_sources(
#     req: SourceRecommendRequest,
#     current_user: User = Depends(get_current_user) # dict가 아니라 User 객체임에 주의
# ):
#     """
#     [Docs Copilot] 문서 제목과 컨텍스트를 분석하여 참고할 만한 소스 코드를 추천합니다.
#     """
#     try:
#         # User 객체에서 토큰 추출 (decrypt 필요)
#         token = decrypt_token(current_user.github_access_token)
#         service = DocsGeneratorService(token=token)
        
#         # [수정] doc_title과 doc_context를 함께 전달
#         files = await service.recommend_related_files(
#             req.repo_name, 
#             req.branch, 
#             req.doc_title, 
#             req.doc_context
#         )
#         return {"recommendations": files}
#     except Exception as e:
#         print(f"Error in recommend_sources: {e}")
#         import traceback
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=str(e))

# @router.post("/docs/generate-content")
# async def generate_docs_content_api(
#     req: ContentGenerateRequest,
#     current_user: User = Depends(get_current_user)
# ):
#     """
#     [Docs Copilot] 선택된 소스 코드와 사용자 지침을 바탕으로 문서 내용을 생성합니다.
#     """
#     try:
#         token = decrypt_token(current_user.github_access_token)
#         service = DocsGeneratorService(token=token)
        
#         markdown = await service.generate_content(
#             req.repo_name, 
#             req.branch, 
#             req.doc_path, 
#             req.reference_files, 
#             req.user_prompt
#         )
#         return {"markdown_template": markdown}
#     except Exception as e:
#         print(f"Error in generate_docs_content: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# [Final Upload Endpoint]
@router.post("/upload", response_model=AsyncTaskResponse)
def upload_post(
    request: FinalPostRequest,
    current_user: User = Depends(get_current_user)
):
    """
    [Final Step] 작성/수정된 글을 GitHub에 업로드 (Async)
    * user_id를 Celery Task에 전달하여 퀘스트/대시보드 기록 수행
    """
    token = decrypt_token(current_user.github_access_token)
    
    # [핵심] user_id 전달
    task = task_post_to_blog.delay(token, request.model_dump(), current_user.id)
    
    return AsyncTaskResponse(
        task_id=task.id,
        status="processing",
        message=f"Uploading post '{request.title}' to {request.blog_repo}..."
    )
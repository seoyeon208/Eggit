# app/worker.py

import asyncio
import logging
import traceback
from datetime import datetime
from celery import Celery, signals
from celery.schedules import crontab
from celery.utils.log import get_task_logger

from app.core.config import settings
from app.db.session import SessionLocal 
from app.models.dashboard import BlogPost 
from app.models.quest import QuestTitle 
from app.models.user import User
from app.models.gift import DailyGift
from app.core.security import decrypt_token

# 서비스 임포트
from app.services.blog.github_blog_service import BlogDeployService
from app.services.github.github_client import GithubClient
from app.services.github.github_context_builder import GithubContextBuilder
from app.services.ai.ai_docs_site_generator import AiDocsBlogGenerator
from app.services.blog.blog_post_builder import BlogPostBuilder
from app.schemas.blog import FinalPostRequest
from app.services import quest_service 
from app.services.ai.ai_posting_service import AiPostingService 
from app.services.ai.docs_generator import DocsGeneratorService
from app.services.ai.gift_generator import GiftGeneratorService
from app.services.gift_service_logic import run_gift_generation_sync
from github import Github, GithubException

# 워커 로거
logger = get_task_logger(__name__)

celery_app = Celery(
    "eggit_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    result_expires=3600, 
    timezone='Asia/Seoul', 
    enable_utc=False, 
)


# =================================================================
# 1. 기술 블로그 배포 워커 (Chirpy)
# =================================================================
@celery_app.task(bind=True)
def task_deploy_chirpy(self, token: str, repo_name: str, user_info: dict):
    try:
        service = BlogDeployService(user_token=token)
        service.deploy_chirpy_blog(repo_name, user_info)
        return {"status": "success", "repo": repo_name, "type": "chirpy"}
    except Exception as e:
        logger.error(f"❌ Chirpy Deploy Task Failed: {e}")
        raise self.retry(exc=e, countdown=10, max_retries=3)


# =================================================================
# 2. 문서 사이트 배포 워커 (Docs - AI Integration)
# =================================================================
@celery_app.task(bind=True)
def task_deploy_docs(self, token: str, target_repo: str, project_info: dict):
    logger.info(f"🚀 Starting Docs Deployment for: {target_repo}")

    async def generate_ai_content():
        builder = GithubContextBuilder(token, target_repo)
        context = await (
            builder
            .with_tree()
            .with_readme()
            .with_tech_stack()
            .build()
        )
        
        if not context:
            logger.warning("⚠️ Failed to fetch repo context. Deploying empty docs.")
            return None

        context["repo_name"] = target_repo

        logger.info("🧠 Generating documentation structure with AI...")
        ai_service = AiDocsBlogGenerator()
        structure_data = await ai_service.generate_structure(context)
        
        return structure_data

    try:
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        docs_structure = None
        try:
            docs_structure = loop.run_until_complete(generate_ai_content())
            if docs_structure and "root_structure" in docs_structure:
                logger.info(f"✅ AI Generated {len(docs_structure['root_structure'])} categories.")
            else:
                logger.warning("⚠️ AI structure generation returned empty.")
        except Exception as ai_error:
            logger.error(f"❌ AI Generation skipped due to error: {ai_error}")

        service = BlogDeployService(user_token=token)
        service.deploy_docs_site(target_repo, project_info, docs_structure=docs_structure)
        
        return {
            "status": "success", 
            "repo": target_repo, 
            "type": "docs",
            "ai_generated": bool(docs_structure)
        }

    except Exception as e:
        logger.error(f"❌ Docs Deploy Task Failed: {e}")
        raise self.retry(exc=e, countdown=10, max_retries=3)


# =================================================================
# 5. 포스팅 업로드 워커
# =================================================================
@celery_app.task(bind=True)
def task_post_to_blog(self, token: str, post_data_dict: dict, user_id: int):
    try:
        req = FinalPostRequest(**post_data_dict)
        g = Github(token)
        target_repo_name = req.blog_repo.strip()
        if "/" not in target_repo_name:
            auth_user = g.get_user() 
            target_repo_name = f"{auth_user.login}/{target_repo_name}"
        
        repo = g.get_repo(target_repo_name)
        target_branch = req.branch
        
        try:
            repo.get_branch(target_branch)
        except Exception:
            if req.theme_type == "docs":
                try:
                    repo.get_branch("gh-pages")
                    target_branch = "gh-pages"
                except:
                    target_branch = repo.default_branch
            else:
                target_branch = repo.default_branch
            logger.info(f"🔧 Branch Adjusted: '{req.branch}' -> '{target_branch}'")

        builder = BlogPostBuilder(req)
        if req.mode == 'update' and req.file_path:
            target_path = req.file_path
            _, content = builder.build()
        else:
            target_path, content = builder.build()

        commit_msg = f"[{req.mode.upper()}] {req.title} (via Eggit)"

        try:
            contents = repo.get_contents(target_path, ref=target_branch)
            logger.info(f"📂 File exists at {target_path}. Overwriting...")
            repo.update_file(target_path, commit_msg, content, contents.sha, branch=target_branch)
        except GithubException as e:
            if e.status == 404:
                logger.info(f"✨ File not found at {target_path}. Creating new...")
                repo.create_file(target_path, commit_msg, content, branch=target_branch)
            else:
                raise e

        db = SessionLocal()
        try:
            username = target_repo_name.split("/")[0]
            if req.theme_type == "chirpy":
                slug = target_path.split("/")[-1].replace(".md", "")
                if "-" in slug and len(slug) > 11: slug = slug[11:] 
                post_url = f"https://{username}.github.io/posts/{slug}/"
            else:
                # [Fix] Docs URL 생성 로직 수정 (html 제거, Trailing Slash 추가)
                repo_only_name = target_repo_name.split("/")[-1]
                
                # 1. 파일 경로에서 확장자 제거
                clean_path = target_path.replace(".md", "")
                
                # 2. index 파일인 경우 경로에서 생략 (Folder Root)
                if clean_path.endswith("index"):
                    clean_path = clean_path[:-5]
                
                # 3. Trailing Slash 보장 (경로가 비어있지 않은 경우)
                if clean_path and not clean_path.endswith("/"):
                    clean_path += "/"
                
                post_url = f"https://{username}.github.io/{repo_only_name}/{clean_path}"

            new_activity = BlogPost(
                user_id=user_id,
                title=req.title,
                category=req.category,
                repository_name=target_repo_name,
                theme_type=req.theme_type,
                post_url=post_url
            )
            db.add(new_activity)
            target_quest = QuestTitle.TECH_BLOG_CUSTOM if req.theme_type == "chirpy" else QuestTitle.PROJECT_DOC
            quest_service.complete_quest_by_title(db, user_id=user_id, quest_title=target_quest)
            db.commit()

        except Exception as db_err:
            logger.error(f"⚠️ DB Post-Process Failed: {db_err}")
            db.rollback()
        finally:
            db.close()

        return {"status": "success", "path": target_path, "url": post_url}

    except Exception as e:
        logger.error(f"❌ Post Task Failed: {e}")
        if hasattr(e, 'data'):
            logger.error(f"Github API Error Data: {e.data}")
        raise self.retry(exc=e, max_retries=3, countdown=5)


# =================================================================
# 5. 주간 퀘스트 데이터 정리 워커 (Cleanup)
# =================================================================
@celery_app.task
def task_cleanup_old_quest_records():
    """
    매주 월요일 00:00에 실행
    - 데일리/위클리 퀘스트 완료 기록 중 30일(1개월)이 지난 기록을 삭제하여 DB 최적화
    - 'ONE_TIME' 방식이 아닌 것들만 선별삭제하며, 데이터 이력을 보존하기 위해 최근 1개월 데이터는 남겨둠
    """
    from app.db.session import SessionLocal
    from app.models.quest import Quest, UserQuest, QuestFrequency
    from datetime import datetime, timezone, timedelta
    
    db = SessionLocal()
    try:
        logger.info("🧹 Starting weekly quest cleanup (preserving last 30 days)...")
        
        # 1. 데일리/위클리 퀘스트 ID 목록 가져오기
        repeatable_quest_ids = [
            q.id for q in db.query(Quest.id).filter(
                Quest.frequency.in_([QuestFrequency.DAILY, QuestFrequency.WEEKLY])
            ).all()
        ]
        
        if not repeatable_quest_ids:
            return "No repeatable quests to cleanup."

        # 2. 30일 전 기준점 계산
        from app.utils.datetime_utils import days_ago_utc
        thirty_days_ago = days_ago_utc(30)

        # 3. 해당 퀘스트 중 기준점 이전의 기록만 삭제
        deleted_count = db.query(UserQuest).filter(
            UserQuest.quest_id.in_(repeatable_quest_ids),
            UserQuest.completed_at < thirty_days_ago.replace(tzinfo=None)
        ).delete(synchronize_session=False)
        
        db.commit()
        logger.info(f"✅ Cleanup complete: Deleted {deleted_count} records older than 30 days.")
        return f"Successfully deleted {deleted_count} records."
        
    except Exception as e:
        logger.error(f"❌ Cleanup Task Failed: {e}")
        db.rollback()
        return str(e)
    finally:
        db.close()

# =================================================================
# 6. [Daily Gift] 선물 생성 워커 (개별 유저용)
# =================================================================
@celery_app.task(bind=True)
def task_generate_user_gift(self, user_id: int, force_update: bool = False):
    """
    [Async] 특정 유저를 위한 데일리 선물 생성 (공통 로직 호출)
    - force_update: True일 경우 기존 선물을 덮어씀
    """
    try:
        run_gift_generation_sync(user_id, force_update=force_update)
    except Exception as e:
        logger.error(f"❌ Worker Gift Task Failed: {e}")

@celery_app.task(bind=True)
def task_schedule_daily_gifts(self):
    """
    매일 정해진 시간(17:30 KST)에 모든 활성 유저의 선물을 *새로 생성하여 덮어씌움*
    """
    db = SessionLocal()
    try:
        from app.utils.datetime_utils import now_kst
        target_date = now_kst().strftime("%Y-%m-%d")
        
        # 1. 활성 유저 조회
        users = db.query(User).filter(User.is_active == True).all()
        logger.info(f"⏰ Starting daily gift scheduling for {len(users)} users (Target: {target_date}, Force Update)...")
        
        count = 0
        for user in users:
            # [Change] 조건(exists) 체크 없이 무조건 재생성(force_update=True) 요청
            # 사용자의 요구: "매 한국시간 오후 5시30분 마다 새로 선물들이 생성되어 덮어씌워지는 로직"
            task_generate_user_gift.delay(user.id, force_update=True)
            count += 1
                
        logger.info(f"✅ Scheduled {count} gift generation tasks (Overwrite Mode).")
        
    except Exception as e:
        logger.error(f"❌ Daily Gift Schedule Failed: {e}")
    finally:
        db.close()


# =================================================================
# 8. [핵심] AI 통합 생성 워커 (시각화 데이터 전달 강화)
# =================================================================
@celery_app.task(bind=True)
def task_generate_draft(self, token: str, request_data: dict):
    """
    [Async] AI 통합 작업 처리 워커
    """
    req_type = request_data.get('type') or request_data.get('template_type') or 'tech_blog'
    repo_target = request_data.get('repo_name') or request_data.get('source_repo')
    
    # [Debug Visual] 제거 및 간소화
    # logger.info("="*60) 
    # logger.info(f"📥 [Worker Recv] Request Type: {req_type}")
    # ... 과도한 로깅 제거 ...

    try:
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        async def run_dispatch():
            # -----------------------------------------------------
            # [Case 1] Docs Content Generation (문서 내용 생성)
            # -----------------------------------------------------
            if req_type == 'docs_copilot':
                logger.info("📄 [Docs Copilot] Initializing Service...")
                service = DocsGeneratorService(token=token)
                
                # [Fix] 수정한 서비스 메서드 서명에 맞춰 모든 인자 전달
                markdown_result = await service.generate_content(
                    repo_name=repo_target,
                    branch=request_data.get('branch', 'main'),
                    doc_path=request_data.get('doc_path', 'new_doc.md'),
                    reference_files=request_data.get('reference_files', []),
                    
                    # [Critical] 서비스 내부의 로깅이 동작하려면 이 값들이 들어가야 함
                    user_prompt=request_data.get('user_prompt', ''),
                    doc_title=request_data.get('doc_title'),     # DTO 필드명 확인
                    doc_context=request_data.get('doc_context')  # DTO 필드명 확인
                )
                
                logger.info("✅ [Docs Copilot] Content Generated Successfully.")
                return {
                    "task_type": "docs_copilot",
                    "markdown_template": markdown_result
                }

            # -----------------------------------------------------
            # [Case 2] Docs Source Recommendation (파일 추천)
            # -----------------------------------------------------
            elif req_type == 'docs_recommend':
                logger.info("🔍 [Docs Recommend] Initializing Service...")
                service = DocsGeneratorService(token=token)
                
                files = await service.recommend_related_files(
                    repo_name=repo_target,
                    branch=request_data.get('branch', 'main'),
                    doc_title=request_data.get('doc_title', ''),
                    doc_context=request_data.get('doc_context', '')
                )
                
                safe_files = files
                if isinstance(files, list) and len(files) > 0 and hasattr(files[0], 'model_dump'):
                    safe_files = [f.model_dump(mode='json') for f in files]

                return {
                    "task_type": "docs_recommend",
                    "recommendations": safe_files
                }

            # -----------------------------------------------------
            # [Case 3] Tech Blog Posting
            # -----------------------------------------------------
            else:
                service = AiPostingService(token)
                result = await service.generate_post(request_data)
                return { "task_type": "tech_blog", **result.model_dump(mode='json') }

        result_data = loop.run_until_complete(run_dispatch())
        return result_data

    except Exception as e:
        error_msg = f"❌ [AI Task Failed] {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        raise e

# --- Celery Beat Schedule ---
celery_app.conf.beat_schedule = {
    "weekly-quest-cleanup": {
        "task": "app.worker.task_cleanup_old_quest_records",
        "schedule": crontab(hour=0, minute=0, day_of_week="monday"),
    },
    "daily-gift-generation": {
        "task": "app.worker.task_schedule_daily_gifts",
        "schedule": crontab(hour=15, minute=0), # UTC 15:00 -> KST 00:00 (Midnight)
    },
}
import asyncio
import logging
import re
import yaml
import json
from typing import List, Optional, Dict, Any

from app.services.github.github_client import GithubClient
from app.schemas.blog import BlogRepoInfo, BlogPostItem, BlogStructureResponse
from app.core.config import settings
import redis.asyncio as redis 

logger = logging.getLogger(__name__)

# Redis 연결 (설정에 따라 주소 변경 가능)
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

class BlogInfoService:
    def __init__(self, token: str):
        self.client = GithubClient(token)

    # =================================================================
    # [Optimized] 블로그 구조 전체 조회 (캐싱 적용)
    # =================================================================
    async def get_blog_structure(self, repo_name: str, branch: str, theme: str) -> BlogStructureResponse:
        """
        카테고리와 포스트 목록을 한 번에 조회하고 Redis에 캐싱합니다.
        Docs 테마의 경우 Title과 Nav Order까지 파싱하여 정렬된 결과를 반환합니다.
        """
        # 1. Redis 캐시 키 생성 (구조 변경 시 버전업: v2)
        cache_key = f"blog_struct_v2:{repo_name}:{branch}"
        
        try:
            # 2. 캐시 조회
            cached_data = await redis_client.get(cache_key)
            if cached_data:
                data = json.loads(cached_data)
                logger.info(f"✅ Cache Hit for {repo_name}")
                return BlogStructureResponse(**data)
        except Exception as e:
            logger.warning(f"⚠️ Redis unavailable, skipping cache: {e}")

        logger.info(f"⏳ Cache Miss. Fetching from GitHub: {repo_name}")

        # 3. 데이터 조회 (테마별 로직 분기)
        categories = set()
        posts = []

        try:
            if theme == "docs":
                # Docs는 전체 파일의 MetaData가 필요함 (Title, NavOrder 확인 위해)
                categories, posts = await self._analyze_docs_full_structure(repo_name, branch)
            elif theme in ["chirpy", "tech_blog"]:
                categories, posts = await self._analyze_chirpy_structure(repo_name, branch)
            else:
                categories = ["General"]
        except Exception as e:
            logger.error(f"❌ Failed to analyze blog structure: {e}")
            return BlogStructureResponse(categories=[], posts=[])

        # 4. 결과 구성 (정렬 로직)
        # Docs: nav_order 오름차순 (없으면 맨 뒤)
        # Chirpy: date 내림차순 (최신순)
        sorted_posts = sorted(
            posts, 
            key=lambda x: (x.nav_order if x.nav_order is not None else 999) if theme == 'docs' else (x.date or ""), 
            reverse=False if theme == 'docs' else True
        )

        result = BlogStructureResponse(
            categories=sorted(list(categories)),
            posts=sorted_posts
        )

        # 5. Redis 저장 (TTL: 600초 = 10분)
        try:
            await redis_client.set(cache_key, result.model_dump_json(), ex=600)
        except Exception as e:
            logger.error(f"⚠️ Failed to save cache: {e}")

        return result

    # --------------------------------------------------------------------------
    # [New] Docs Full Parsing Logic (Title & NavOrder 기반)
    # --------------------------------------------------------------------------
    async def _analyze_docs_full_structure(self, repo_name: str, branch: str):
        all_paths = await self.client.fetch_all_file_paths(repo_name, branch)
        
        # 1. 대상 파일 필터링 (.md 파일만, LICENSE/README 제외 가능성 있음)
        # index.md는 포함해야 홈 화면 수정 가능
        target_files = [p for p in all_paths if p.endswith(".md")]
        
        # 2. 전체 파일 내용 병렬 다운로드 (필수: Title과 NavOrder를 알아야 함)
        tasks = [self.client.fetch_raw_content(repo_name, p, branch) for p in target_files]
        contents = await asyncio.gather(*tasks)

        categories = set()
        posts = []

        # "Home"은 프론트엔드에서 고정적으로 보여줄 것이므로 카테고리 목록에는 'Home'을 명시적으로 넣음
        categories.add("Home")

        for path, content in zip(target_files, contents):
            if not content: continue
            
            meta = self._parse_front_matter(content)
            title = str(meta.get("title", path.split("/")[-1].replace(".md", ""))) # Title 없으면 파일명 fallback
            nav_order = meta.get("nav_order", 999) # 없으면 맨 뒤로
            
            # 카테고리 결정 로직
            # docs/Category/File.md -> Category
            # index.md -> Home
            # docs/File.md -> Home (Root docs)
            
            category = "Uncategorized"
            is_index = False
            
            if path == "index.md":
                category = "Home"
                nav_order = 0 # 홈은 무조건 0순위
                is_index = True
            elif path.startswith("docs/"):
                parts = path.split("/")
                
                # docs/Category/index.md (카테고리 정의 파일)
                if path.endswith("/index.md") and len(parts) >= 3:
                    category = parts[1] # 카테고리 이름
                    is_index = True     # 이것은 카테고리 자체를 나타냄
                
                # docs/Category/File.md (Depth 3 이상)
                elif len(parts) >= 3:
                    category = parts[1] # 폴더명 = 카테고리
                    is_index = False
                
                # docs/File.md (Depth 2)
                else:
                    category = "Home" # docs 루트에 있는 파일도 Home 탭에 넣거나, 'Docs Root' 등으로 분리 가능
                    is_index = False
            else:
                # 그 외 루트 파일 등
                category = "Home"
                is_index = False
            
            # 카테고리 수집 (Home 제외)
            if category != "Home":
                categories.add(category)

            # Nav Order 정수 변환 시도
            try:
                nav_order = int(nav_order)
            except:
                nav_order = 999

            posts.append(BlogPostItem(
                path=path,
                title=title,     # [중요] Front Matter의 Title 사용
                category=category,
                sha="unknown",
                date=None,
                nav_order=nav_order, # [중요] 정렬용 키
                is_index=is_index    # [New] 카테고리 식별용
            ))

        return categories, posts

    # --------------------------------------------------------------------------
    # [New] Nav Order 일괄 업데이트 (Bulk Update) - Scope 격리
    # --------------------------------------------------------------------------
    async def update_nav_orders(self, repo_name: str, branch: str, ordered_paths: List[str]) -> bool:
        """
        프론트엔드에서 보낸 ordered_paths 리스트의 순서대로 nav_order를 1부터 재할당.
        **주의:** 이 리스트에 없는 파일(다른 폴더/카테고리)은 건드리지 않음.
        """
        try:
            # 동기식 Github 객체 생성 (Commit용) - 루프 밖에서 한 번만 생성
            from github import Github
            g = Github(self.client.token)
            repo = g.get_repo(repo_name)

            for index, path in enumerate(ordered_paths):
                new_order = index + 1
                
                # 1. 파일 내용 가져오기 (비동기 클라이언트 활용)
                content = await self.client.fetch_raw_content(repo_name, path, branch)
                if not content:
                    logger.warning(f"File not found during reorder: {path}")
                    continue

                # 2. 기존 nav_order 값과 비교하여 다를 때만 업데이트 (API 호출 최소화)
                current_meta = self._parse_front_matter(content)
                current_order = current_meta.get("nav_order")
                
                # 형변환하여 비교 (문자열/정수 호환)
                if str(current_order) == str(new_order):
                    continue # 변경 없음, Skip

                # 3. 내용 수정
                updated_content = self._update_front_matter_value(content, "nav_order", new_order)
                
                # 4. GitHub Commit
                try:
                    file = repo.get_contents(path, ref=branch)
                    repo.update_file(
                        path=path,
                        message=f"Update nav_order: {current_order} -> {new_order}",
                        content=updated_content,
                        sha=file.sha,
                        branch=branch
                    )
                    logger.info(f"✅ Updated {path}: nav_order {new_order}")
                except Exception as commit_err:
                    logger.error(f"Failed to update {path}: {commit_err}")

            # 5. Redis 캐시 무효화 (구조가 바뀌었으므로)
            cache_key = f"blog_struct_v2:{repo_name}:{branch}"
            try: await redis_client.delete(cache_key)
            except: pass
                
            return True

        except Exception as e:
            logger.error(f"Bulk reorder failed: {e}")
            return False

    def _update_front_matter_value(self, content: str, key: str, value: Any) -> str:
        """
        Markdown 문자열 내의 Front Matter에서 특정 키의 값을 정규식으로 안전하게 교체합니다.
        없으면 새로 추가합니다.
        """
        # 1. Front Matter 영역 추출 (--- ... ---)
        fm_match = re.search(r"^---\n(.*?)\n---", content, re.DOTALL)
        if not fm_match:
            # FM이 없으면 새로 만듦
            return f"---\n{key}: {value}\n---\n\n{content}"
        
        fm_text = fm_match.group(1)
        
        # 2. 키가 존재하는지 확인 (^key:\s*.*$)
        pattern = re.compile(rf"^{key}:\s*.*$", re.MULTILINE)
        
        if pattern.search(fm_text):
            # 있으면 값 교체
            new_fm_text = pattern.sub(f"{key}: {value}", fm_text)
        else:
            # 없으면 끝에 추가
            new_fm_text = fm_text + f"\n{key}: {value}"
            
        # 3. 전체 본문에 적용
        return content.replace(fm_text, new_fm_text, 1)

    # --------------------------------------------------------------------------
    # Internal Logic: Chirpy (Front-matter 기반)
    # --------------------------------------------------------------------------
    async def _analyze_chirpy_structure(self, repo_name: str, branch: str):
        all_files = await self.client.fetch_all_file_paths(repo_name, branch)
        md_files = [f for f in all_files if f.startswith("_posts/") and f.endswith(".md")]

        tasks = [self.client.fetch_raw_content(repo_name, f, branch) for f in md_files]
        contents = await asyncio.gather(*tasks)

        categories = set()
        posts = []

        for path, content in zip(md_files, contents):
            if not content: continue
            
            meta = self._parse_front_matter(content)
            
            # [수정] 카테고리 추출 로직 강화 (List -> "Main/Sub" 문자열 변환)
            cats = meta.get("categories", [])
            primary_cat = "Uncategorized"
            
            if isinstance(cats, list) and cats:
                # [Main, Sub] -> "Main/Sub" 형태로 결합
                primary_cat = "/".join([str(c) for c in cats])
            elif isinstance(cats, str):
                primary_cat = cats
            
            categories.add(primary_cat)
            
            # 포스트 아이템 생성
            posts.append(BlogPostItem(
                path=path,
                title=str(meta.get("title", path.split("/")[-1])),
                category=primary_cat, # "Main/Sub" 형태
                date=str(meta.get("date", ""))[:10],
                sha="unknown",
                nav_order=None, # Chirpy는 nav_order 안 씀
                is_index=False # [Added] 명시적 추가
            ))

        return categories, posts

    # --------------------------------------------------------------------------
    # Helper: Front Matter 파싱
    # --------------------------------------------------------------------------
    def _parse_front_matter(self, content: str) -> dict:
        if not content: return {}
        # --- 사이의 YAML 데이터 추출
        match = re.search(r"^---\n(.*?)\n---", content, re.DOTALL)
        try:
            return yaml.safe_load(match.group(1)) if match else {}
        except:
            return {}
            
    # --------------------------------------------------------------------------
    # [Existing] 블로그 리포지토리 목록 조회 (유지)
    # --------------------------------------------------------------------------
    async def get_my_blog_repos(self) -> List[BlogRepoInfo]:
        try:
            repos = await self.client.fetch_my_repos()
            tasks = [self._analyze_repo(repo) for repo in repos]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            blogs = []
            for r in results:
                if isinstance(r, Exception): continue
                if r is not None: blogs.append(r)

            blogs.sort(key=lambda x: 0 if x.theme_type == 'chirpy' else 1)
            return blogs
        except Exception as e:
            logger.error(f"Critical error in get_my_blog_repos: {e}")
            return []

    async def _analyze_repo(self, repo: Dict[str, Any]) -> Optional[BlogRepoInfo]:
        try:
            full_name = repo['full_name']
            default_branch = repo['default_branch']
            repo_name = repo['name']
            
            if "github.io" in repo_name.lower():
                config = await self.client.fetch_raw_content(full_name, "_config.yml", default_branch)
                blog_title = self._parse_config_title(config, repo_name) if config else repo_name
                return BlogRepoInfo(repo_name=full_name, blog_title=blog_title, default_branch=default_branch, theme_type="chirpy")
            else:
                try:
                    config = await self.client.fetch_raw_content(full_name, "_config.yml", "gh-pages")
                    if config:
                        return BlogRepoInfo(repo_name=full_name, blog_title=self._parse_config_title(config, repo_name), default_branch="gh-pages", theme_type="docs")
                except: pass
            return None
        except: return None

    def _parse_config_title(self, content: str, default_title: str) -> str:
        try:
            data = yaml.safe_load(content)
            return data.get('title', default_title)
        except: return default_title
import os
import shutil
import subprocess
import uuid
import requests
import logging
import yaml
import base64
import binascii
import mimetypes
from typing import Dict, Optional, List

CHIRPY_TEMPLATE_PATH = "./templates/eggit_blog_theme"
DOCS_TEMPLATE_PATH = "./templates/eggit_docs_theme"

logger = logging.getLogger("BlogDeploy")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('[%(levelname)s] %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.propagate = False


class BlogDeployService:
    """블로그 배포 서비스 - Chirpy(Tech) & Just-the-Docs(Docs)"""
    
    def __init__(self, user_token: str):
        self.user_token = user_token

    def _run_git(self, cmd: str, cwd: str) -> str:
        """Git 명령 실행"""
        result = subprocess.run(
            cmd, 
            shell=True, 
            cwd=cwd, 
            capture_output=True, 
            text=True, 
            timeout=120
        )
        if result.returncode != 0:
            raise Exception(f"Git command failed: {result.stderr}")
        return result.stdout

    # =================================================================
    # [Helper] Chirpy Config 수정 (전체 필드 주입)
    # =================================================================
    def _update_chirpy_config(self, work_dir: str, user_info: dict, avatar_path_rel: Optional[str], repo_name: str):
        """
        Chirpy 테마 설정을 업데이트합니다.
        * avatar_path_rel: _setup_avatar_image에서 결정된 실제 아바타 경로
        * repo_name: BaseURL 설정을 위해 필요
        """
        config_path = os.path.join(work_dir, '_config.yml')
        
        with open(config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f) or {}

        # 1. 메타데이터 설정
        config['title'] = user_info.get('blog_title', 'My Tech Blog')
        config['tagline'] = user_info.get('blog_tagline', '')
        config['description'] = user_info.get('description', '')
        config['url'] = f"https://{user_info['github_username']}.github.io"
        
        # [Fix] BaseURL 설정 (CSS/JS 로딩 문제 해결의 핵심)
        # username.github.io 포맷이면 baseurl은 빈 문자열, 아니면 /repo_name
        if repo_name.lower() == f"{user_info['github_username'].lower()}.github.io":
            config['baseurl'] = ""
        else:
            config['baseurl'] = f"/{repo_name}"
            
        logger.info(f"✅ BaseURL 설정: '{config.get('baseurl')}' (Repo: {repo_name})")
        
        # 2. 아바타 경로 동적 설정 (중요)
        if avatar_path_rel:
            config['avatar'] = avatar_path_rel
            
        if 'github' not in config: config['github'] = {}
        config['github']['username'] = user_info['github_username']
        # [Add] 템플릿에서 방문자 추적 등에 사용할 소유자 정보
        config['repo_owner'] = user_info['github_username']

        if 'social' not in config: config['social'] = {}
        config['social']['name'] = user_info.get('author_name', user_info['github_username'])
        config['social']['email'] = user_info.get('email', '')
        config['social']['links'] = [f"https://github.com/{user_info['github_username']}"]

        # 3. 테마 색상 설정
        if user_info.get('theme_settings'):
            config['user_custom_theme'] = user_info['theme_settings']

        with open(config_path, 'w', encoding='utf-8') as f:
            yaml.dump(config, f, allow_unicode=True, sort_keys=False, default_flow_style=False)
            
        logger.info("✅ Chirpy _config.yml 업데이트 완료")

    # =================================================================
    # [FIX] 아바타 이미지 설정 (확장자 동적 감지 및 파일명 반환)
    # =================================================================
    def _setup_avatar_image(self, work_dir: str, user_info: dict) -> Optional[str]:
        """
        아바타 이미지를 다운로드/디코딩하여 저장하고, **저장된 파일의 웹 경로**를 반환합니다.
        Return: 예) "/assets/img/avatar.jpg" 또는 None
        """
        target_url = user_info.get('avatar_url')
        username = user_info['github_username']
        
        assets_dir = os.path.join(work_dir, "assets", "img")
        os.makedirs(assets_dir, exist_ok=True)

        # 1. 기존 템플릿의 avatar.* 파일 모두 삭제
        for f in os.listdir(assets_dir):
            if f.startswith("avatar."):
                try:
                    os.remove(os.path.join(assets_dir, f))
                except Exception:
                    pass
        
        # 2. GitHub 프로필 URL 조회 (Fallback)
        if not target_url:
            try:
                gh_url = f"https://api.github.com/users/{username}"
                headers = {"Authorization": f"Bearer {self.user_token}"}
                resp = requests.get(gh_url, headers=headers, timeout=5)
                if resp.status_code == 200:
                    target_url = resp.json().get('avatar_url')
            except Exception as e:
                logger.warning(f"⚠️ GitHub 아바타 조회 실패: {e}")

        if not target_url:
            return None

        final_filename = "avatar.png" # 기본값
        file_content = None

        try:
            # [CASE A] Base64 Data URI
            if target_url.startswith("data:"):
                header, encoded = target_url.split(",", 1)
                
                # MIME Type 추출
                mime_type = "image/png" # Default
                if ";" in header:
                    mime_type = header.split(":")[1].split(";")[0]
                
                # 확장자 결정
                ext = mimetypes.guess_extension(mime_type)
                if not ext: 
                    if "jpeg" in mime_type or "jpg" in mime_type: ext = ".jpg"
                    elif "gif" in mime_type: ext = ".gif"
                    else: ext = ".png"
                
                final_filename = f"avatar{ext}"
                file_content = base64.b64decode(encoded)
                logger.info(f"✅ Base64 이미지 감지: {mime_type} -> {final_filename}")

            # [CASE B] HTTP URL
            else:
                resp = requests.get(target_url, timeout=10)
                if resp.status_code == 200:
                    file_content = resp.content
                    
                    # Content-Type 헤더로 확장자 추론
                    content_type = resp.headers.get('Content-Type')
                    ext = mimetypes.guess_extension(content_type)
                    
                    if not ext:
                        if target_url.lower().endswith(".jpg") or target_url.lower().endswith(".jpeg"):
                            ext = ".jpg"
                        elif target_url.lower().endswith(".gif"):
                            ext = ".gif"
                        else:
                            ext = ".png"
                    
                    final_filename = f"avatar{ext}"
                    logger.info(f"✅ URL 이미지 다운로드: {content_type} -> {final_filename}")

            # 파일 저장
            if file_content:
                save_path = os.path.join(assets_dir, final_filename)
                with open(save_path, 'wb') as f:
                    f.write(file_content)
                
                # Chirpy Config에 들어갈 상대 경로 반환
                return f"/assets/img/{final_filename}"

        except Exception as e:
            logger.error(f"❌ 아바타 처리 중 오류: {e}")
            return None
            
        return None

    # =================================================================
    # [Public] 메인 블로그 배포 메서드
    # =================================================================
    def deploy_chirpy_blog(self, repo_name: str, user_info: dict):
        """Chirpy 기술 블로그 배포"""
        work_dir = f"/tmp/eggit_{uuid.uuid4()}"
        try:
            # 1. 템플릿 복사
            shutil.copytree(os.path.abspath(CHIRPY_TEMPLATE_PATH), work_dir)
            
            # 2. 아바타 이미지를 먼저 처리하여 파일명을 확정
            avatar_path_rel = self._setup_avatar_image(work_dir, user_info)
            
            # 3. 확정된 아바타 경로를 Config에 주입
            self._update_chirpy_config(work_dir, user_info, avatar_path_rel, repo_name)
            
            # 4. Git 배포 진행
            # [New] CSS Override for Chirpy Font Customization
            if user_info.get('theme_settings'):
                self._inject_chirpy_custom_css(work_dir, user_info['theme_settings'])
            
            repo_url = f"https://{self.user_token}@github.com/{user_info['github_username']}/{repo_name}.git"
            self._git_deploy(work_dir, repo_url, 'main')
            
            # 5. Pages 활성화
            self._enable_github_pages(user_info['github_username'], repo_name, 'main', 'workflow')
            
            logger.info("🎉 Chirpy 배포 완료")
        finally:
            shutil.rmtree(work_dir, ignore_errors=True)

    def _inject_chirpy_custom_css(self, work_dir: str, settings: dict):
        """Chirpy 테마에 커스텀 폰트 CSS 주입"""
        font_url = settings.get('font_import_url', '')
        font_family = settings.get('font_family_base', '')

        if not font_url and not font_family:
            return

        # Chirpy는 assets/css/jekyll-theme-chirpy.scss가 메인이지만
        # _includes/head.html에서 custom css를 로드하는 로직을 추가하거나
        # assets/css/style.scss에 덧붙여야 함.
        # 안전하게 assets/css/style.scss (없으면 생성)에 append.
        
        css_path = os.path.join(work_dir, 'assets', 'css', 'style.scss')
        os.makedirs(os.path.dirname(css_path), exist_ok=True)
        
        css_content = ["\n/* Eggit Custom Font Override */"]
        if font_url:
            css_content.append(f"@import url('{font_url}');")
        
        if font_family:
            # Chirpy uses --font-family-sans variables usually, but simple override works best
            css_content.append(f"body {{ font-family: {font_family}, sans-serif !important; }}")
            css_content.append(f":root {{ --font-family-sans: {font_family}, sans-serif; }}")
            
        with open(css_path, 'a', encoding='utf-8') as f:
            f.write("\n".join(css_content))
            
        logger.info(f"✅ Chirpy Custom Font CSS Injected")

    # --------------------------------------------------------------------------------
    # Just-the-Docs 관련 메서드 (SCSS 및 Config)
    # --------------------------------------------------------------------------------
    def _generate_docs_scss(self, settings: dict) -> str:
        sidebar_bg = settings.get('sidebar_bg', '#f5f6fa')
        main_bg = settings.get('main_bg', '#ffffff')
        link_color = settings.get('link_color', '#7253ed')
        font_url = settings.get('font_import_url', '')
        font_family = settings.get('font_family_base', '')
        
        scss = ["/* Eggit Custom Theme for Just-the-Docs */", ""]
        if font_url: scss.append(f"@import url('{font_url}');")
        
        scss.extend([
            f"$sidebar-color: {sidebar_bg};",
            f"$body-background-color: {main_bg};",
            f"$link-color: {link_color};",
            f"$btn-primary-color: {link_color};",
            f"$search-background-color: {main_bg};",
            ""
        ])
        if font_family:
            scss.append(f"$font-family-base: {font_family}, -apple-system, blinkmacsystemfont, 'Segoe UI', roboto, helvetica, arial, sans-serif;")
        return "\n".join(scss)

    def _write_docs_scss_file(self, work_dir: str, scss_content: str):
        scss_path = os.path.join(work_dir, '_sass', 'color_schemes', 'eggit_custom.scss')
        os.makedirs(os.path.dirname(scss_path), exist_ok=True)
        with open(scss_path, 'w', encoding='utf-8') as f:
            f.write(scss_content)
        logger.info(f"✅ Docs 3-Color SCSS 생성 완료")

    # =================================================================
    # [FIX] Docs 설정 업데이트 (메뉴 증발 버그 수정 핵심)
    # =================================================================
    def _update_docs_config(self, work_dir: str, project_info: dict, owner: str, repo: str):
        config_path = os.path.join(work_dir, '_config.yml')
        with open(config_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        content = content.replace("__REPO_NAME__", repo)
        content = content.replace("__GITHUB_USERNAME__", owner)
        config = yaml.safe_load(content) or {}

        config['title'] = project_info.get('project_name', repo)
        config['description'] = project_info.get('description', 'Documentation')
        config['url'] = f"https://{owner}.github.io"
        config['baseurl'] = f"/{repo}"
        
        # [핵심 수정] URL 매칭 오류 방지를 위한 Pretty Permalink 설정
        config['permalink'] = 'pretty' 
        config['search_enabled'] = True
        config['heading_anchors'] = True

        if 'aux_links' in config:
            config['aux_links'].pop('Template Repository', None)
            config['aux_links'].pop('Just the Docs on GitHub', None)
            config['aux_links'][f'{repo} on GitHub'] = f"https://github.com/{owner}/{repo}"

        config['color_scheme'] = 'eggit_custom'

        with open(config_path, 'w', encoding='utf-8') as f:
            yaml.dump(config, f, allow_unicode=True, sort_keys=False)
        
        logger.info(f"✅ Docs _config.yml 업데이트 완료 (permalink: pretty 적용)")

    # --------------------------------------------------------------------------------
    # 공통 Git 및 Pages 메서드
    # --------------------------------------------------------------------------------
    def _git_deploy(self, work_dir: str, repo_url: str, branch: str):
        self._run_git("git init", work_dir)
        self._run_git(f"git checkout -b {branch}", work_dir)
        self._run_git("git config user.name 'Eggit Bot'", work_dir)
        self._run_git("git config user.email 'bot@eggit.io'", work_dir)
        self._run_git("git add -A", work_dir)
        self._run_git("git commit -m 'Deploy by Eggit'", work_dir)
        self._run_git(f"git remote add origin {repo_url}", work_dir)
        self._run_git(f"git push origin {branch} --force", work_dir)

    def _enable_github_pages(self, owner: str, repo: str, branch: str, build_type: str):
        headers = {
            "Authorization": f"Bearer {self.user_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }
        try:
            requests.delete(f"https://api.github.com/repos/{owner}/{repo}/branches/{branch}/protection", headers=headers)
        except Exception: pass

        pages_url = f"https://api.github.com/repos/{owner}/{repo}/pages"
        payload = {"build_type": "workflow"} if build_type == "workflow" else {"source": {"branch": branch, "path": "/"}}
        try:
            res = requests.post(pages_url, headers=headers, json=payload)
            if res.status_code == 409: requests.put(pages_url, headers=headers, json=payload)
        except Exception as e: logger.warning(f"Pages 설정 실패: {e}")

    # --------------------------------------------------------------------------------
    # AI 구조 생성 관련 메서드 (유지 및 수정)
    # --------------------------------------------------------------------------------
    def _generate_docs_files(self, work_dir: str, nodes: list):
        if not nodes: return
        self._create_root_index(work_dir, nodes[0])
        remaining_nodes = nodes[1:]
        if remaining_nodes:
            self._process_recursive(work_dir, remaining_nodes, parent_path="docs", ancestors=[])

    def _process_recursive(self, work_dir: str, nodes: list, parent_path: str, ancestors: List[str]):
        base_path = os.path.join(work_dir, parent_path)
        if not os.path.exists(base_path): os.makedirs(base_path, exist_ok=True)

        for node in nodes:
            # 안전한 폴더명 생성
            safe_name = "".join([c for c in node['title'].lower().replace(" ", "-") if c.isalnum() or c == "-"])
            if not safe_name: safe_name = node['title'] # fallback

            current_path = os.path.join(base_path, safe_name)
            current_ancestors = ancestors + [node['title']]

            if node['is_directory']:
                os.makedirs(current_path, exist_ok=True)
                with open(os.path.join(current_path, "index.md"), "w", encoding="utf-8") as f:
                    f.write(self._create_front_matter(node, True, ancestors))
                if 'children' in node and node['children']:
                    self._process_recursive(work_dir, node['children'], os.path.join(parent_path, safe_name), current_ancestors)
            else:
                with open(f"{current_path}.md", "w", encoding="utf-8") as f:
                    f.write(self._create_front_matter(node, False, ancestors))

    # =================================================================
    # [Fix] Front Matter 생성 로직 (Nav Order 및 Escape 강화)
    # =================================================================
    def _create_front_matter(self, node: dict, is_index: bool, ancestors: List[str]) -> str:
        lines = ["---", "layout: default"]
        
        # Title Escape 처리
        safe_title = node['title'].replace('"', '\\"')
        lines.append(f"title: \"{safe_title}\"")
        
        if len(ancestors) > 0:
            lines.append(f"parent: \"{ancestors[-1]}\"")
            if len(ancestors) > 1: lines.append(f"grand_parent: \"{ancestors[-2]}\"")
        
        # [중요] nav_order가 있으면 꼭 기입
        if 'nav_order' in node and node['nav_order']:
            lines.append(f"nav_order: {node['nav_order']}")
            
        if is_index: lines.append("has_children: true")
        lines.append("---\n")
        lines.append(f"# {node['title']}\n")
        lines.append(f"{node.get('description', 'Auto-generated documentation page.')}\n")
        return "\n".join(lines)

    def _create_root_index(self, base_path: str, node: dict):
        node['nav_order'] = 1 
        with open(os.path.join(base_path, "index.md"), "w", encoding="utf-8") as f:
            f.write(self._create_front_matter(node, False, [])) 
        logger.info(f"✅ Root index.md created from '{node['title']}'")

    # [Docs] 문서 사이트 배포 메서드
    def deploy_docs_site(self, target_repo_full_name: str, project_info: dict, docs_structure: Optional[dict] = None):
        owner, repo = target_repo_full_name.split('/')
        work_dir = f"/tmp/eggit_{uuid.uuid4()}"
        try:
            shutil.copytree(os.path.abspath(DOCS_TEMPLATE_PATH), work_dir)
            if docs_structure and 'root_structure' in docs_structure:
                self._generate_docs_files(work_dir, docs_structure['root_structure'])
            if project_info.get('theme_settings'):
                self._write_docs_scss_file(work_dir, self._generate_docs_scss(project_info['theme_settings']))
            
            # [Fix] Config 업데이트 (permalink: pretty 추가됨)
            self._update_docs_config(work_dir, project_info, owner, repo)
            
            repo_url = f"https://{self.user_token}@github.com/{target_repo_full_name}.git"
            self._git_deploy(work_dir, repo_url, 'gh-pages')
            self._enable_github_pages(owner, repo, 'gh-pages', 'legacy')
            logger.info(f"🎉 Docs 배포 완료")
        finally:
            if os.path.exists(work_dir): shutil.rmtree(work_dir, ignore_errors=True)
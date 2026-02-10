import httpx
import asyncio
import json
import re
from typing import List, Dict, Any, Optional, Set, Tuple
from datetime import datetime, timedelta, timezone

# [Update] 유틸리티 임포트 경로 수정
from app.utils.tree_builder import TreeBuilder
from app.utils.universal_refiner import UniversalDietDiffRefiner
from app.utils.feature_extractor import FeatureExtractor

# =================================================================
# 상수 정의 (Constants)
# =================================================================

MAX_AI_CONTEXT_LENGTH = 20000

IGNORED_EXTENSIONS = {
    '.lock', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
    '.pdf', '.zip', '.tar', '.gz', '.mp4', '.mov', '.mp3',
    '.woff', '.woff2', '.ttf', '.eot', '.map', '.min.js', '.min.css'
}

IGNORED_DIRS = {
    'node_modules/', 'dist/', 'build/', 'coverage/', '.git/',
    '__pycache__/', '.idea/', '.vscode/', 'venv/', 'env/'
}

TECH_STACK_FILES = {
    "package.json", "requirements.txt", "pyproject.toml", "pom.xml", 
    "build.gradle", "build.gradle.kts", "go.mod", "Gemfile", "composer.json", 
    "Cargo.toml", "Dockerfile", "docker-compose.yml"
}

# Features 추출 대상 언어 확장자
SUPPORTED_FEATURE_EXTS = {
    '.py', '.js', '.jsx', '.ts', '.tsx', 
    '.java', '.go', '.rs', '.c', '.cpp', '.h', 
    '.php', '.rb', '.cs'
}

MAX_COMMITS = 15
MAX_DOC_CHARS = 15000

class GithubClient:
    """
    [GithubClient]
    GitHub API 통신 및 데이터 1차 가공을 담당하는 핵심 클래스입니다.
    5가지 핵심 정보(Tree, Diff, PR, Tech, Readme) + Features(Skeleton)를 수집합니다.
    """

    def __init__(self, token: str):
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"token {token}",
                "Accept": "application/vnd.github.v3+json",
            },
            timeout=40.0,
        )
        # [Update] FeatureExtractor 인스턴스 초기화 (Tree-sitter 로딩)
        self.feature_extractor = FeatureExtractor()

        self.refiner = UniversalDietDiffRefiner(max_hunk_lines=20)

    async def close(self):
        await self.client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    def _parse_repo_url(self, url: str) -> Tuple[str, str]:
        parts = url.rstrip(".git").split("/")
        return parts[-2], parts[-1]

    def _is_meaningful_file(self, filename: str) -> bool:
        if any(filename.endswith(ext) for ext in IGNORED_EXTENSIONS): return False
        if any(d in filename for d in IGNORED_DIRS): return False
        return True

    # =================================================================
    # [Section 0] 프론트엔드 필수 기능
    # =================================================================

    async def fetch_my_repos(self) -> List[Dict]:
        """사용자의 레포지토리 목록을 가져옵니다."""
        url = "https://api.github.com/user/repos"
        params = {"sort": "updated", "direction": "desc", "per_page": 100, "type": "all"}
        try:
            r = await self.client.get(url, params=params)
            if r.status_code == 200:
                return [
                    {
                        "id": repo["id"],
                        "name": repo["name"],
                        "full_name": repo["full_name"],
                        "private": repo["private"],
                        "html_url": repo["html_url"],
                        "description": repo.get("description", ""),
                        "default_branch": repo.get("default_branch", "main"),
                    }
                    for repo in r.json()
                ]
            return []
        except Exception:
            return []
    # =================================================================
    # [Upgrade] 선물 생성용 데이터 수집 (Length Limit 적용)
    # =================================================================
    async def get_default_branch(self, full_name: str) -> str:
        """레포지토리의 기본 브랜치(main 또는 master 등)를 조회합니다."""
        url = f"https://api.github.com/repos/{full_name}"
        try:
            r = await self.client.get(url)
            if r.status_code == 200:
                return r.json().get("default_branch", "main")
            return "main"
        except Exception:
            return "main"

    async def get_recent_activity_summary(self, username: str, days: int = 3) -> str:
        """
        AI에게 줄 '유저 활동 요약' 데이터를 생성합니다.
        [Safety] 전체 길이가 MAX_AI_CONTEXT_LENGTH를 넘지 않도록 관리합니다.
        """
        try:
            # 1. 최근 수정된 레포지토리 Top 3 조회
            repos_url = f"https://api.github.com/users/{username}/repos"
            params = {"sort": "updated", "direction": "desc", "per_page": 3, "type": "owner"}
            
            r = await self.client.get(repos_url, params=params)
            if r.status_code != 200:
                return "Failed to fetch repositories."
            
            repos = r.json()
            if not repos:
                return "No public repositories found."

            summary_buffer = []
            current_length = 0 # 현재 누적 글자 수
            
            from app.utils.datetime_utils import now_utc
            since_date = (now_utc() - timedelta(days=days)).isoformat()

            for repo in repos:
                # [Limit Check] 이미 용량이 꽉 찼으면 더 이상 조회하지 않음
                if current_length >= MAX_AI_CONTEXT_LENGTH:
                    summary_buffer.append("\n(Context limit reached. Remaining repos skipped.)")
                    break

                repo_name = repo['name']
                full_name = repo['full_name']
                
                # 2. 최근 커밋 내역 조회 (최대 5개)
                commits_url = f"https://api.github.com/repos/{full_name}/commits"
                c_params = {"author": username, "since": since_date, "per_page": 5}
                
                c_res = await self.client.get(commits_url, params=c_params)
                
                if c_res.status_code == 200:
                    repo_commits = c_res.json()
                    if not repo_commits:
                        continue

                    # (1) 기본 정보 추가 (Repo 이름 + 커밋 메시지)
                    repo_header = f"\n## Repository: {repo_name}\n### Recent Commit Messages:\n"
                    msgs = [f"- {c['commit']['message'].splitlines()[0]}" for c in repo_commits]
                    msg_block = repo_header + "\n".join(msgs) + "\n"
                    
                    summary_buffer.append(msg_block)
                    current_length += len(msg_block)

                    # (2) [Length Controlled] 가장 최신 커밋의 Diff 분석
                    # 남은 용량이 500자 미만이면 Diff는 생략 (의미 없는 조각 방지)
                    if current_length < (MAX_AI_CONTEXT_LENGTH - 500):
                        latest_sha = repo_commits[0]['sha']
                        diff_summary = await self._fetch_refined_diff(full_name, latest_sha)
                        
                        if diff_summary:
                            # 남은 공간 계산
                            remaining_space = MAX_AI_CONTEXT_LENGTH - current_length
                            
                            # Diff가 남은 공간보다 크면 자름
                            if len(diff_summary) > remaining_space:
                                diff_summary = diff_summary[:remaining_space] + "\n...(Diff Truncated due to AI context limit)..."
                            
                            diff_block = f"\n### Latest Code Changes (Refined):\n{diff_summary}\n"
                            summary_buffer.append(diff_block)
                            current_length += len(diff_block)

            return "".join(summary_buffer) if summary_buffer else "No recent activity detected."

        except Exception as e:
            print(f"Error getting activity summary: {e}")
            return "Error fetching activity history."

    async def _fetch_refined_diff(self, full_name: str, sha: str) -> str:
        """
        특정 커밋의 Raw Diff를 가져와서 UniversalDietDiffRefiner로 정제하여 반환
        """
        try:
            url = f"https://api.github.com/repos/{full_name}/commits/{sha}"
            # Diff 포맷으로 요청 (가장 가벼움)
            headers = {**self.client.headers, "Accept": "application/vnd.github.v3.diff"}
            
            r = await self.client.get(url, headers=headers)
            if r.status_code == 200:
                raw_diff = r.text
                # 사용자가 제공한 Refiner로 정제 (Tier 0, 1 위주로 추출)
                return self.refiner.refine(raw_diff)
            return ""
        except Exception:
            return ""
    # =================================================================
    # [Section 1] Atomic Fetchers (기본 데이터 수집)
    # =================================================================

    async def fetch_all_file_paths(self, full_name: str, branch: str) -> List[str]:
        """Git Tree API를 통해 전체 파일 목록 조회"""
        url = f"https://api.github.com/repos/{full_name}/git/trees/{branch}"
        try:
            r = await self.client.get(url, params={"recursive": "1"})
            if r.status_code == 200:
                return [item["path"] for item in r.json().get("tree", []) if item.get("type") == "blob"]
            return []
        except:
            return []

    async def fetch_raw_content(self, full_name: str, path: str, branch: str) -> str:
        """파일 Raw Content 조회"""
        url = f"https://api.github.com/repos/{full_name}/contents/{path}"
        headers = {**self.client.headers, "Accept": "application/vnd.github.v3.raw"}
        try:
            r = await self.client.get(url, params={"ref": branch}, headers=headers)
            return r.text[:MAX_DOC_CHARS] if r.status_code == 200 else ""
        except:
            return ""

    async def calculate_date_range(self, repo_url: str, branch: str, days: int) -> Tuple[datetime, datetime]:
        """최신 커밋 기준 날짜 범위 계산"""
        owner, repo = self._parse_repo_url(repo_url)
        full_name = f"{owner}/{repo}"
        
        url = f"https://api.github.com/repos/{full_name}/commits/{branch}"
        try:
            r = await self.client.get(url)
            if r.status_code == 200:
                date_str = r.json()["commit"]["committer"]["date"]
                end_date = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            else:
                from app.utils.datetime_utils import now_utc
                end_date = now_utc()
        except:
            from app.utils.datetime_utils import now_utc
            end_date = now_utc()
            
        start_date = end_date - timedelta(days=days)
        return start_date, end_date

    # =================================================================
    # [Section 2] The 5 Core Features (데이터 조회 및 정제 로직)
    # =================================================================

    # 1. Tech Stack
    # -----------------------------------------------------------------
    async def analyze_tech_stack(self, full_name: str, branch: str, all_paths: List[str] = None) -> str:
        """기술 스택 파일 분석 및 정제"""
        if not all_paths:
            all_paths = await self.fetch_all_file_paths(full_name, branch)
            
        target_files = [
            f for f in all_paths 
            if f in TECH_STACK_FILES or (f.count('/') <= 1 and f.split('/')[-1] in TECH_STACK_FILES)
        ]
        
        if not target_files:
            return "No dependency definition files found."

        contents = await asyncio.gather(*[self.fetch_raw_content(full_name, f, branch) for f in target_files])
        
        result_lines = []
        for fname, content in zip(target_files, contents):
            if content:
                refined = self._refine_tech_file_content(fname, content)
                result_lines.append(f"--- File: {fname} ---\n{refined}\n")
        
        return "\n".join(result_lines)

    def _refine_tech_file_content(self, filename: str, content: str) -> str:
        """(Internal) 기술 파일 내용 압축/정제 로직"""
        try:
            if "requirements.txt" in filename:
                libs = [line.split('==')[0].strip() for line in content.splitlines() 
                        if line.strip() and not line.startswith('#')]
                return ", ".join(libs)
            elif "package.json" in filename:
                data = json.loads(content)
                deps = list(data.get("dependencies", {}).keys())
                dev_deps = list(data.get("devDependencies", {}).keys())
                return json.dumps({"dependencies": deps, "devDependencies": dev_deps}, separators=(',', ':'))
            elif "gradle" in filename:
                libs = re.findall(r"(?:implementation|api|compileOnly)\s+['\"]([^'\"]+)['\"]", content)
                return ", ".join([lib.split(':')[0] for lib in libs])
            
            lines = content.splitlines()
            return "\n".join(lines[:50]) + ("..." if len(lines) > 50 else "")
        except:
            return content[:1000]

    # 2. Readme (Documentation)
    # -----------------------------------------------------------------
    async def analyze_readme(self, full_name: str, branch: str) -> str:
        """README 파일 검색 및 반환"""
        candidates = ["README.md", "readme.md", "README.txt", "ReadMe.md"]
        for name in candidates:
            content = await self.fetch_raw_content(full_name, name, branch)
            if content:
                return content
        return "No README found."

    # 3. Code Diff (Detailed Changes)
    # -----------------------------------------------------------------
    async def analyze_code_changes(self, full_name: str, branch: str, start_dt: datetime, end_dt: datetime) -> Dict[str, Any]:
        """
        기간 내 커밋 조회 -> 파일별 Patch 수집 -> [UniversalDietDiffRefiner]로 정제
        """
        # 1. 커밋 리스트 조회
        url = f"https://api.github.com/repos/{full_name}/commits"
        params = {"sha": branch, "since": start_dt.isoformat(), "until": end_dt.isoformat(), "per_page": MAX_COMMITS}
        try:
            r = await self.client.get(url, params=params)
            commits = r.json() if r.status_code == 200 else []
        except:
            commits = []

        if not commits:
            return {"detailed_changes": "", "changed_files": set(), "commits": []}

        # 2. 각 커밋의 상세 Diff 병렬 조회
        diff_tasks = [self.client.get(f"https://api.github.com/repos/{full_name}/commits/{c['sha']}") for c in commits]
        diff_responses = await asyncio.gather(*diff_tasks)

        # [Update] Universal Refiner 사용
        refiner = UniversalDietDiffRefiner(max_hunk_lines=30)
        refined_diffs = []
        changed_files = set()

        for resp in diff_responses:
            if resp.status_code != 200: continue
            data = resp.json()
            for f in data.get("files", []):
                filename = f.get("filename")
                patch = f.get("patch")
                
                if filename and patch and self._is_meaningful_file(filename):
                    changed_files.add(filename)
                    # Diff 정제
                    raw_diff = f"--- a/{filename}\n+++ b/{filename}\n{patch}"
                    
                    # [Fix] 메서드명 refine() 사용
                    refined = refiner.refine(raw_diff)
                    if refined: refined_diffs.append(refined)

        return {
            "detailed_changes": "\n\n".join(refined_diffs),
            "changed_files": changed_files,
            "commits": commits
        }

    # 4. Pull Requests
    # -----------------------------------------------------------------
    async def analyze_prs(self, full_name: str, commits: List[Dict]) -> str:
        """커밋 리스트와 연관된 PR 정보 수집"""
        if not commits: return ""
        
        pr_tasks = [self.client.get(f"https://api.github.com/repos/{full_name}/commits/{c['sha']}/pulls") for c in commits]
        pr_responses = await asyncio.gather(*pr_tasks)
        
        seen_prs = set()
        result_lines = []
        
        for resp in pr_responses:
            if resp.status_code == 200:
                prs = resp.json()
                if prs:
                    pr = prs[0]
                    if pr['number'] not in seen_prs:
                        seen_prs.add(pr['number'])
                        result_lines.append(f"### PR #{pr['number']}: {pr['title']}\n{pr.get('body', '')[:500]}")

        return "\n\n".join(result_lines)

    # 5. Project Tree Structure
    # -----------------------------------------------------------------
    def build_project_tree(self, all_paths: List[str], changed_files: Set[str] = None) -> str:
        """파일 리스트를 트리 구조 문자열로 변환 (변경된 파일 마킹 포함)"""
        return TreeBuilder.build_change_focused_tree(
            file_paths=all_paths,
            changed_files=changed_files or set(),
            max_depth=4
        )

    # 6. Feature Extraction (Skeleton)
    # -----------------------------------------------------------------
    async def extract_features_from_files(self, full_name: str, branch: str, changed_files: Set[str]) -> str:
        """
        [New] 변경된 파일들의 최신 전체 코드를 가져와 Tree-sitter로 구조(Skeleton)만 추출
        """
        if not changed_files:
            return ""

        # 1. 지원하는 확장자 필터링 (다국어 지원)
        source_files = [
            f for f in changed_files 
            if any(f.endswith(ext) for ext in SUPPORTED_FEATURE_EXTS)
        ]
        
        if not source_files:
            return ""

        # 2. 파일 원본 내용 병렬 Fetch (Diff가 아니라 전체 코드가 필요함)
        fetch_tasks = [self.fetch_raw_content(full_name, f, branch) for f in source_files]
        contents = await asyncio.gather(*fetch_tasks)

        # 3. Skeleton 추출
        results = []
        for fname, content in zip(source_files, contents):
            if content:
                skeleton = self.feature_extractor.extract_skeleton(fname, content)
                if skeleton:
                    results.append(skeleton)

        return "\n\n".join(results)

    # =================================================================
    # [Section 3] Composite Methods (기존 코드와의 호환성 유지용)
    # =================================================================

    async def get_filtered_diffs(self, repo_url: str, branch: str, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """
        [Legacy Support] 블로그 포스팅용 통합 데이터 조회
        """
        owner, repo = self._parse_repo_url(repo_url)
        full_name = f"{owner}/{repo}"

        # 1. 파일 목록 조회 (Tree용)
        all_paths = await self.fetch_all_file_paths(full_name, branch)

        # 2. Diff & Commits 분석
        diff_data = await self.analyze_code_changes(full_name, branch, start_date, end_date)
        
        # 3. PR 분석
        pr_background = await self.analyze_prs(full_name, diff_data["commits"])

        # 4. 트리 생성
        tree_str = self.build_project_tree(all_paths, diff_data["changed_files"])

        # 5. 문서 파일(Markdown) 별도 조회
        doc_files = [f for f in diff_data["changed_files"] if f.endswith(".md")]
        doc_contents = await asyncio.gather(*[self.fetch_raw_content(full_name, f, branch) for f in doc_files])
        doc_context = "\n".join([f"### {f}\n{c}" for f, c in zip(doc_files, doc_contents) if c])

        return {
            "project_structure": tree_str,
            "detailed_changes": diff_data["detailed_changes"],
            "pr_background": pr_background,
            "documentation_context": doc_context,
            "change_summary": list(diff_data["changed_files"])
        }

    async def get_docs_context(self, repo_url: str, branch: str = "main") -> Dict[str, str]:
        """[Legacy Support] 문서 사이트 생성용 데이터 조회"""
        owner, repo = self._parse_repo_url(repo_url)
        full_name = f"{owner}/{repo}"

        all_paths_task = self.fetch_all_file_paths(full_name, branch)
        readme_task = self.analyze_readme(full_name, branch)
        
        all_paths, readme = await asyncio.gather(all_paths_task, readme_task)
        
        tech_stack = await self.analyze_tech_stack(full_name, branch, all_paths)
        tree_str = self.build_project_tree(all_paths)

        return {
            "repo_name": full_name,
            "file_tree": tree_str,
            "tech_stack": tech_stack,
            "readme_summary": readme
        }
    
    # 별칭
    get_tech_stack_context = analyze_tech_stack
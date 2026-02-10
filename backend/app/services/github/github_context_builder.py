import asyncio
from typing import Dict, Any, List
from app.services.github.github_client import GithubClient
from datetime import datetime, timedelta

class GithubContextBuilder:
    """
    [GithubContextBuilder]
    Builder Pattern을 사용하여 GithubClient가 제공하는 기능들을 '조립'하는 역할을 합니다.
    """

    def __init__(self, token: str, repo_url: str):
        self.token = token
        self.repo_url = repo_url
        self.client = GithubClient(token)
        
        # 기본 설정
        self.branch = "main"
        self.period_days = 3
        
        # 데이터 선택 플래그
        self._needs = {
            'tree': False,
            'diffs': False,
            'prs': False,
            'tech': False,
            'readme': False,
            'features': False,
        }

    def set_branch(self, branch: str):
        self.branch = branch
        return self

    def set_period(self, days: int):
        self.period_days = days
        return self

    def with_tree(self):
        self._needs['tree'] = True
        return self

    def with_diffs(self):
        self._needs['diffs'] = True
        return self

    def with_prs(self):
        self._needs['prs'] = True
        return self

    def with_tech_stack(self):
        self._needs['tech'] = True
        return self

    def with_readme(self):
        self._needs['readme'] = True
        return self
    
    def with_features(self):
        """변경된 코드의 구조(함수/클래스 정의) 요약 포함"""
        self._needs['features'] = True
        return self

    async def build(self) -> Dict[str, Any]:
        try:
            owner, repo = self.client._parse_repo_url(self.repo_url)
            full_name = f"{owner}/{repo}"

            start_dt, end_dt = await self.client.calculate_date_range(self.repo_url, self.branch, self.period_days)

            # [Phase 1] 태스크 정의
            tasks = {}

            # A. 파일 목록
            if self._needs['tree'] or self._needs['tech']:
                tasks['all_paths'] = self.client.fetch_all_file_paths(full_name, self.branch)

            # B. 코드 변경사항 (Diff, PR, Features 모두 여기에 의존)
            need_diff_analysis = (
                self._needs['diffs'] or 
                self._needs['prs'] or 
                self._needs['features']
            )
            
            if need_diff_analysis:
                tasks['diff_data'] = self.client.analyze_code_changes(full_name, self.branch, start_dt, end_dt)

            # C. Readme
            if self._needs['readme']:
                tasks['readme'] = self.client.analyze_readme(full_name, self.branch)

            if not tasks:
                return {}
            
            # return_exceptions=True 추가 (하나가 터져도 나머지는 살림)
            results = await asyncio.gather(*tasks.values(), return_exceptions=True)
            
            # 결과 매핑 (에러 처리 포함)
            phase1_data = {}
            for key, result in zip(tasks.keys(), results):
                if isinstance(result, Exception):
                    print(f"⚠️ Task '{key}' failed: {result}")
                    phase1_data[key] = {} if key == 'diff_data' else []
                else:
                    phase1_data[key] = result

            # [Phase 2] 조립
            final_context = {}
            
            all_paths = phase1_data.get('all_paths', [])
            diff_data = phase1_data.get('diff_data', {})
            
            commits = diff_data.get('commits', [])
            changed_files = diff_data.get('changed_files', set())

            # [Fix] changed_files를 list로 명시적 변환
            changed_files_list = list(changed_files) if isinstance(changed_files, set) else changed_files

            # 1. Features (Skeleton) 추출
            if self._needs['features']:
                if changed_files:
                    summary = await self.client.extract_features_from_files(
                        full_name, self.branch, changed_files
                    )
                    final_context['feature_summary'] = summary if summary else "No structural changes detected (e.g., logic updates) in source files."
                else:
                    final_context['feature_summary'] = "No files were changed in the selected period."

            # 2. Tech Stack
            if self._needs['tech']:
                final_context['tech_stack'] = await self.client.analyze_tech_stack(full_name, self.branch, all_paths)

            # 3. PR
            if self._needs['prs']:
                final_context['pr_background'] = await self.client.analyze_prs(full_name, commits)

            # 4. Tree
            if self._needs['tree']:
                final_context['project_structure'] = self.client.build_project_tree(all_paths, changed_files)

            # 5. Diff
            if self._needs['diffs']:
                final_context['detailed_changes'] = diff_data.get('detailed_changes', "")
                # [Fix] list로 변환하여 저장
                final_context['change_summary'] = changed_files_list

            if self._needs['readme']:
                final_context['readme_summary'] = phase1_data.get('readme', "")

            return final_context

        finally:
            await self.client.close()
import os
import asyncio
import json
import logging
import re
import yaml
import sys
from typing import List, Dict, Any, Optional

# LangChain imports
import langchain
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.github.github_client import GithubClient
from app.services.ai.ai_docs_site_generator import AiDocsBlogGenerator

# [Debugger Setup]
# 로그 레벨 설정 (Celery 환경 대응)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# -------------------------------------------------------------------------
# [Schemas]
# -------------------------------------------------------------------------
class RecommendedFile(BaseModel):
    path: str = Field(description="The exact file path")
    reason: str = Field(description="Reason for selection")
    score: int = Field(description="Relevance score (0-100)")

class RecommendationResult(BaseModel):
    files: List[RecommendedFile] = Field(description="List of selected files")

class DocsGeneratorService:
    def __init__(self, token: str):
        self.gh = GithubClient(token)
        self.ai_generator = AiDocsBlogGenerator()
        
        # 모델 설정 (비용/성능 고려: gpt-4o 사용 권장)
        self.scanner_llm = ChatOpenAI(
            model="gpt-4o",
            api_key=settings.OPENAI_API_KEY,
            temperature=0
        )

    # -------------------------------------------------------------------------
    # [NUCLEAR LOGGING] 강제 출력 함수 (Celery 로거 무시하고 stdout에 쏨)
    # -------------------------------------------------------------------------
    def _force_print(self, title: str, content: str):
        try:
            separator = "=" * 60
            # 터미널용 포맷 (Celery 로그에서 식별하기 쉽도록)
            log_message = f"\n{separator}\n[DEBUG: {title}]\n{separator}\n{content}\n{separator}\n"
            sys.__stdout__.write(log_message)
            sys.__stdout__.flush()
        except Exception:
            pass # 로깅 실패로 로직이 멈추지 않도록 함

    # -------------------------------------------------------------------------
    # Helper Methods
    # -------------------------------------------------------------------------
    def _parse_front_matter(self, content: str) -> (dict, str):
        """
        마크다운 파일에서 YAML Front Matter와 본문을 분리하여 추출합니다.
        """
        front_matter = {}
        body = content or "" # None 방어
        
        pattern = r"^---\s+(.*?)\s+---\s+(.*)$"
        match = re.search(pattern, body, re.DOTALL)
        
        if match:
            yaml_text = match.group(1)
            body_text = match.group(2)
            try:
                front_matter = yaml.safe_load(yaml_text)
                return front_matter, body_text
            except Exception as e:
                logger.warning(f"YAML parsing failed: {e}")
                
        return front_matter, body

    def _is_ignored(self, path: str) -> bool:
        ignored_ext = {
            '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', '.zip', '.tar', '.gz', 
            '.woff', '.ttf', '.mp4', '.lock', '.txt', '.map', '.min.js', '.css', '.scss',
            '.json', '.xml', '.yml', '.yaml'
        }
        ignored_dirs = {
            'node_modules/', 'dist/', 'build/', '.git/', '__pycache__/', 'venv/', '_site/', 'docs/', 
            '.github/', 'public/', 'assets/'
        }
        if any(path.endswith(ext) for ext in ignored_ext): return True
        if any(d in path for d in ignored_dirs): return True
        return False

    # -------------------------------------------------------------------------
    # [Logic 1] AI File Scanning
    # -------------------------------------------------------------------------
    async def recommend_related_files(
        self, 
        repo_name: str, 
        branch: str, 
        doc_title: str, 
        doc_context: str = "", 
        doc_path: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        
        self._force_print("STEP 1: SCANNER START", f"Repo: {repo_name}\nGoal: {doc_title}")
        
        # 1. 데이터 수집
        all_files = await self.gh.fetch_all_file_paths(repo_name, branch)
        
        # [Fix] 브랜치가 유효하지 않은 경우 (파일 0개), 실제 기본 브랜치로 재시도
        if not all_files:
            real_default = await self.gh.get_default_branch(repo_name)
            if real_default and real_default != branch:
                self._force_print("BRANCH CORRECTION", f"'{branch}' failed. Retrying with default: '{real_default}'")
                branch = real_default
                all_files = await self.gh.fetch_all_file_paths(repo_name, branch)

        filtered = [f for f in all_files if not self._is_ignored(f)]
        
        # 파일 트리 생성 (Max 3000개)
        file_tree = "\n".join(filtered[:3000])
        
        try:
            readme = await self.gh.analyze_readme(repo_name, branch)
            tech = await self.gh.analyze_tech_stack(repo_name, branch)
        except:
            readme, tech = "N/A", "N/A"

        self._force_print("SCANNER INPUTS", f"Files: {len(filtered)}\nTech: {tech}\nContext: {doc_context}")

        # 2. LLM 호출
        ai_picks = await self._invoke_llm_scanner(
            file_list_str=file_tree,
            readme_summary=str(readme)[:1500],
            tech_stack=str(tech),
            doc_title=doc_title,
            user_context=doc_context
        )
        
        # 3. 결과 매핑
        result = []
        for path in filtered:
            item = {
                "path": path, 
                "name": os.path.basename(path), 
                "type": "file"
            }
            
            if path in ai_picks:
                d = ai_picks[path]
                item.update({
                    "recommended": True, 
                    "score": d['score'], 
                    "reason": d['reason']
                })
            else:
                item.update({
                    "recommended": False, 
                    "score": 0, 
                    "reason": None
                })
            result.append(item)
            
        # 정렬: 추천된 것을 상단에 배치 (트리 구성 시에는 무시되겠지만 리스트 뷰에서는 유용)
        result.sort(key=lambda x: x['score'], reverse=True)
        
        self._force_print("SCANNER RESULT", f"Selected: {len(result)} files")
        return result

    async def _invoke_llm_scanner(self, file_list_str, readme_summary, tech_stack, doc_title, user_context):
        # f-string 내부에 JSON 스키마({})가 들어가면 충돌나므로 변수 주입 방식 사용
        parser = JsonOutputParser(pydantic_object=RecommendationResult)
        format_instructions = parser.get_format_instructions()
        
        system_content = "You are a Senior Software Architect. Select 3-7 files relevant to the documentation topic."
        
        human_content = f"""
        [Project Info]
        Stack: {tech_stack}
        Readme: {readme_summary}

        [Goal]
        Title: {doc_title}
        Context: {user_context}

        [Files]
        {file_list_str}

        [Task]
        Return the relevant files in JSON format.
        {format_instructions}
        """
        
        messages = [
            SystemMessage(content=system_content),
            HumanMessage(content=human_content)
        ]
        
        response = await self.scanner_llm.ainvoke(messages)
        
        try:
            parsed_result = parser.parse(response.content)
            return {item['path']: {'score': item['score'], 'reason': item['reason']} for item in parsed_result.get('files', [])}
        except Exception as e:
            logger.error(f"Scanner Parse Error: {e}")
            return {}


    # =================================================================
    # [Logic 2] Content Generation (Fixed: Tables & Mermaid 9.1.3)
    # =================================================================
    async def generate_content(
        self, 
        repo_name: str, 
        branch: str, 
        doc_path: Optional[str], 
        reference_files: List[str], 
        user_prompt: Optional[str] = "",
        doc_title: Optional[str] = None,
        doc_context: Optional[str] = None
    ) -> str:
        
        # [FIX: NoneType Error 방어]
        safe_doc_path = doc_path
        if not safe_doc_path:
            safe_doc_path = "new_document.md"
            self._force_print("WARNING", "doc_path was None/Empty. Defaulting to 'new_document.md'")

        self._force_print("STEP 2: GENERATOR START", f"Target: {safe_doc_path}")
        
        # 1. Fetch Data (Target + References)
        target_file_task = self.gh.fetch_raw_content(repo_name, safe_doc_path, branch)
        
        # [Fix Preview] 먼저 content를 확인하여 브랜치가 유효한지 체크 (Optimistic check)
        # 만약 fetch 결과가 404/Empty라면 브랜치를 바꿔서 다시 시도해야 함.
        # 하지만 gather로 병렬 요청 중이라, 여기서 사전 체크를 하나만 먼저 수행하거나,
        # 그냥 안전하게 get_default_branch를 먼저 호출하여 branch를 갱신하는 것이 나음 (속도 vs 정확성).
        # 여기서는 "실패 시 재시도" 전략 대신, "docs_generator"는 이미 검증된 branch를 받는다고 가정하되,
        # 혹시 모르니 README 조회로 브랜치 생사 확인을 먼저 함.
        
        # (간소화) README를 먼저 찔러보고 실패하면 브랜치 변경
        readme_check = await self.gh.analyze_readme(repo_name, branch)
        if readme_check == "No README found.":
            real_default = await self.gh.get_default_branch(repo_name)
            if real_default != branch:
                self._force_print("BRANCH CORRECTION", f"Retrying content gen with: {real_default}")
                branch = real_default

        # 다시 Task 구성 (Updated Branch)
        target_file_task = self.gh.fetch_raw_content(repo_name, safe_doc_path, branch)
        unique_refs = [f for f in reference_files if f != safe_doc_path]
        ref_tasks = [self.gh.fetch_raw_content(repo_name, f, branch) for f in unique_refs]
        
        readme_task = self.gh.analyze_readme(repo_name, branch)
        tech_task = self.gh.analyze_tech_stack(repo_name, branch)
        
        results = await asyncio.gather(readme_task, tech_task, target_file_task, *ref_tasks)
        
        readme_content = results[0]
        tech_stack = results[1]
        raw_target_content = results[2] or "" # None 방지
        ref_contents = results[3:]
        
        # 2. Parse & Context Processing
        fm_data, body_content = self._parse_front_matter(raw_target_content)
        
        final_title = doc_title or fm_data.get('title')
        if not final_title:
            base = os.path.basename(safe_doc_path).rsplit('.', 1)[0]
            final_title = base.replace("-", " ").replace("_", " ").title()
            
        user_instruction = user_prompt if user_prompt else doc_context
        if not user_instruction:
            user_instruction = "Analyze this code deeply and create a structured Wiki documentation."

        # 3. [PROMPT ENGINEERING]
        
        # (1) 파일 유형별 분석 가이드
        analysis_guideline = """
        [ANALYSIS STRATEGY]
        Analyze the [REFERENCE SOURCES] based on their file types:
        1. **Router/Urls**: Create a Markdown TABLE of `[Route Path]`, `[HTTP Method]`, `[Handler Function]`, `[Purpose]`.
        2. **API/Views/Controllers**: Create a TABLE of `[Endpoint]`, `[Input Params]`, `[Response Model]`, `[Logic Summary]`.
        3. **Models/Schemas**: Create a TABLE of `[Field Name]`, `[Type]`, `[Constraints]`, `[Description]`.
        4. **Business Logic/Services**: Analyze the core logic flow and describe it in a structured list or text steps.
        """

        # (2) Just-the-Docs 스타일 가이드 (상세 버전 + Mermaid Fix + Table Fix)
        style_guide = """
        [STYLE RULES - Just the Docs]
        1. **Language**: **KOREAN (한국어)**. Use a professional, technical tone (e.g., "제공합니다", "구현되어 있습니다").
        2. **Badges**: Use labels for status/type. Syntax: `{: .label .label-blue }`
        3. **No Mermaid**: Do NOT generate Mermaid diagrams. Use text descriptions instead.
        4. **Tables (CRITICAL - STRICT COMPLIANCE REQUIRED)**:
           - **Rule 1**: You MUST insert an **Empty Line** before and after the table.
           - **Rule 2**: You MUST include the **Alignment Row** (second row) with hyphens and colons (e.g., `|:---|---:|`).
           - **Rule 3**: Do NOT indent the table. Keep it at the start of the line.
           - **Example (CORRECT)**:
             
             | Name | Type | Description |
             |:-----|:-----|:------------|
             | id   | int  | Primary Key |
             
        5. **No Front Matter**: Do NOT include YAML front matter (--- ... ---) at the beginning. Start with the Title (# Title).
        6. **No Chat**: Do NOT output conversational fillers like "Here is the document" or "How can I help next?". Output ONLY the documentation content.
        """

        # (3) 문서 구조 템플릿
        structure_template = f"""
        [Output Structure]
        ---
        title: {final_title}
        description: Generated by Eggit AI
        layout: default
        ---
        
        # {final_title}
        
        ## 1. 개요 (Overview)
        (Summarize the role of this module. Use badges for status or tech.)
        

[Image of software architecture diagram]


        ## 2. 아키텍처 및 로직 (Architecture & Logic)
        (Explain the internal flow and relationships between components systematically using the reference code.)
        
        ## 3. 핵심 컴포넌트 분석 (Key Components)
        (Detailed analysis. **Use Markdown TABLES here**.)
        
        ### 3.1 주요 함수/클래스
        - **설명**: ...
        - **상세 명세 (테이블)**:
          | 파라미터 | 타입 | 설명 |
          |:--------|:-----|:-----|
          | ...     | ...  | ...  |
        
        ## 4. 사용 예시 (Usage)
        (Code snippets or API examples.)
        
        ## 5. 설정 (Configuration)
        - **환경 변수**: (Markdown Table with `|:---|` alignment)
        """

        # (4) 시스템 프롬프트 조립
        system_prompt = f"""
        You are a **Principal Software Architect** and **Technical Writer**.
        
        **YOUR MISSION**:
        1. **Strict Data-Driven Documentation**: Use the **[REFERENCE SOURCES]** (Project Data Code) as the absolute source of truth.
        2. **Deep Analysis**: Analyze the code structure, logic, and data flow deeply from the provided reference files.
        3. **Rich Output**: Create a detailed document with **Tables** (must have alignment row).
        4. **Language**: Output strictly in **KOREAN (한국어)**.
        5. **No Chatbot Persona**: Do not output any conversational text. Just the document.
        
        {analysis_guideline}
        {style_guide}
        {structure_template}
        """
        
        # (5) 유저 컨텍스트 조립
        draft_hint = doc_context if doc_context else raw_target_content
        current_draft_context = f"""
        ### 📌 [CURRENT DRAFT INFO] (Title: {final_title})
        (Use this only to understand the topic. Do NOT just repeat this.)
        ```markdown
        {draft_hint[:3000]} 
        ```
        """

        ref_context_str = ""
        for path, code in zip(unique_refs, ref_contents):
            safe_code = code or ""
            # 소스 코드는 분석의 핵심이므로 최대한 많이(30000자) 입력
            snippet = safe_code[:30000] + ("\n...(truncated)" if len(safe_code) > 30000 else "")
            ref_context_str += f"\n### 🔗 [REFERENCE SOURCE] {path}\n```\n{snippet}\n```\n"

        user_input_context = f"""
        [Task Metadata]
        - **Target File**: {safe_doc_path}
        - **User Request**: "{user_instruction}"
        
        [Project Context]
        - **Tech Stack**: {tech_stack}
        
        {current_draft_context}
        
        [REFERENCE SOURCES - ANALYZE DEEPLY]
        {ref_context_str}
        
        [Final Instruction]
        Synthesize the **[REFERENCE SOURCES]** into a structured Wiki page titled **"{final_title}"**.
        **Strictly follow the Table and Mermaid syntax rules.**
        **Output in KOREAN.**
        """
        
        # ------------------------------------------------------------------
        # [NUCLEAR DEBUGGING]
        # ------------------------------------------------------------------
        
        self._force_print("GENERATOR INPUTS", f"Ref Files: {len(unique_refs)}")

        try:
            with open("last_ai_prompt_debug.txt", "w", encoding="utf-8") as f:
                f.write(f"=== SYSTEM PROMPT ===\n{system_prompt}\n\n{'='*50}\n\n=== USER CONTEXT ===\n{user_input_context}")
            self._force_print("DEBUG FILE", f"Saved full prompt to: {os.path.abspath('last_ai_prompt_debug.txt')}")
        except Exception as e:
            self._force_print("DEBUG FILE ERROR", str(e))

        logger.info("[DocsAI] 🧠 Sending request to Writer LLM...")
        result_md = await self.ai_generator.generate_content(system_prompt, user_input_context)
        
        self._force_print("COMPLETE", f"Generated Length: {len(result_md)}")
        return result_md
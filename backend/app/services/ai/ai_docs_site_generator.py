import logging
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import settings
from langchain_core.output_parsers import StrOutputParser
from app.schemas.ai_docs import DocStructureResponse

logger = logging.getLogger(__name__)

class AiDocsBlogGenerator:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o", # gpt-4o 필수 (추론 능력 중요)
            api_key=settings.OPENAI_API_KEY,
            temperature=0.3, # 창의성을 약간 높여서 다양한 구조 제안 유도
        )
        # 출력 형식이 깨지는 것만 막기 위해 Pydantic은 유지
        self.structured_llm = self.llm.with_structured_output(DocStructureResponse)

    async def generate_structure(self, context: dict) -> dict:
        """
        Repo Context -> AI Reasoning -> Best Docs Structure
        """
        
        # [Freedom Prompt] AI에게 구조 설계의 전권을 위임
        system_prompt = """
        You are an expert Chief Technical Writer and Software Architect.
        Your task is to analyze a GitHub project and architect the **perfect documentation site structure** for it.

        [Your Goal]
        Don't just mirror the file tree. That is useless.
        Instead, understand the **intent and nature** of the project (e.g., is it a Web Service? A Library? A Boilerplate? A CLI Tool?) and design a documentation structure that best serves the user (developers).

        [Design Strategy]
        1. **Analyze:** Look at the Tech Stack, README, and File Tree to understand what the project does.
        2. **Architect:** Decide on the best categories. 
           - If it's a Service: Focus on 'Architecture', 'Deployment', 'API'.
           - If it's a Library: Focus on 'Getting Started', 'Usage Guide', 'Reference'.
           - If it's complex: Create 'Deep Dive' or 'Core Concepts' sections.
        3. **Abstract:** You are allowed to create logical folders (categories) that do not exist in the actual file tree if they help organize the documentation (e.g., 'Concepts', 'Tutorials').
        4. **Map:** Assign relevant files/topics to these categories. You can rename files to be more descriptive titles.

        [Output Constraints]
        - The output must be a valid JSON object matching the schema.
        - `is_directory`: Set to true for categories/folders.
        - `nav_order`: Organize the flow logically (Start -> Learn -> Deep Dive -> Deploy).
        """

        human_prompt = """
        [Project Context]
        - Repository: {repo_name}
        - Tech Stack: {tech_stack}

        [README Summary]
        {readme_summary}

        [File Tree (Raw Data)]
        {file_tree}

        Based on the above, design the best documentation structure for this specific project.
        """

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", human_prompt),
        ])

        # LangChain Chain 구성
        chain = prompt | self.structured_llm

        try:
            # invoke 호출
            result: DocStructureResponse = await chain.ainvoke({
                "repo_name": context.get("repo_name", "Unknown Repo"),
                "tech_stack": context.get("tech_stack", "Not detected"),
                "readme_summary": context.get("readme_summary", "No README"),
                "file_tree": context.get("project_structure", "") 
            })
            
            # Pydantic 모델을 Dict로 변환
            return result.model_dump()

        except Exception as e:
            logger.error(f"❌ AI Analysis Failed: {e}")
            return {
                "error": str(e),
                "root_structure": [],
                "architecture_summary": "Analysis failed due to an internal error."
            }
        
    # =================================================================
    # [Method 2] Docs 내용 생성 (New) - Docs Copilot용
    # =================================================================
    async def generate_content(self, system_prompt: str, user_input: str) -> str:
        """
        System Prompt + User Input -> Markdown Content
        """
        prompt = ChatPromptTemplate.from_messages([
            ("system", "{system_prompt}"),
            ("human", "{user_input}"),
        ])

        # StrOutputParser를 사용하여 순수 문자열(Markdown)만 반환받음
        chain = prompt | self.llm | StrOutputParser()

        try:
            result = await chain.ainvoke({
                "system_prompt": system_prompt,
                "user_input": user_input
            })
            return result
        except Exception as e:
            logger.error(f"❌ AI Content Generation Failed: {e}")
            return f"Error generating content: {str(e)}"
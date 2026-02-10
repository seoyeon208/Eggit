import logging
import json
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import settings

# [Working Pattern] Pydantic 모델 및 빌더 (기존 호환성 유지)
from app.schemas.blog import GeneratedContentResponse
from app.services.github.github_context_builder import GithubContextBuilder

logger = logging.getLogger(__name__)

class AiPostingService:
    """
    [AiPostingService]
    - LangChain Structured Output 패턴 적용
    - 역할 변경: "대필" -> "글쓰기 가이드라인 & 리소스 제공"
    """

    def __init__(self, token: str):
        self.token = token
        
        # 1. LLM 초기화
        self.llm = ChatOpenAI(
            model=settings.OPENAI_MODEL_NAME, 
            api_key=settings.OPENAI_API_KEY,
            temperature=0.7,
            max_tokens=15000
        )
        
        # 2. Structured Output 설정 (Pydantic 강제 - 호환성 유지)
        self.structured_llm = self.llm.with_structured_output(GeneratedContentResponse)

    async def generate_post(self, req: dict) -> GeneratedContentResponse:
        repo_name = req['source_repo']
        period = req['period_days']
        template_type = req['template_type']
        user_prompt = req.get('user_prompt', '')
        selected_category = req.get('selected_category', 'General')

        logger.info(f"🚀 [AiPosting] Starting generation for {repo_name} (Period: {period} days)")

        # ---------------------------------------------------------
        # 1. GitHub 데이터 수집 (기존 로직 유지)
        # ---------------------------------------------------------
        builder = GithubContextBuilder(self.token, repo_name)
        context = await (
            builder
            .set_period(period)
            .with_diffs()
            .with_features()
            .with_tech_stack()
            .build()
        )
        
        if 'repo_name' not in context:
            context['repo_name'] = repo_name

        # ---------------------------------------------------------
        # 2. 데이터 전처리 및 크기 제한 (Truncation Logic - 기존 유지)
        # ---------------------------------------------------------
        
        tech_stack_raw = context.get('tech_stack', [])
        if isinstance(tech_stack_raw, list):
            tech_stack = ', '.join(tech_stack_raw)
        else:
            tech_stack = str(tech_stack_raw)

        detailed_changes = context.get('detailed_changes', 'No changes')
        feature_summary = context.get('feature_summary', 'No summary')
        
        if isinstance(detailed_changes, (set, list)):
            detailed_changes = '\n'.join(str(item) for item in detailed_changes)
        else:
            detailed_changes = str(detailed_changes)
            
        if isinstance(feature_summary, (set, list)):
            feature_summary = '\n'.join(str(item) for item in feature_summary)
        else:
            feature_summary = str(feature_summary)

        # 토큰 제한 방지 (Safety Truncation)
        MAX_CHANGES_LENGTH = 10000
        MAX_SUMMARY_LENGTH = 5000
        
        if len(detailed_changes) > MAX_CHANGES_LENGTH:
            detailed_changes = detailed_changes[:MAX_CHANGES_LENGTH] + "\n\n...(Truncated)"
        
        if len(feature_summary) > MAX_SUMMARY_LENGTH:
            feature_summary = feature_summary[:MAX_SUMMARY_LENGTH] + "\n\n...(Truncated)"

        # ---------------------------------------------------------
        # 3. 프롬프트 구성 (요구사항 반영 수정)
        # ---------------------------------------------------------
        system_prompt_text = self._get_system_prompt_text(template_type)
        
        human_template = """
        [Context Data]
        - Repository: {repo_name}
        - Tech Stack: {tech_stack}
        - Category: {category}
        
        [Recent Code Changes (Diffs)]:
        {detailed_changes}
        
        [Project Structure]:
        {feature_summary}
        
        [User Request]:
        "{user_prompt}"
        
        ---
        [Task Instructions]
        Based on the code changes above, generate a response adhering to the following 4 rules:

        1. **Markdown Template (Guidelines)**: 
           - Do NOT write the full blog post content. 
           - Provide a **Markdown Skeleton/Template**.
           - Use blockquotes (`>`) or comments to guide the user on *what* to write in each section (e.g., "> Explain why you chose this pattern here...").
           - Create a structure that makes it easy for the user to fill in the blanks.

        2. **Topic Recommendation**: 
           - Recommend exactly **3 distinct topics** suitable for a daily dev-log based on the diffs.
           - Explain *why* each topic is relevant.

        3. **Key Concepts**: 
           - Provide detailed **conceptual and theoretical explanations** for the technologies or patterns used in the recommended topics.
           - Explain the *principle* (How it works), not just the usage.

        4. **Code Examples**: 
           - Provide **foundational/basic example code** relevant to the topics.
           - Do not just copy the project code. Provide "Boilerplate" or "Hello World" style examples that help understand the core concept.
        
        Output MUST be in **Korean (한국어)**.
        """

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt_text),
            ("human", human_template),
        ])

        # ---------------------------------------------------------
        # 4. Chain 실행 (기존 유지)
        # ---------------------------------------------------------
        chain = prompt | self.structured_llm

        try:
            invoke_params = {
                "repo_name": context.get('repo_name'),
                "tech_stack": tech_stack,
                "category": selected_category,
                "detailed_changes": detailed_changes,
                "feature_summary": feature_summary,
                "user_prompt": user_prompt
            }
            
            result: GeneratedContentResponse = await chain.ainvoke(invoke_params)
            
            logger.info(f"✅ AI Generation Success: {len(result.markdown_template)} chars")
            return result

        except Exception as e:
            logger.error(f"❌ AI Generation Failed: {e}")
            return GeneratedContentResponse(
                recommended_topics=[{"title": "Error", "reason": "Generation failed"}],
                key_concepts=[],
                code_examples=[],
                markdown_template=f"# 생성 실패\n\n오류가 발생했습니다: {str(e)}"
            )

    def _get_system_prompt_text(self, template_type: str) -> str:
        """
        [Prompt Engineering]
        사용자가 '직접' 글을 쓸 수 있도록 돕는 'Technical Writing Mentor' 페르소나 설정
        """
        role_def = "You are a skilled Technical Writing Mentor and Developer Advocate."
        
        common_guide = """
        Your goal is NOT to write the blog post for the user. 
        Your goal is to provide a **structural foundation (Skeleton)** and **learning materials** so the user can easily write their own insightful post.
        
        For the `markdown_template` field:
        - Create headers, sub-headers, and lists.
        - Instead of full paragraphs, leave **Instructions** like:
          > "Describe the authentication error you faced here."
          > "Explain the difference between JWT and Session based on the concept section."
        """

        if template_type == "tech_blog":
            style_guide = """
            [Template Style]: DevLog / TIL (Today I Learned).
            - Structure: Problem -> Exploration -> Solution -> Insight.
            - Encourage the user to share their personal thought process.
            """
        elif template_type == "docs":
            style_guide = """
            [Template Style]: Technical Documentation / Tutorial.
            - Structure: Overview -> Prerequisites -> Step-by-Step Implementation -> Conclusion.
            - Focus on clarity and accuracy.
            """
        else:
            style_guide = ""

        return f"""
        {role_def}
        {common_guide}
        {style_guide}
        
        The output must be structured according to the schema.
        All explanations must be in **Korean**.
        """
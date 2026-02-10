import json
import asyncio
import re
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from app.core.config import settings
from app.services.github.github_client import GithubClient

class GiftGeneratorService:
    def __init__(self, token: str):
        self.gh = GithubClient(token)
        self.llm = ChatOpenAI(
            model="gpt-5-nano", 
            api_key=settings.OPENAI_API_KEY,
            temperature=0.7
        )

    async def generate_daily_gift(self, username: str, tech_stack: str) -> dict:
        """
        유저의 최근 활동을 분석하여 블로그 주제와 퀴즈를 생성 (한국어 + 친근한 말투)
        """
        # 1. 최근 활동 내역 조회
        activity_summary = await self.gh.get_recent_activity_summary(username, days=2)
        
        # [DEBUG] 입력 확인
        print(f"\n========== [AI INPUT DEBUG] ==========")
        print(f"User: {username}, Stack: {tech_stack}")
        print(f"Summary Length: {len(activity_summary)}")
        print(f"======================================\n")

        # 2. 프롬프트 구성
        system_prompt = (
            "You are a personalized AI mentor for developers. "
            "You must respond in **Korean (한국어)** only. "
            "Your tone should be encouraging and specific based on the user's code."
        )
        
        # [PROMPT UPGRADE] outline 시작 문구 패턴 지정
        human_prompt = f"""
        [User Context]
        Tech Stack: {tech_stack}
        
        [Recent Activity Summary]
        {activity_summary}

        [Goal]
        Based on the code changes and commit messages above, generate a 'Daily Gift' in **Korean**.
        
        [Requirement 1: Blog Topic]
        - Recommend a blog post title and outline in **Korean**.
        - **CRITICAL**: The 'outline' MUST start with a friendly sentence explicitly mentioning what the user recently worked on.
        - **Pattern (if commits exist)**: "최근에 [Specific File/Logic in commit] 관련 작업을 하셨군요! 이와 관련된 [Concept]에 대해 정리해보는 건 어떨까요?"
        - **Pattern (if no commits)**: "최근 커밋 내역이 없지만, [Tech Stack]을 주로 다루시네요! [Topic]에 대해 써보는 건 어떨까요?"
        - The rest of the outline should provide brief bullet points on how to structure the post.

        [Requirement 2: Daily Quiz]
        - Create a multiple-choice question (4 options) in **Korean**.
        - It must be related to the user's Tech Stack or recent code changes.
        - The explanation must also be in **Korean**.
        - **IMPORTANT**: The correct answer MUST be randomly placed among the 4 options. Do NOT always put the correct answer at index 0.
        - **CRITICAL - Options Format**:
          * Each option MUST be plain text WITHOUT any prefix like "A.", "B.", "1.", "2.", etc.
          * DO NOT include letters, numbers, or symbols before the option text
          * ❌ WRONG: "A. FastAPI는 비동기 프레임워크입니다"
          * ❌ WRONG: "1. FastAPI는 비동기 프레임워크입니다"
          * ✅ CORRECT: "FastAPI는 비동기 프레임워크입니다"
          * ✅ CORRECT: "Django는 MTV 패턴을 사용합니다"

        [Output Format]
        Return ONLY valid JSON with these exact keys:
        {{{{
            "blog_item": {{{{ 
                "title": "블로그 제목 (한글)", 
                "outline": "최근에 ~~ 작업을 하셨군요! ... (이후 개요 내용)" 
            }}}},
            "quiz_item": {{{{ 
                "question": "퀴즈 질문 (한글)...", 
                "options": [
                    "첫 번째 선택지 텍스트만",
                    "두 번째 선택지 텍스트만",
                    "세 번째 선택지 텍스트만",
                    "네 번째 선택지 텍스트만"
                ], 
                "answer_idx": 2, 
                "explanation": "정답 해설 (한글)..." 
            }}}}
        }}}}
        
        **REMINDER**: 
        1. Options array must contain ONLY the option text itself, with NO prefixes.
        2. "answer_idx" must be the integer index (0-3) of the correct option, and it should be random.
        """

        # 3. LLM 호출
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", human_prompt),
        ])
        
        chain = prompt | self.llm | JsonOutputParser()
        
        try:
            print("⏳ [AI] Generating content (Korean Contextual)...")
            result = await chain.ainvoke({})
            
            # [POST-PROCESSING] 선택지에서 A., B., C., D. 또는 1., 2., 3., 4. 제거
            if "quiz_item" in result and "options" in result["quiz_item"]:
                cleaned_options = []
                for opt in result["quiz_item"]["options"]:
                    # "A. ", "B. ", "1. ", "2. " 등의 패턴 제거
                    # 패턴: 문자열 시작 부분에 (대문자 + .) 또는 (숫자 + .) 또는 (대문자 + )) 등
                    cleaned = re.sub(r'^[A-Z]\.?\s*', '', opt.strip())  # A. 또는 A 형태
                    cleaned = re.sub(r'^[0-9]\.?\s*', '', cleaned)      # 1. 또는 1 형태
                    cleaned = re.sub(r'^\([A-Z]\)\s*', '', cleaned)     # (A) 형태
                    cleaned = re.sub(r'^\([0-9]\)\s*', '', cleaned)     # (1) 형태
                    cleaned_options.append(cleaned.strip())
                
                result["quiz_item"]["options"] = cleaned_options
                print(f"✂️ [POST-PROCESS] Cleaned option prefixes")
            
            # [DEBUG] 결과 확인
            print(f"\n========== [AI OUTPUT DEBUG] ==========")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            print(f"=======================================\n")
            
            return result
            
        except Exception as e:
            print(f"❌ Gift Generation Failed: {e}")
            return {
                "blog_item": {"title": "오늘의 개발 회고", "outline": "최근 커밋 내역을 불러오지 못했지만, 오늘 배운 점을 기록해보는 건 어떨까요? 에러 해결 과정이나 새로 알게 된 개념을 정리해보세요."},
                "quiz_item": {
                    "question": "Git에서 변경사항을 스테이징 영역에 추가하는 명령어는?",
                    "options": ["git push", "git commit", "git add", "git pull"],
                    "answer_idx": 2,
                    "explanation": "git add 명령어를 사용하여 변경사항을 스테이징합니다."
                }
            }
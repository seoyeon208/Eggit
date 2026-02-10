from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional, List, Literal, Union, Dict, Any
import re
from datetime import datetime

# =================================================================
# [공통 응답 스키마]
# =================================================================
class BlogDeployResponse(BaseModel):
    task_id: str = Field(..., description="Celery 비동기 작업 ID")
    status: str = Field(..., description="현재 상태")
    message: str = Field(..., description="응답 메시지")
    result_url: Optional[str] = Field(None, description="배포될 URL")

class AsyncTaskResponse(BaseModel):
    task_id: str = Field(..., description="Celery Task ID")
    status: str = Field(..., description="작업 상태")
    message: str = Field(..., description="안내 메시지")

# =================================================================
# [테마 설정 모델]
# =================================================================
class BaseThemeSettings(BaseModel):
    font_import_url: Optional[str] = Field(None)
    font_family_base: Optional[str] = Field(None)

    @field_validator('*')
    @classmethod
    def validate_hex_color(cls, v, info):
        if isinstance(v, str) and v.startswith("#"):
            if not re.match(r"^#(?:[0-9a-fA-F]{3}){1,2}$", v):
                raise ValueError(f'{info.field_name}은(는) #RRGGBB 형식이어야 합니다.')
        return v

class ChirpyThemeSettings(BaseThemeSettings):
    main_bg: str = Field("#f0f8ff")
    sidebar_bg: str = Field("#2c3e50")
    sidebar_text: str = Field("#ffffff")
    active_color: str = Field("#00cd1b")
    card_bg: str = Field("#ffffff")

class DocsThemeSettings(BaseThemeSettings):
    sidebar_bg: str = Field("#f5f6fa")
    main_bg: str = Field("#ffffff")
    link_color: str = Field("#7253ed")

# =================================================================
# [블로그 생성 요청 DTO]
class BlogCreateMain(BaseModel):
    blog_title: str = Field(..., min_length=2, max_length=50)
    blog_tagline: Optional[str] = Field("My Tech Blog")
    description: Optional[str] = Field("A technical blog")
    author_name: Optional[str] = Field(None)
    author_email: Optional[EmailStr] = Field(None)
    theme_settings: Optional[ChirpyThemeSettings] = Field(default_factory=ChirpyThemeSettings)
    is_force: bool = Field(False, description="이미 존재할 경우 삭제 후 재생성 여부")
    avatar_url: Optional[str] = Field(None, description="커스텀 아바타 URL (미입력 시 GitHub 프로필 사용)")

class BlogCreateDocs(BaseModel):
    target_repo: str = Field(..., pattern=r"^[\w-]+/[\w.-]+$")
    project_name: str = Field(..., min_length=2)
    description: Optional[str] = Field(None)
    theme_settings: Optional[DocsThemeSettings] = Field(default_factory=DocsThemeSettings)
    is_force: bool = Field(False, description="이미 존재할 경우 삭제 후 재생성 여부")
    
    @field_validator('target_repo')
    @classmethod
    def validate_repo_format(cls, v):
        if '/' not in v:
            raise ValueError('username/repo-name 형식이어야 합니다.')
        return v

# =================================================================
# [블로그 관리 및 탐색]
# =================================================================
class BlogRepoInfo(BaseModel):
    repo_name: str
    blog_title: str
    default_branch: str = "main"
    theme_type: Literal["chirpy", "docs", "unknown"]

class BlogPostItem(BaseModel):
    path: str
    title: str
    category: str = "Uncategorized"
    date: Optional[str] = None
    sha: str
    nav_order: Optional[int] = None # [New] 정렬 및 디버깅용
    is_index: bool = False # [New] 카테고리를 대표하는 index.md 파일인지 여부

class BlogStructureResponse(BaseModel):
    categories: List[str] = Field(default_factory=list)
    posts: List[BlogPostItem] = Field(default_factory=list)

class PostContentResponse(BaseModel):
    content: str
    sha: str

class ReorderRequest(BaseModel):
    repo_name: str
    branch: str = "main"
    # 순서가 변경된 파일들의 경로 리스트 (위에서부터 1, 2, 3... 순서로 적용됨)
    ordered_paths: List[str]

# =================================================================
# [AI 포스팅 생성]
# =================================================================

class GenerateContentRequest(BaseModel):
    # --- 공통 필드 ---
    # 프론트엔드 호환성을 위해 alias나 optional 처리
    source_repo: Optional[str] = None 
    repo_name: Optional[str] = None # Docs 모드에서 주로 사용
    
    blog_repo: Optional[str] = None
    user_prompt: Optional[str] = ""
    template_type: str = "tech_blog" # tech_blog | docs_copilot | docs_recommend
    type: Optional[str] = None       # 프론트엔드에서 type으로 보낼 경우 대비

    # --- Tech Blog 전용 ---
    period_days: Optional[int] = 3
    selected_category: Optional[str] = "General"

    # --- Docs Copilot / Recommend 전용 ---
    branch: Optional[str] = "main"
    doc_path: Optional[str] = None
    doc_title: Optional[str] = None     # 추천 기능용
    doc_context: Optional[str] = None   # 추천 기능용
    reference_files: Optional[List[str]] = []

    class Config:
        extra = "ignore" # 정의되지 않은 필드가 와도 에러 내지 않음

# AI 하위 모델 정의
class TopicItem(BaseModel):
    title: str = Field(..., description="추천 제목")
    reason: str = Field(..., description="추천 이유")

class ConceptItem(BaseModel):
    name: str = Field(..., description="개념 명")
    description: str = Field(..., description="개념 설명")

class CodeExampleItem(BaseModel):
    title: str = Field(..., description="코드 제목")
    code: str = Field(..., description="코드 내용")
    description: str = Field(..., description="코드 설명")

# AI 생성 결과 응답
class GeneratedContentResponse(BaseModel):
    recommended_topics: List[TopicItem] = Field(..., description="추천 제목 리스트")
    key_concepts: List[ConceptItem] = Field(..., description="핵심 개념 리스트")
    code_examples: List[CodeExampleItem] = Field(..., description="코드 예제 리스트")
    markdown_template: str = Field(..., description="초안 마크다운 본문")


# --- DTO (Data Transfer Objects) ---
class SourceRecommendRequest(BaseModel):
    repo_name: str
    branch: str
    doc_path: Optional[str] = None # 기존 파일이 없으면 None일 수 있음 (Create 모드)
    doc_title: str  # [New] AI 분석의 핵심 키워드
    doc_context: Optional[str] = "" # [New] 사용자가 작성 중인 내용이나 프롬프트

class ContentGenerateRequest(BaseModel):
    repo_name: str
    branch: str
    doc_path: str
    reference_files: List[str]  # 사용자가 선택한 파일 경로들
    user_prompt: Optional[str] = ""
# =================================================================
# [최종 포스팅 업로드 (Final Post Upload)]
# =================================================================

class PostOptions(BaseModel):
    """Chirpy/Docs 기능 온/오프 옵션"""
    math: bool = False
    mermaid: bool = False
    pin: bool = False
    # [추가] Just the Docs 전용 옵션 (nav_order 등)
    nav_order: Optional[Union[str, int]] = None 

class PostImage(BaseModel):
    """Chirpy 이미지 포맷 지원"""
    path: str
    alt: Optional[str] = None
    lqip: Optional[str] = None # Base64 미리보기 이미지

class FinalPostRequest(BaseModel):
    """
    사용자가 작성 완료한 포스트를 GitHub에 업로드하기 위한 요청 모델
    """
    # --- 필수 기본 정보 ---
    mode: Literal["create", "update"]
    blog_repo: str
    branch: str = "main"
    theme_type: Literal["tech_blog", "chirpy", "docs", "unknown"] 
    
    title: str
    category: str # "Main/Sub" 형태 또는 Docs의 "Parent"
    markdown_content: str
    
    # --- Chirpy/Docs 확장 필드 (Optional) ---
    tags: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    image: Optional[PostImage] = None 
    options: PostOptions = Field(default_factory=PostOptions)
    
    author: Optional[str] = None # 작성자명 (필요 시)

    # --- Update 모드 전용 ---
    file_path: Optional[str] = None # 기존 파일 경로 (파일명 변경 방지용)
    original_sha: Optional[str] = None # GitHub 충돌 방지용
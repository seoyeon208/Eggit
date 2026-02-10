from __future__ import annotations # 재귀 참조를 위해 필수
from pydantic import BaseModel, Field
from typing import List, Optional

class DocNode(BaseModel):
    """
    파일 또는 폴더 하나를 나타내는 노드
    """
    title: str = Field(..., description="메뉴에 표시될 짧고 간결한 제목 (예: 'User Guide')")
    description: str = Field(..., description="해당 폴더/파일에 대한 한 줄 요약 (목차 페이지용)")
    nav_order: int = Field(..., description="Just the Docs의 nav_order 값 (순서)")
    is_directory: bool = Field(False, description="폴더(카테고리) 여부")
    
    # 재귀적 구조: 폴더일 경우 자식 노드들을 가짐
    children: List[DocNode] = Field(default_factory=list, description="하위 파일 또는 폴더 목록")

class DocStructureResponse(BaseModel):
    """
    AI로부터 받을 최종 응답 구조
    """
    root_structure: List[DocNode] = Field(..., description="최상위 카테고리 목록")
    architecture_summary: str = Field(..., description="AI가 분석한 프로젝트 아키텍처 요약")
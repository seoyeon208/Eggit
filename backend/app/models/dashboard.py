from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, JSON, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base # 또는 app.db.base_class import Base (프로젝트 구조에 맞게)

class BlogPost(Base):
    """
    [Eggit 서비스 활동 로그 및 대시보드용 모델]
    """
    __tablename__ = "blog_posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # 1. 캘린더 표시 정보
    title = Column(String(255), index=True, nullable=False)
    category = Column(String(100), nullable=True)
    
    # 2. 블로그 위치 및 타입 정보 (분기 핵심)
    # Chirpy: "bmc00-05.github.io"
    # Docs: "bmc00-05/project-name"
    repository_name = Column(String(255), nullable=False, index=True)
    
    # "chirpy" | "docs"
    theme_type = Column(String(50), nullable=False) 
    
    # 3. 이동 링크 정보
    # 실제 배포된 글의 최종 URL (예: https://bmc00-05.github.io/posts/title)
    post_url = Column(Text, nullable=False)

    # 4. 시간 정보
    created_at = Column(DateTime, server_default=func.now(), index=True)

    # 관계 설정
    user = relationship("User", back_populates="posts")

    @property
    def location_type_label(self):
        """UI 표시용: 메인 블로그인지 서브 레포 사이트인지 반환"""
        if self.theme_type == "chirpy":
            return "Main Blog"
        return "Project Docs"

    @property
    def repo_simple_name(self):
        """UI 표시용: 레포지토리 이름만 추출 (bmc00-05/egg-project -> egg-project)"""
        return self.repository_name.split("/")[-1]


class UserDashboard(Base):
    """
    [통합 대시보드 테이블]
    """
    __tablename__ = "user_dashboards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # -------------------------------------------------------
    # 1. 블로그 방문자 통계
    # -------------------------------------------------------
    # help_text -> comment 로 변경
    total_visitors = Column(Integer, default=0, comment="블로그 누적 순방문자 수(UV)")
    today_visitors = Column(Integer, default=0, comment="오늘 방문자 수 (자정 초기화 필요, 선택사항)")

    # -------------------------------------------------------
    # 2. GitHub 통계
    # -------------------------------------------------------
    # help_text -> comment 로 변경
    tech_stack = Column(JSON, default=list, comment="주 사용 언어 및 기술 스택")
    
    github_stats = Column(JSON, default=dict, comment="커밋 수, 스타 수 등 깃허브 활동 데이터")
    
    last_github_updated_at = Column(DateTime, nullable=True, comment="깃허브 데이터 마지막 갱신 시점")
    # 관계 설정
    user = relationship("User", back_populates="dashboard")


class BlogVisitLog(Base):
    """
    [방문자 로그 테이블]
    """
    __tablename__ = "blog_visit_logs"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    
    # 방문자 식별자
    visitor_ip_hash = Column(String(64), nullable=False)
    
    # 방문 날짜
    visit_date = Column(Date, default=func.current_date(), nullable=False)
    
    # 생성 시간
    created_at = Column(DateTime, server_default=func.now())

    # [핵심] 중복 저장 방지
    __table_args__ = (
        UniqueConstraint('owner_id', 'visitor_ip_hash', 'visit_date', name='unique_daily_visit_log'),
    )
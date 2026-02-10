# 🥚 Eggit (에깃)

> **GitHub 활동 기반 개발 기록 자동화 및 게이미피케이션 블로그 플랫폼**  
> GitHub 커밋 데이터를 활용한 AI 기반 자동 문서화와 성장형 아바타 시스템을 통해 개발자의 지속적인 기록 습관을 만들어가는 서비스입니다.

<br />

## 📋 목차
- [서비스 개요](#-서비스-개요)
- [주요 기능](#-주요-기능)
- [서비스 화면](#-서비스-화면)
- [기술 차별점](#-기술-차별점)
- [확장 가능성](#-확장-가능성)
- [기술스택](#-기술스택)
- [시스템 아키텍처](#-시스템-아키텍처)
- [프로젝트 구조](#-프로젝트-구조)
- [개발 환경 설정](#-개발-환경-설정)

<br />

---

<br />

## 🎯 서비스 개요

### 서비스 정의
**Eggit**은 GitHub 활동 데이터를 기반으로 개발자의 기술 블로그와 프로젝트 문서를 자동으로 생성·배포하는 웹 서비스입니다.  
생성형 AI를 활용하여 커밋 로그를 분석하고, 사용자에게 최적화된 블로그 포스트 작성 아이디어를 제공합니다.

### 서비스 목적
1. **데이터 가시화**: GitHub 활동 내역을 자동 수집·분석하여 웹 콘텐츠로 시각화
2. **진입 장벽 완화**: Jekyll/Hugo 등 복잡한 환경 설정 없이 GitHub Pages 블로그를 원클릭으로 생성
3. **지속성 부여**: 게이미피케이션 요소(아바타, 퀘스트, 레벨업)를 통해 개발 기록 습관 형성

### 핵심 가치
- ✅ **자동화**: GitHub 연동만으로 블로그 인프라 자동 구축
- ✅ **AI 지원**: LangChain + OpenAI 기반 커밋 분석 및 문서 초안 생성
- ✅ **게이미피케이션**: 활동 기반 경험치 획득 및 아바타 성장 시스템
- ✅ **소셜 네트워크**: 친구 시스템, 실시간 채팅, 방명록 기능

<br />

---

<br />

## ✨ 주요 기능

### 1️⃣ GitHub OAuth 연동 및 자동 블로그 배포
- **GitHub 계정 인증**: OAuth 2.0 기반 안전한 로그인
- **자동 블로그 생성**: Chirpy 테마 기반 메인 기술 블로그 원클릭 배포
- **프로젝트 문서 자동화**: 선택한 리포지토리의 코드 구조를 분석하여 Docs 사이트 자동 생성
- **GitHub Pages 연동**: gh-pages 브랜치 자동 설정 및 배포

### 2️⃣ AI 기반 포스팅 작성 지원
- **커밋 로그 분석**: 최근 N일간의 커밋 Diff 및 PR 데이터 수집
- **주제 추천**: GitHub 활동 기반 블로그 포스트 주제 자동 생성
- **코드 예시 생성**: 변경된 코드 스니펫을 분석하여 설명과 함께 Markdown 작성
- **기술 스택 자동 분석**: Tree-Sitter 기반 언어 분석 및 기술 스택 추출
- **문서 구조 자동 생성**: AI가 프로젝트 구조를 분석하여 폴더별 문서 카테고리 생성

**사용 기술**: LangChain, LangGraph, OpenAI GPT-4, Tree-Sitter

### 3️⃣ 아바타 성장 시스템 (게이미피케이션)
- **9가지 개성 유형**: 개발자 성향 테스트 기반 맞춤형 아바타 지급
  - 성향 분류: Visionary/Logical, Builder/Architect, Solo/Group 조합 (VBS, LBG, LAG, VAG 등)
- **4단계 성장**: Egg → Child → Adult → Master
- **경험치 시스템**: 퀘스트 완료, 포스팅 작성, 커밋 활동 등으로 EXP 획득
- **레벨업 알림**: 성장 단계 도달 시 애니메이션과 함께 알림 표시

### 4️⃣ 퀘스트 시스템
사용자의 활동을 자동으로 감지하여 퀘스트 완료 및 보상 지급

| 퀘스트 유형 | 설명 | 빈도 |
|-----------|------|------|
| **Daily Check-in** | 매일 로그인 | DAILY |
| **Tech Blog or Custom** | 기술 블로그 포스팅 작성 | DAILY |
| **Project Doc** | 프로젝트 Docs 사이트 작성 | DAILY |
| **Visit Friends' Homepage** | 친구 홈 방문 | DAILY |
| **Weekly Check-in (5 days)** | 주 5일 이상 출석 | WEEKLY |
| **Write 3 Guestbooks** | 친구 방명록 3회 작성 | WEEKLY |

- **자동 완료 처리**: 블로그 포스팅, 친구 방문 등 행동 감지 시 자동 완료
- **보상 수령**: 완료된 퀘스트 클릭 시 경험치 지급 및 아바타 성장
- **주간 정리**: 매주 월요일 00:00 30일 이전 기록 자동 삭제 (Celery Beat)

### 5️⃣ 대시보드 및 활동 캘린더
- **GitHub 통계**: 커밋 수, 사용 언어, 기술 스택 시각화
- **활동 캘린더**: 일별 포스팅 기록을 히트맵 형태로 표시 (GitHub Contributions 스타일)
- **블로그 방문자 통계**: 누적 방문자 수 및 일별 방문자 추적
- **스트릭(Streak) 표시**: 연속 활동 일수 하이라이트

### 6️⃣ 소셜 기능
- **친구 시스템**: 다른 사용자 검색 및 친구 추가/수락
- **실시간 채팅**: WebSocket 기반 1:1 메시징 (Redis Pub/Sub)
- **친구 홈 방문**: 친구의 대시보드 및 아바타 정보 조회
- **방명록**: 친구 페이지에 메시지 남기기
- **온라인 상태 표시**: 실시간 접속 상태 확인

### 7️⃣ 데일리 선물 시스템
- **AI 기반 선물 생성**: 사용자의 최근 활동을 분석하여 개인화된 메시지 및 격려 문구 생성
- **자동 스케줄링**: 매일 17:30(KST) Celery Beat로 모든 활성 유저에게 선물 생성
- **보상 지급**: 선물 오픈 시 랜덤 경험치 보상 (10~50 EXP)

<br />

---

<br />

## 🖼️ 서비스 화면

### 1. 로그인 및 GitHub 연동
![로그인 시연](https://github.com/user-attachments/assets/placeholder_gif)
- GitHub OAuth 인증 화면
- 사용자 정보 자동 수집 (username, email, avatar)

### 2. 개발자 성향 테스트
![성향 테스트 및 부화](https://github.com/user-attachments/assets/placeholder_gif)
- 9가지 개성 유형 분류 설문 (12문항)
- 결과에 따라 고유 아바타 캐릭터 지급
- 알 부화 애니메이션 (Egg → Child)

### 3. 메인 홈 화면 (3단 레이아웃)
![메인 화면 UI](https://github.com/user-attachments/assets/placeholder_gif)
- **좌측 패널**: 사용자 프로필, 아바타 상태, 블로그 관리 버튼
- **중앙 패널**: 대시보드 (활동 캘린더, GitHub 통계, 방문자 수)
- **우측 패널**: 퀘스트 보드, 친구 목록, 채팅

### 4. 블로그 생성 페이지
![블로그 생성 과정](https://github.com/user-attachments/assets/placeholder_gif)
- 블로그 유형 선택 (Tech Blog / Project Docs)
- 리포지토리명, 블로그 설명, 테마 선택
- 생성 버튼 클릭 시 Celery 워커로 비동기 배포 시작

### 5. 블로그 포스팅 작성 페이지
![AI 포스팅 작성](https://github.com/user-attachments/assets/placeholder_gif)
- AI 분석 패널: 커밋 데이터 기반 주제 추천 및 코드 스니펫 생성
- Markdown 에디터: 실시간 프리뷰 지원
- 카테고리 및 태그 설정
- GitHub에 자동 커밋 및 배포

### 6. 친구 홈 화면
![친구 홈 방문 및 채팅](https://github.com/user-attachments/assets/placeholder_gif)
- 친구 아바타 및 레벨 확인
- 친구의 활동 캘린더 조회
- 방명록 작성 (Guest Book Modal)
- 1:1 채팅 시작

### 7. 개발자 디버그 콘솔 (`/debug`)
- GitHub 리포지토리 분석 테스트
- AI 문서 구조 생성 미리보기
- API 요청/응답 로그 확인

<br />

---

<br />

## 🚀 기술 차별점

### 1. AI 기반 컨텍스트 수집 및 문서 자동화
- **GithubContextBuilder**: 비동기로 리포지토리 데이터 수집 (Tree, Diffs, PRs, Tech Stack, README)
- **LangGraph 파이프라인**: AI가 수집된 컨텍스트를 분석하여 구조화된 문서 초안 생성
- **Tree-Sitter**: 코드 파싱을 통한 정확한 기술 스택 추출 (단순 확장자 기반이 아님)

### 2. Celery 기반 비동기 워커 처리
- **블로그 배포**: 무거운 Git clone/push 작업을 백그라운드로 처리
- **AI 문서 생성**: OpenAI API 호출이 오래 걸리는 작업을 비동기로 처리
- **주기적 작업**: Celery Beat로 퀘스트 정리, 선물 생성 등 스케줄링
- **결과 조회**: 작업 ID를 통한 실시간 진행 상태 확인

### 3. WebSocket 실시간 통신
- **Redis Pub/Sub**: 다중 서버 환경에서도 메시지 동기화
- **실시간 채팅**: 친구 간 1:1 메시징 지원
- **온라인 상태 관리**: 접속/종료 시 즉시 상태 업데이트

### 4. 게이미피케이션 시스템
- **자동 퀘스트 감지**: 사용자 행동을 백엔드에서 자동 처리 (포스팅 → 퀘스트 완료 → EXP 지급)
- **레벨 업 알림**: 프론트엔드 전역 상태 관리(Zustand)로 실시간 성장 알림
- **일일 선물**: AI가 사용자 활동을 분석하여 맞춤형 격려 메시지 생성

### 5. Upsert 방식 Git 파일 업로드
- **409 Conflict 방지**: 파일 존재 여부를 먼저 확인 후 Create/Update 자동 분기
- **SHA 기반 업데이트**: GitHub API의 최신 SHA를 사용하여 충돌 없이 덮어쓰기

### 6. Docker Compose 통합 개발 환경
- **5개 서비스 통합**: MySQL, Redis, Backend(FastAPI), Celery Worker, Frontend(React/Vite)
- **DB 초기화 스크립트**: 컨테이너 실행 시 자동으로 Alembic 마이그레이션 및 시드 데이터 주입
- **헬스체크**: MySQL 준비 완료 후에만 백엔드 시작

<br />

---

<br />

## 🔮 확장 가능성

### 단기 확장 (3~6개월)
- **GitHub Actions 연동**: 커밋 시 자동으로 블로그 포스트 초안 생성 및 PR 제출
- **다양한 블로그 테마 지원**: 현재 Chirpy 외에 Hexo, Hugo 템플릿 추가
- **모바일 반응형 최적화**: 현재 데스크톱 중심 → 모바일 앱 수준 UX 개선
- **다국어 지원**: 영어, 일본어 등 글로벌 사용자 대상 확장

### 중기 확장 (6~12개월)
- **팀 블로그 기능**: 여러 사용자가 협업하여 하나의 블로그 운영
- **통합 Analytics**: 블로그 방문자 추적 및 포스트별 조회수 분석
- **SEO 최적화 자동화**: AI가 메타 태그, 키워드 최적화 자동 제안
- **오픈소스 기여 추적**: GitHub 활동 중 외부 프로젝트 기여도를 대시보드에 표시

### 장기 확장 (1년 이상)
- **AI 챗봇 비서**: 아바타가 사용자의 코드를 직접 분석하여 개선 제안
- **NFT 아바타**: 성장한 아바타를 블록체인 기반 NFT로 발행
- **개발자 커뮤니티 피드**: 전체 사용자의 블로그 포스트를 큐레이션하여 추천
- **API 개방**: 외부 서비스에서 Eggit의 블로그 생성 기능을 사용할 수 있도록 Public API 제공

<br />

---

<br />

## 🛠️ 기술스택

### Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| **React** | 19.2.0 | UI 컴포넌트 프레임워크 |
| **Vite** | 7.2.4 | 빌드 도구 |
| **TailwindCSS** | 4.1.18 | 유틸리티 CSS 프레임워크 |
| **Zustand** | 5.0.10 | 전역 상태 관리 |
| **React Router** | 7.12.0 | 클라이언트 사이드 라우팅 |
| **Axios** | 1.13.2 | HTTP 클라이언트 |
| **Lucide React** | 0.562.0 | 아이콘 라이브러리 |
| **React Markdown** | 10.1.0 | Markdown 렌더링 |
| **React Syntax Highlighter** | 16.1.0 | 코드 하이라이팅 |

### Backend
| 기술 | 버전 | 용도 |
|------|------|------|
| **FastAPI** | 0.128.0 | 비동기 웹 프레임워크 |
| **SQLAlchemy** | 2.0.45 | ORM |
| **Alembic** | 1.18.1 | 데이터베이스 마이그레이션 |
| **Celery** | 5.6.2 | 비동기 작업 큐 |
| **Redis** | 6.4.0 | 캐싱 및 Pub/Sub |
| **MySQL** | 8.0 | 메인 데이터베이스 |
| **PyMySQL** | 1.1.2 | MySQL 드라이버 |
| **Pydantic** | 2.12.5 | 데이터 검증 |
| **python-jose** | 3.5.0 | JWT 토큰 처리 |
| **bcrypt** | 5.0.0 | 비밀번호 해싱 |

### AI & GitHub Integration
| 기술 | 버전 | 용도 |
|------|------|------|
| **LangChain** | 1.2.7 | AI 파이프라인 구축 |
| **LangGraph** | 1.0.7 | AI 워크플로우 오케스트레이션 |
| **OpenAI** | 2.15.0 | GPT-4 API 연동 |
| **PyGithub** | 2.8.1 | GitHub API 클라이언트 |
| **Tree-Sitter** | 0.21.3 | 코드 구문 분석 |
| **unidiff** | 0.7.5 | Git Diff 파싱 |

### Infrastructure
| 기술 | 버전 | 용도 |
|------|------|------|
| **Docker** | Latest | 컨테이너화 |
| **Docker Compose** | - | 다중 컨테이너 오케스트레이션 |
| **Uvicorn** | 0.40.0 | ASGI 서버 |
| **Nginx** | - (예정) | 리버스 프록시 |

<br />

---

<br />

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React + Vite)                 │
│  - Zustand (State Management)                                   │
│  - WebSocket Client (Chat, Presence)                            │
│  - API Client (Axios)                                            │
└─────────────────┬───────────────────────────────────────────────┘
                  │ HTTP / WebSocket
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ API Endpoints                                            │   │
│  │ - Auth (GitHub OAuth)                                    │   │
│  │ - User, Avatar, Quest, Friend, Chat, Blog, Dashboard    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Services                                                 │   │
│  │ - GithubClient (PyGithub)                                │   │
│  │ - GithubContextBuilder (Async Data Collection)           │   │
│  │ - AI Services (LangChain, LangGraph, OpenAI)             │   │
│  │ - BlogDeployService (Git Clone/Push)                     │   │
│  │ - QuestService (Auto Quest Detection)                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────┬────────────────────────┬──────────────────────┘
                  │                        │
                  ▼                        ▼
┌──────────────────────────┐  ┌──────────────────────────────┐
│   MySQL 8.0              │  │   Redis                      │
│   (Main Database)        │  │   - Pub/Sub (Chat)           │
│   - Users, Avatars       │  │   - Cache                    │
│   - Quests, Dashboards   │  │   - Celery Broker/Backend    │
│   - Friends, Chat Logs   │  └──────────────────────────────┘
└──────────────────────────┘
                  
                  ▲
                  │
┌─────────────────┴────────────────────────────────────────────┐
│                   Celery Worker                               │
│  - task_deploy_chirpy (Blog Deployment)                       │
│  - task_deploy_docs (AI Docs Generation)                      │
│  - task_post_to_blog (Posting Upload)                         │
│  - task_analyze_repo_context (GitHub Analysis)                │
│  - task_generate_user_gift (Daily Gift AI)                    │
│                                                                │
│  Celery Beat (Scheduler)                                      │
│  - Weekly Quest Cleanup (Every Monday 00:00)                  │
│  - Daily Gift Generation (Every Day 17:30 KST)                │
└────────────────────────────────────────────────────────────────┘
                  ▲
                  │
                  ▼
┌────────────────────────────────────────────────────────────────┐
│                   External Services                            │
│  - GitHub API (OAuth, Repos, Commits, PRs)                     │
│  - OpenAI API (GPT-4 for AI Generation)                        │
│  - GitHub Pages (Static Site Hosting)                          │
└────────────────────────────────────────────────────────────────┘
```

<br />

---

<br />

## 📁 프로젝트 구조

```
Eggit/
├── backend/                        # FastAPI 백엔드
│   ├── alembic/                    # DB 마이그레이션
│   │   ├── versions/               # 마이그레이션 버전 파일
│   │   └── env.py
│   ├── app/
│   │   ├── api/                    # API 라우터
│   │   │   └── v1/
│   │   │       ├── endpoints/      # 엔드포인트 모듈
│   │   │       │   ├── auth.py     # GitHub OAuth
│   │   │       │   ├── avatar.py   # 아바타 관리
│   │   │       │   ├── blog.py     # 블로그 생성/포스팅
│   │   │       │   ├── chat.py     # 실시간 채팅 (WebSocket)
│   │   │       │   ├── dashboard.py # 대시보드 데이터
│   │   │       │   ├── debug.py    # AI 디버그 콘솔
│   │   │       │   ├── friend.py   # 친구 시스템
│   │   │       │   ├── gift.py     # 데일리 선물
│   │   │       │   ├── guestbook.py # 방명록
│   │   │       │   ├── presence.py # 온라인 상태
│   │   │       │   ├── quest.py    # 퀘스트 시스템
│   │   │       │   ├── users.py    # 사용자 정보
│   │   │       │   └── calendar.py # 활동 캘린더
│   │   │       └── api.py          # 라우터 통합
│   │   ├── core/                   # 핵심 설정
│   │   │   ├── config.py           # 환경 변수 관리
│   │   │   └── security.py         # JWT, 암호화
│   │   ├── models/                 # SQLAlchemy 모델
│   │   │   ├── user.py
│   │   │   ├── avatar.py
│   │   │   ├── quest.py
│   │   │   ├── friend.py
│   │   │   ├── chat.py
│   │   │   ├── dashboard.py
│   │   │   ├── calendar.py
│   │   │   ├── gift.py
│   │   │   ├── guestbook.py
│   │   │   └── visit.py
│   │   ├── schemas/                # Pydantic 스키마
│   │   ├── services/               # 비즈니스 로직
│   │   │   ├── ai/                 # AI 관련 서비스
│   │   │   │   ├── ai_docs_site_generator.py
│   │   │   │   ├── ai_posting_service.py
│   │   │   │   ├── docs_generator.py
│   │   │   │   └── gift_generator.py
│   │   │   ├── blog/               # 블로그 서비스
│   │   │   │   ├── github_blog_service.py
│   │   │   │   └── blog_post_builder.py
│   │   │   ├── github/             # GitHub 연동
│   │   │   │   ├── github_client.py
│   │   │   │   └── github_context_builder.py
│   │   │   ├── avatar_service.py
│   │   │   ├── dashboard_service.py
│   │   │   ├── gift_service_logic.py
│   │   │   ├── quest_service.py
│   │   │   └── tracking_service.py
│   │   ├── utils/                  # 유틸리티
│   │   ├── worker.py               # Celery 워커 태스크 정의
│   │   └── main.py                 # FastAPI 앱 진입점
│   ├── templates/                  # 블로그 템플릿 (Chirpy, Docs)
│   ├── alembic.ini
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                       # React 프론트엔드
│   ├── public/
│   ├── src/
│   │   ├── api/                    # API 클라이언트
│   │   ├── assets/                 # 이미지, 아이콘
│   │   ├── components/             # 재사용 컴포넌트
│   │   │   ├── LeftSidePanel.jsx   # 프로필 및 아바타
│   │   │   ├── MainCenterPanel.jsx # 대시보드
│   │   │   ├── RightSidePanel.jsx  # 퀘스트 및 친구
│   │   │   ├── ChatSidebar.jsx     # 실시간 채팅
│   │   │   ├── BlogCalendar.jsx    # 활동 캘린더
│   │   │   ├── GiftBoxModal.jsx    # 선물 상자
│   │   │   ├── GuestbookModal.jsx  # 방명록
│   │   │   ├── EvolutionOverlay.jsx # 레벨업 알림
│   │   │   ├── NotificationPopup.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── pages/                  # 페이지 컴포넌트
│   │   │   ├── LoginPage.jsx
│   │   │   ├── AuthCallback.jsx
│   │   │   ├── MainPage.jsx
│   │   │   ├── BlogCreationPage.jsx
│   │   │   ├── BlogPostingPage.jsx
│   │   │   ├── AiDebugConsole.jsx
│   │   │   └── DeveloperTest/      # 성향 테스트
│   │   ├── store/                  # Zustand 상태 관리
│   │   │   ├── useUserStore.js
│   │   │   ├── useAuthStore.js
│   │   │   ├── useAvatarStore.js
│   │   │   ├── useChatStore.js
│   │   │   ├── useNotificationStore.js
│   │   │   └── useGiftStore.js
│   │   ├── utils/                  # 유틸리티
│   │   │   └── apiClient.js        # Axios 인스턴스
│   │   ├── App.jsx                 # 라우팅 설정
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
│
├── docker-compose.yml              # 컨테이너 오케스트레이션
├── .env                            # 환경 변수 (미포함, .env.example 참고)
├── .gitignore
└── README.md                       # 이 파일
```

<br />

---

<br />

## ⚙️ 개발 환경 설정

### 사전 요구사항
- **Docker** & **Docker Compose** (권장)
- **Node.js** 18+ (로컬 개발 시)
- **Python** 3.10+ (로컬 개발 시)
- **MySQL** 8.0+ (로컬 DB 사용 시)
- **Redis** (로컬 캐시 사용 시)

<br />

### 1️⃣ Docker Compose로 전체 실행 (권장)

```bash
# 1. 리포지토리 클론
git clone https://github.com/your-org/Eggit.git
cd Eggit

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일을 열어서 다음 값들을 설정:
# - GITHUB_CLIENT_ID
# - GITHUB_CLIENT_SECRET
# - OPENAI_API_KEY
# - MYSQL_ROOT_PASSWORD
# - JWT_SECRET_KEY

# 3. Docker Compose 실행
docker-compose up -d

# 4. 서비스 확인
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

**컨테이너 구성**:
- `my-frontend`: React 개발 서버 (Vite)
- `my-backend`: FastAPI 서버
- `my-celery`: Celery Worker
- `my-db`: MySQL 8.0
- `my-redis`: Redis

<br />

### 2️⃣ 로컬 개발 (백엔드)

```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 패키지 설치
pip install -r requirements.txt

# 데이터베이스 마이그레이션
alembic upgrade head

# 서버 실행
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# (별도 터미널) Celery Worker 실행
celery -A app.worker.celery_app worker --loglevel=info

# (별도 터미널) Celery Beat 실행 (스케줄러)
celery -A app.worker.celery_app beat --loglevel=info
```

<br />

### 3️⃣ 로컬 개발 (프론트엔드)

```bash
cd frontend

# 패키지 설치
npm install

# 개발 서버 실행
npm run dev

# 브라우저에서 http://localhost:5173 접속
```

<br />

### 4️⃣ 환경 변수 설정 (`.env`)

```bash
# GitHub OAuth (https://github.com/settings/developers)
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_CALLBACK_URL=http://localhost:8000/api/v1/auth/github/callback

# OpenAI API (https://platform.openai.com)
OPENAI_API_KEY=sk-your-openai-api-key

# Database
MYSQL_ROOT_PASSWORD=your_password_here
MYSQL_DATABASE=eggit_db
MYSQL_HOST=db  # Docker: db, 로컬: localhost
MYSQL_PORT=3306

# Redis
REDIS_HOST=redis  # Docker: redis, 로컬: localhost
REDIS_PORT=6379

# Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# JWT
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=43200  # 30일

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:5173

# Backend URL (Frontend에서 사용)
VITE_API_URL=http://localhost:8000/api/v1
```

<br />

### 5️⃣ 데이터베이스 초기화

Docker Compose 실행 시 자동으로 다음 작업이 수행됩니다:
1. **테이블 드롭**: 기존 테이블 모두 삭제
2. **마이그레이션 실행**: `alembic upgrade head`
3. **시드 데이터 주입**:
   - `AI_generated_seed_avatar_metas.py`: 9가지 아바타 메타 데이터
   - `init_db_force.py`: 기본 퀘스트 데이터 (7개)

수동으로 초기화하려면:
```bash
# 백엔드 컨테이너 접속
docker exec -it my-backend bash

# 마이그레이션 실행
alembic upgrade head

# 시드 데이터 주입
python AI_generated_seed_avatar_metas.py
python init_db_force.py
```

<br />

---

<br />

## 🧪 테스트 및 디버깅

### API 문서
FastAPI의 자동 생성 문서를 확인하세요:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### AI 디버그 콘솔
프론트엔드에서 `/debug` 경로로 이동하면:
- GitHub 리포지토리 분석 테스트
- AI 문서 구조 생성 미리보기
- Celery 작업 상태 확인

### 로그 확인
```bash
# 백엔드 로그
docker logs -f my-backend

# Celery Worker 로그
docker logs -f my-celery

# 프론트엔드 로그
docker logs -f my-frontend
```

<br />

---

<br />

## 🤝 기여 가이드

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<br />

---

<br />

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참고하세요.

<br />

---

<br />

## 👥 개발팀

**Eggit Team**

| 이름 | 역할 | GitHub |
|------|------|--------|
| - | Frontend Lead | - |
| - | Backend Lead | - |
| - | AI Engineer | - |
| - | DevOps | - |
| - | UI/UX Designer | - |

<br />

---

<br />

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 등록해주세요.

**Repository**: [GitHub Link](https://github.com/your-org/Eggit)

<br />

---

<div align="center">

**🥚 Eggit - 개발자의 성장을 응원합니다! 🐣**

Made with ❤️ by Eggit Team

</div>

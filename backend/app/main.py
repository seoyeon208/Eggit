from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router

# [FIX] 파일명을 init_quest_data -> init_db_force 로 수정
from init_db_force import init_default_quests 
from AI_generated_seed_avatar_metas import seed_avatar_metas

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 [Eggit Backend] Server Starting...")
    try:
        # 1. 퀘스트 데이터 동기화
        print("📦 [DB Init] Syncing Default Quest Data...")
        init_default_quests()
        
        # 2. [추가됨] 아바타 메타 데이터 동기화
        print("👾 [DB Init] Seeding Avatar Meta Data...")
        seed_avatar_metas()
        
        print("✅ [DB Init] All Data Synced Successfully.")
    except Exception as e:
        print(f"❌ [DB Init] Failed to sync data: {e}")
    
    yield
    print("🛑 [Eggit Backend] Server Stopping...")

def get_application():
    _app = FastAPI(
        title="Eggit API",
        description="GitHub Blog Automation & Gamification Service",
        version="1.0.0",
        lifespan=lifespan
    )

    # CORS 설정 (유지)
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4000",
        "http://127.0.0.1:4000",
        "https://eggit.example.com",
        
    ]

    _app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"https://.*\.github\.io",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    _app.include_router(api_router, prefix="/api/v1")
    return _app

app = get_application()

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Eggit Backend is running!"}
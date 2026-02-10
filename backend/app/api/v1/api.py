from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, avatar, friend, chat, blog, github, debug, presence, quest, dashboard, guestbook, calendar, gift
api_router = APIRouter()

# 만든 라우터들을 여기에 등록합니다.
# /api/v1/auth/login/github 형태로 접근하게 됩니다.
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(avatar.router, prefix="/avatar", tags=["avatar"])
api_router.include_router(friend.router, prefix="/friends", tags=["friends"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(blog.router, prefix="/blog", tags=["blog"])
api_router.include_router(github.router, prefix="/github", tags=["github"])
api_router.include_router(debug.router, prefix="/debug", tags=["debug"])
api_router.include_router(presence.router, prefix="/presence", tags=["presence"])
api_router.include_router(quest.router, prefix="/quests", tags=["quests"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(guestbook.router, prefix="/guestbook", tags=["guestbook"])
api_router.include_router(calendar.router, prefix="/calendar", tags=["calendar"])
api_router.include_router(gift.router, prefix="/gift", tags=["gift"])

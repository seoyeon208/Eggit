from fastapi import APIRouter, Depends, Request, BackgroundTasks
from sqlalchemy.orm import Session
from app.api import deps
from app.services import dashboard_service, tracking_service

router = APIRouter()

# 1. 대시보드 조회 API (Auth Required)
@router.get("/summary")
def get_dashboard(
    user_id: int = None,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    from app.models.user import User
    
    # 1. 대상 유저 결정 (특정 유저 ID가 있으면 그 유저, 없으면 나 자신)
    if user_id:
        target_user = db.query(User).filter(User.id == user_id).first()
        if not target_user:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="User not found")
    else:
        target_user = current_user

    return dashboard_service.get_combined_dashboard(db, target_user)

# 2. 방문자 트래킹 API (Public, No Auth)
@router.post("/visit")
def track_visit(
    request: Request,
    payload: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db)
):
    # payload: { "repo_owner": "username", "is_test": boolean }
    repo_owner = payload.get("repo_owner")
    is_test = payload.get("is_test", False)

    if not repo_owner:
        return {"status": "fail", "msg": "Owner required"}

    if is_test:
        print(f"🧪 Test visit from localhost for {repo_owner}")
        return {"status": "success", "mode": "test"}

    # 실제 로직은 백그라운드로 넘겨서 빠른 응답 보장
    client_ip = request.client.host
    # 프록시(Nginx 등) 사용 시 헤더 확인 필요
    if request.headers.get("X-Forwarded-For"):
        client_ip = request.headers.get("X-Forwarded-For").split(",")[0]

    background_tasks.add_task(
        tracking_service.process_visit_log, 
        db, 
        repo_owner, 
        client_ip
    )

    return {"status": "success"}
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.debug import GithubAnalysisRequest
from app.api.deps import get_current_user
from app.models.user import User
from app.core.security import decrypt_token
from celery.result import AsyncResult

router = APIRouter()

# [POST] /api/v1/debug/github/analyze
# 수정사항: Header로 직접 받던 토큰을 제거하고, Depends(get_current_user)를 사용합니다.
@router.post("/github/analyze", status_code=202)
async def analyze_github_repo(
    request: GithubAnalysisRequest, 
    current_user: User = Depends(get_current_user)
):
    """
    현재 로그인한 사용자의 GitHub 토큰을 사용하여 레포지토리를 분석합니다.
    """
    try:
        # [Auth Logic] DB에 저장된 암호화된 토큰을 복호화하여 사용
        user_token = decrypt_token(current_user.github_access_token)
        
        # 순환 참조 방지를 위해 내부 임포트
        from app.worker import task_analyze_repo_context
        
        task = task_analyze_repo_context.delay(
            token=user_token, 
            request_data=request.model_dump()
        )
        return {"task_id": task.id, "message": "Analysis task queued"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# [GET] /api/v1/debug/tasks/{task_id}
@router.get("/tasks/{task_id}")
async def get_analysis_status(task_id: str):
    try:
        task_result = AsyncResult(task_id)
        
        response = {"status": task_result.state}
        
        if task_result.state == 'SUCCESS':
            response["result"] = task_result.result
        elif task_result.state == 'FAILURE':
            response["error"] = str(task_result.result)
        elif task_result.state == 'PENDING':
            response["status"] = "PENDING"
            
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Task polling failed: {str(e)}")
    

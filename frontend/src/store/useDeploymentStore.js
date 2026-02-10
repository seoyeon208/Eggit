import { create } from 'zustand';
import apiClient from '../utils/apiClient';

const useDeploymentStore = create((set, get) => ({
  // status: 'idle' | 'loading' | 'success' | 'error'
  deployStatus: 'idle',
  deployMessage: '',
  taskId: null,
  pollInterval: null,

  // [NEW] 작업 타입 및 결과 정보
  taskType: null, // 'blog_creation' | 'blog_posting' | null
  resultUrl: null, // 완료 후 이동할 URL
  blogInfo: null,  // { blogName, postTitle } 등 작업 관련 정보

  // 1. 배포 요청 시작 (확장된 파라미터)
  startDeploy: (taskId, options = {}) => {
    const { taskType = 'blog_creation', blogInfo = null } = options;

    let message = '';
    if (taskType === 'blog_creation') {
      message = '새로운 블로그를 짓고 있어요! (Git Push 중...) 🏗️🏠';
    } else if (taskType === 'blog_posting') {
      message = '포스트를 깃허브에 업로드하는 중... ✍️📤';
    } else {
      message = '작업을 처리하는 중입니다...';
    }

    set({
      deployStatus: 'loading',
      deployMessage: message,
      taskId: taskId,
      taskType: taskType,
      blogInfo: blogInfo,
      resultUrl: null
    });

    // 폴링 시작
    get().startPolling(taskId);
  },

  // 2. 폴링 로직 (확장됨)
  startPolling: (taskId) => {
    // 혹시 기존 인터벌이 있다면 제거
    if (get().pollInterval) clearInterval(get().pollInterval);

    const intervalId = setInterval(async () => {
      try {
        const res = await apiClient.get(`/blog/tasks/${taskId}`);
        const { status, result, error } = res.data;
        const currentTaskType = get().taskType;
        const currentBlogInfo = get().blogInfo;

        // Celery 상태에 따른 분기 처리
        if (status === 'SUCCESS') {
          clearInterval(get().pollInterval);

          // 결과 URL 생성
          let resultUrl = null;
          let successMessage = '';

          if (currentTaskType === 'blog_creation') {
            // result에 blog_url이 있다고 가정
            resultUrl = result?.blog_url || result?.pages_url || null;
            successMessage = '짜잔! 블로그가 세상에 나왔어요! 🎉\n(GitHub 배포: 약 1~5분 소요)';
          } else if (currentTaskType === 'blog_posting') {
            // 포스팅 완료 시 블로그로 이동
            resultUrl = result?.post_url || result?.blog_url || null;
            successMessage = `포스트 "${currentBlogInfo?.postTitle || ''}" 발행 완료! 🎊\n(GitHub 배포: 약 1~5분 소요)`;
          } else {
            successMessage = '작업이 완료되었습니다! ✅\n(GitHub 배포: 약 1~5분 소요)';
          }

          set({
            deployStatus: 'success',
            deployMessage: successMessage,
            resultUrl: resultUrl,
            pollInterval: null
          });
        } else if (status === 'FAILURE' || status === 'REVOKED') {
          clearInterval(get().pollInterval);
          set({
            deployStatus: 'error',
            deployMessage: `오류가 발생했어요: ${error || 'Unknown Error'} 😢`,
            pollInterval: null,
            resultUrl: null
          });
        } else {
          // PENDING, STARTED, RETRY 등...
          const messages = [
            '깃허브로 날아가는 중... 슝슝 ✈️',
            '열심히 작업하는 중... 💪',
            '조금만 기다려주세요... ⏳'
          ];
          const randomMsg = messages[Math.floor(Math.random() * messages.length)];
          set({ deployMessage: randomMsg });
        }
      } catch (err) {
        console.error("Polling error:", err);
        clearInterval(get().pollInterval);
        set({
          deployStatus: 'error',
          deployMessage: '서버와 연결이 끊어졌어요. 😥',
          pollInterval: null,
          resultUrl: null
        });
      }
    }, 3000); // 3초마다 체크

    set({ pollInterval: intervalId });
  },

  // 실패 처리 (기존 함수명 유지)
  failDeploy: (errorMessage) => {
    const { pollInterval } = get();
    if (pollInterval) clearInterval(pollInterval);
    set({
      deployStatus: 'error',
      deployMessage: errorMessage || '작업 실패',
      pollInterval: null,
      resultUrl: null
    });
  },

  // 상태 초기화
  resetStatus: () => {
    const { pollInterval } = get();
    if (pollInterval) clearInterval(pollInterval);
    set({
      deployStatus: 'idle',
      deployMessage: '',
      taskId: null,
      taskType: null,
      resultUrl: null,
      blogInfo: null,
      pollInterval: null
    });
  },

  // [NEW] 상태 직접 설정 (AI 작업 통합용)
  setDeployStatus: (status, message, taskId = null, resultUrl = null) => {
    set({
      deployStatus: status,
      deployMessage: message || '',
      taskId: taskId,
      resultUrl: resultUrl
    });
  },
}));

export default useDeploymentStore;
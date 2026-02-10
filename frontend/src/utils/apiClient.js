import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

/**
 * 중앙화된 Axios 인스턴스
 * - 모든 API 요청에 자동으로 Authorization 헤더 추가
 * - 401/403 에러 시 자동 로그아웃 및 리다이렉트
 * - 네트워크 재시도 로직 (옵션)
 */
const apiClient = axios.create({
    // Prefer environment variable, fallback to relative path for production robustness
    baseURL: import.meta.env.VITE_API_URL || '/api/v1',
    withCredentials: true,  // 🍪 쿠키 자동 전송
    timeout: 30000, // 30초 타임아웃
    headers: {
        'Content-Type': 'application/json',
    },
});

// ===== 요청 인터셉터: 모든 요청에 토큰 자동 추가 =====
apiClient.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // 개발 환경에서 요청 로깅
        if (import.meta.env.DEV) {
            console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
        }

        return config;
    },
    (error) => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
    }
);

// ===== 응답 인터셉터: 에러 핸들링 및 자동 로그아웃 =====
apiClient.interceptors.response.use(
    (response) => {
        // 개발 환경에서 응답 로깅
        if (import.meta.env.DEV) {
            console.log(`[API Response] ${response.config.url}`, response.data);
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // 401 Unauthorized: 토큰 만료 또는 인증 실패
        if (error.response?.status === 401) {
            console.warn('[API 401] Unauthorized - Logging out');

            // 로그아웃 처리
            useAuthStore.getState().logout();

            // 로그인 페이지로 리다이렉트 (현재 경로 저장)
            const currentPath = window.location.pathname;
            if (currentPath !== '/login') {
                sessionStorage.setItem('redirectAfterLogin', currentPath);
                window.location.href = '/login';
            }
        }

        // 403 Forbidden: 권한 부족
        else if (error.response?.status === 403) {
            console.error('[API 403] Forbidden - Access denied');
            // 필요 시 사용자에게 권한 없음 알림 표시 가능
        }

        // 500+ Server Error: 서버 오류
        else if (error.response?.status >= 500) {
            console.error('[API 5XX] Server Error', error.response.data);
        }

        // Network Error: 네트워크 연결 실패
        else if (error.message === 'Network Error') {
            console.error('[API Network Error] Check your internet connection');
        }

        // 재시도 로직 (선택적, 필요시 활성화)
        // if (!originalRequest._retry && shouldRetry(error)) {
        //     originalRequest._retry = true;
        //     return new Promise(resolve => {
        //         setTimeout(() => resolve(apiClient(originalRequest)), 1000);
        //     });
        // }

        return Promise.reject(error);
    }
);

/**
 * 재시도 여부 판단 함수 (필요시 사용)
 */
// function shouldRetry(error) {
//     return error.code === 'ECONNABORTED' || error.message === 'Network Error';
// }

export default apiClient;

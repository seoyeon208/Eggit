import { create } from 'zustand';

/**
 * AuthStore - JWT 토큰 및 인증 상태 관리
 * localStorage 직접 접근 대신 이 store를 통해 토큰 관리
 */
const useAuthStore = create((set, get) => ({
    token: localStorage.getItem('access_token') || null,

    // 토큰 설정
    setToken: (token) => {
        if (token) {
            localStorage.setItem('access_token', token);
        } else {
            localStorage.removeItem('access_token');
        }
        set({ token });
    },

    // 토큰 가져오기
    getToken: () => get().token,

    // 로그아웃
    logout: () => {
        localStorage.removeItem('access_token');
        set({ token: null });
    },

    // 인증 여부 확인
    isAuthenticated: () => !!get().token,
}));

export default useAuthStore;

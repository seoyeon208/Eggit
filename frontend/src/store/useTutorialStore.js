import { create } from 'zustand';

/**
 * 튜토리얼 상태 관리 스토어
 */
const useTutorialStore = create((set, get) => ({
    // 튜토리얼 활성화 여부
    isActive: false,

    // 현재 페이지 ('main', 'blog-creation', 'blog-posting')
    currentPage: null,

    // 현재 단계 (0부터 시작)
    currentStep: 0,

    // 튜토리얼 완료 여부 (백엔드에서 가져옴)
    isCompleted: false,

    /**
     * 튜토리얼 시작
     */
    startTutorial: (page) => {
        set({
            isActive: true,
            currentPage: page,
            currentStep: 0
        });
        localStorage.setItem('tutorial_isActive', 'true');
        localStorage.setItem('tutorial_currentPage', page);
        localStorage.setItem('tutorial_currentStep', '0');
    },

    /**
     * 다음 단계로 진행 (멀티 페이지 지원)
     */
    nextStep: (targetPage = null, targetStep = 0) => {
        if (targetPage) {
            set({ isActive: true, currentPage: targetPage, currentStep: targetStep });
            localStorage.setItem('tutorial_isActive', 'true');
            localStorage.setItem('tutorial_currentPage', targetPage);
            localStorage.setItem('tutorial_currentStep', targetStep.toString());
        } else {
            set((state) => {
                const nextStep = state.currentStep + 1;
                localStorage.setItem('tutorial_currentStep', nextStep.toString());
                return { currentStep: nextStep };
            });
        }
    },

    /**
     * 현재 페이지의 스텝 초기화
     */
    resetStep: () => set({ currentStep: 0 }),

    /**
     * 특정 단계로 이동
     */
    goToStep: (step) => set({ currentStep: step }),

    /**
     * 특정 페이지와 단계로 튜토리얼 시작
     */
    startTutorialAtStep: (page, stepIndex) => set({
        isActive: true,
        currentPage: page,
        currentStep: stepIndex
    }),

    /**
     * 튜토리얼 종료 (모든 단계 완료)
     */
    endTutorial: async () => {
        try {
            const token = localStorage.getItem('access_token');
            const API_URL = import.meta.env.VITE_API_URL;

            if (token && API_URL) {
                await fetch(`${API_URL}/users/tutorial/complete`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }

            set({
                isActive: false,
                isCompleted: true,
                currentPage: null,
                currentStep: 0
            });
            localStorage.removeItem('tutorial_isActive');
            localStorage.removeItem('tutorial_currentPage');
            localStorage.removeItem('tutorial_currentStep');
        } catch (error) {
            console.error('Failed to complete tutorial:', error);
            // 에러가 나도 로컬에서는 완료 처리
            set({
                isActive: false,
                isCompleted: true,
                currentPage: null,
                currentStep: 0
            });
            localStorage.removeItem('tutorial_isActive');
            localStorage.removeItem('tutorial_currentPage');
            localStorage.removeItem('tutorial_currentStep');
        }
    },

    /**
     * 튜토리얼 스킵 (백엔드에 완료로 저장)
     */
    skipTutorial: async () => {
        try {
            const token = localStorage.getItem('access_token');
            const API_URL = import.meta.env.VITE_API_URL;

            if (token && API_URL) {
                await fetch(`${API_URL}/users/tutorial/complete`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }

            set({
                isActive: false,
                isCompleted: true,
                currentPage: null,
                currentStep: 0
            });
            localStorage.removeItem('tutorial_isActive');
            localStorage.removeItem('tutorial_currentPage');
            localStorage.removeItem('tutorial_currentStep');
        } catch (error) {
            console.error('Failed to skip tutorial:', error);
            // 에러가 나도 로컬에서는 완료 처리
            set({
                isActive: false,
                isCompleted: true,
                currentPage: null,
                currentStep: 0
            });
            localStorage.removeItem('tutorial_isActive');
            localStorage.removeItem('tutorial_currentPage');
            localStorage.removeItem('tutorial_currentStep');
        }
    },

    /**
     * 튜토리얼 완료 상태 설정
     */
    setCompleted: (completed) => set({ isCompleted: completed }),

    /**
     * 페이지 변경
     */
    setPage: (page) => {
        set({ currentPage: page, currentStep: 0 });
        localStorage.setItem('tutorial_currentPage', page);
        localStorage.setItem('tutorial_currentStep', '0');
    },

    /**
     * 로컬 스토리지에서 상태 복구
     */
    restoreState: () => {
        const savedPage = localStorage.getItem('tutorial_currentPage');
        const savedStep = localStorage.getItem('tutorial_currentStep');
        const savedActive = localStorage.getItem('tutorial_isActive') === 'true';

        if (savedActive && savedPage) {
            set({
                isActive: true,
                currentPage: savedPage,
                currentStep: parseInt(savedStep || '0', 10)
            });
        }
    }
}));

// 초기화 시 상태 복구 실행
useTutorialStore.getState().restoreState();

export default useTutorialStore;

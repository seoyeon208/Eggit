import { create } from 'zustand';

const GROWTH_STAGES = {
    EGG: { name: '알', minLevel: 1, maxLevel: 1 },
    BABY: { name: '애기', minLevel: 2, maxLevel: 5 },
    ADULT: { name: '성인', minLevel: 6, maxLevel: 10 }
};

/**
 * Zustand 전역 상태 관리
 * 수정된 기획서 기반 - 코인/퀘스트/채팅 제거
 */
const useUserStore = create((set, get) => ({
    // 사용자 정보
    user: null, // 초기값 null (로그인 안됨)

    // 캐릭터 정보 (다마고찌)
    avatar: null,

    // 블로그 정보
    blog: null,

    // 오늘의 커밋 수
    todayCommits: 0,

    // 경험치 활동 내역
    expHistory: [],

    // 친구 채팅 메시지
    chatMessages: [],

    // === 액션 ===

    // 사용자 정보 업데이트
    setUser: (user) => set({ user }),

    // 아바타 정보 업데이트
    setAvatar: (avatar) => set({ avatar }),

    // 블로그 정보 업데이트
    setBlog: (blog) => set({ blog }),

    // 경험치 내역 추가 (백엔드에서 레벨업 처리됨)
    addExpHistory: (amount, action) => set((state) => {
        const newHistory = [
            { id: Date.now(), action, exp: amount, date: new Date().toISOString().split('T')[0] },
            ...state.expHistory
        ].slice(0, 10); // 최근 10개만 유지

        return {
            expHistory: newHistory
        };
    }),

    // 캐릭터 상호작용 (쓰다듬기)
    petCharacter: () => set((state) => ({
        avatar: {
            ...state.avatar,
            statusMessage: "고마워! 오늘도 열심히 기록하자! 🥚✨"
        }
    })),

    // 상태 메시지 변경
    setStatusMessage: (message) => set((state) => ({
        avatar: {
            ...state.avatar,
            statusMessage: message
        }
    })),

    // 전체 데이터 초기화 (API 호출 후)
    initializeData: (data) => set({
        user: data.user,
        avatar: data.avatar,
        blog: data.blog,
        todayCommits: data.todayCommits || 0,
        expHistory: data.expHistory || []
    })
}));

export default useUserStore;

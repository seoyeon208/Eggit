import { create } from 'zustand';

/**
 * 전역 상태 갱신 스토어
 * window.dispatchEvent 패턴을 대체하여 React의 선언적 패턴 준수
 */
const useRefreshStore = create((set, get) => ({
    // 갱신 트리거 (타임스탬프 기반)
    avatarRefreshKey: 0,
    questRefreshKey: 0,
    giftRefreshKey: 0,
    calendarRefreshKey: 0,

    // 아바타 데이터 갱신 (레벨업, 성장 단계 변화 등)
    refreshAvatar: () => {
        set((state) => ({ avatarRefreshKey: state.avatarRefreshKey + 1 }));
        console.log('[RefreshStore] Avatar refreshed');
    },

    // 퀘스트 데이터 갱신 (완료, 보상 수령 등)
    refreshQuest: () => {
        set((state) => ({ questRefreshKey: state.questRefreshKey + 1 }));
        console.log('[RefreshStore] Quest refreshed');
    },

    // 선물 데이터 갱신 (새 선물 생성, 열기 등)
    refreshGift: () => {
        set((state) => ({ giftRefreshKey: state.giftRefreshKey + 1 }));
        console.log('[RefreshStore] Gift refreshed');
    },

    // 캘린더 데이터 갱신 (새 포스트 작성 등)
    refreshCalendar: () => {
        set((state) => ({ calendarRefreshKey: state.calendarRefreshKey + 1 }));
        console.log('[RefreshStore] Calendar refreshed');
    },

    // 모든 데이터 일괄 갱신
    refreshAll: () => {
        set((state) => ({
            avatarRefreshKey: state.avatarRefreshKey + 1,
            questRefreshKey: state.questRefreshKey + 1,
            giftRefreshKey: state.giftRefreshKey + 1,
            calendarRefreshKey: state.calendarRefreshKey + 1,
        }));
        console.log('[RefreshStore] All data refreshed');
    },
}));

export default useRefreshStore;

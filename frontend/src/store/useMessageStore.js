import { create } from 'zustand';

/**
 * 전역 메시지 상태 관리 스토어
 * - 친구별 읽지 않은 메시지 수 관리
 * - 실시간 알림 스택 관리
 */
const useMessageStore = create((set) => ({
    // { [friendId]: count }
    unreadCounts: {},

    // [{ id, senderId, senderUsername, timestamp }]
    notifications: [],

    setUnreadCount: (friendId, count) => set((state) => ({
        unreadCounts: { ...state.unreadCounts, [friendId]: count }
    })),

    incrementUnreadCount: (friendId) => set((state) => ({
        unreadCounts: {
            ...state.unreadCounts,
            [friendId]: (state.unreadCounts[friendId] || 0) + 1
        }
    })),

    clearUnreadCount: (friendId) => set((state) => ({
        unreadCounts: { ...state.unreadCounts, [friendId]: 0 }
    })),

    addNotification: (notification) => set((state) => {
        const id = Date.now();
        const freshNotification = { ...notification, id };

        // 같은 senderId의 기존 알림 제거 (유저별 하나씩만)
        const withoutDuplicate = state.notifications.filter(
            n => n.senderId !== freshNotification.senderId
        );

        // 새 알림 추가 후 최대 3개까지만 유지
        const updatedNotifications = [...withoutDuplicate, freshNotification].slice(-3);

        return { notifications: updatedNotifications };
    }),

    removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
    })),

    // 특정 senderId의 알림 제거 (채팅창 열 때 사용)
    removeNotificationBySender: (senderId) => set((state) => ({
        notifications: state.notifications.filter(n => n.senderId !== senderId)
    })),

    // ChatSidebar 열림 상태
    isChatSidebarOpen: false,

    setChatSidebarOpen: (isOpen) => set({ isChatSidebarOpen: isOpen })
}));

export default useMessageStore;

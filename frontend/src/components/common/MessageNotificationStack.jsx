import { useEffect } from 'react';
import useMessageStore from '../../store/useMessageStore';

/**
 * 전역 메시지 알림 스태킹 컴포넌트
 * - 유저별로 하나씩만 표시 (최신 메시지)
 * - 최대 3개까지만 표시
 * - 클릭하면 해당 유저와의 채팅창 열림
 * - 1초 후 자동 사라짐
 */
const MessageNotificationStack = () => {
    const { notifications, removeNotification, removeNotificationBySender, isChatSidebarOpen } = useMessageStore();

    // 알림 자동 제거 타이머 (1초로 단축)
    useEffect(() => {
        if (notifications.length > 0) {
            const firstNotification = notifications[0];
            const timer = setTimeout(() => {
                removeNotification(firstNotification.id);
            }, 1000); // 1초
            return () => clearTimeout(timer);
        }
    }, [notifications, removeNotification]);

    if (notifications.length === 0 || isChatSidebarOpen) return null;

    const handleNotificationClick = (senderId) => {
        // 알림 제거
        removeNotificationBySender(senderId);

        // ChatSidebar 열기 및 해당 유저 채팅 시작
        const event = new CustomEvent('openChatFromNotification', {
            detail: { friendId: senderId }
        });
        window.dispatchEvent(event);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999]">
            <div className="flex flex-col-reverse items-end gap-2">
                {notifications.map((notif) => {
                    return (
                        <div
                            key={notif.id}
                            className="animate-slide-up-fade cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => handleNotificationClick(notif.senderId)}
                        >
                            <div className="relative group">
                                {/* Profile Picture - 동그란 형태 */}
                                <div className="w-14 h-14 bg-white/90 backdrop-blur-sm p-0.5 rounded-full shadow-2xl border-2 border-blue-300/80 flex items-center justify-center overflow-hidden hover:border-blue-500 transition-all">
                                    <img
                                        src={`https://github.com/${notif.senderUsername}.png`}
                                        alt={notif.senderUsername}
                                        className="w-full h-full object-cover rounded-full"
                                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${notif.senderUsername}` }}
                                    />
                                </div>

                                {/* Hover tooltip */}
                                <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                    {notif.senderUsername}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MessageNotificationStack;

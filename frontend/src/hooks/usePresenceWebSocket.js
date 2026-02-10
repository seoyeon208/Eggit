import { useEffect, useRef } from 'react';
import useMessageStore from '../store/useMessageStore';
import useAuthStore from '../store/useAuthStore';

/**
 * Global Presence WebSocket Hook
 * Connects to the presence WebSocket when the user is logged in
 * This tracks site-level presence, not component-level
 */
const usePresenceWebSocket = () => {
    const wsRef = useRef(null);

    useEffect(() => {
        const token = useAuthStore.getState().getToken();
        if (!token) return;

        // Convert HTTP API URL to WebSocket URL
        const wsProtocol = import.meta.env.VITE_API_URL.startsWith('https') ? 'wss' : 'ws';
        const wsHost = import.meta.env.VITE_API_URL.replace(/^https?:\/\//, '');
        const presenceWsUrl = `${wsProtocol}://${wsHost}/presence/ws?token=${token}`;

        console.log('[Presence] Connecting to:', presenceWsUrl);

        const websocket = new WebSocket(presenceWsUrl);

        websocket.onopen = () => {
            console.log('[Presence] Connected - User is now online');
        };

        websocket.onclose = () => {
            console.log('[Presence] Disconnected - User is now offline');
        };

        websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'new_message') {
                    // Global message notification received
                    const store = useMessageStore.getState();

                    // Increment unread count for friend
                    store.incrementUnreadCount(data.sender_id);

                    // Add to notification stack
                    store.addNotification({
                        senderId: data.sender_id,
                        senderUsername: data.sender_username,
                        timestamp: data.timestamp
                    });
                }
            } catch (e) {
                console.error('[Presence] Message handling error:', e);
            }
        };

        websocket.onerror = (error) => {
            // Silently fail if backend WebSocket is not available
            // console.error('[Presence] WebSocket error:', error);
        };

        wsRef.current = websocket;

        // Cleanup on unmount
        return () => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                console.log('[Presence] Closing connection');
                wsRef.current.close();
            }
        };
    }, []);

    return wsRef.current;
};

export default usePresenceWebSocket;

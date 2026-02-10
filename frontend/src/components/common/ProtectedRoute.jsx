import { Navigate } from 'react-router-dom';
import usePresenceWebSocket from '../../hooks/usePresenceWebSocket';
import MessageNotificationStack from './MessageNotificationStack';
import useAuthStore from '../../store/useAuthStore';

/**
 * 전역 인증 가드 컴포넌트
 * 토큰이 없으면 로그인 페이지로 강제 리다이렉트합니다.
 */
const ProtectedRoute = ({ children }) => {
    const token = useAuthStore(state => state.token);

    // Global presence WebSocket - keeps user online as long as they are on a protected page
    usePresenceWebSocket();

    if (!token) {
        // 토큰이 없으면 로그인으로
        return <Navigate to="/login" replace />;
    }

    // 토큰이 있으면 자식 컴포넌트(요청한 페이지) 렌더링
    return (
        <>
            {children}
            <MessageNotificationStack />
        </>
    );
};

export default ProtectedRoute;

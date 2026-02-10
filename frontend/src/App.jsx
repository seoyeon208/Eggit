import { BrowserRouter, Routes, Route } from 'react-router-dom';

import MainPage from './pages/MainPage';
import DeveloperTest from './pages/DeveloperTest/DeveloperTest';
import LoginPage from './pages/auth/LoginPage';
import AuthCallback from './pages/auth/AuthCallBack';
import BlogCreationPage from './pages/blog/BlogCreationPage';
import BlogPostingPage from './pages/blog/BlogPostingPage';
import AiDebugConsole from './pages/debug/AiDebugConsole';

// 보호 라우트
import ProtectedRoute from './components/common/ProtectedRoute';

// 전역 UI / 상태
import GlobalLoadingModal from './components/GlobalLoadingModal';
import { GenerationProvider } from './contexts/GenerationContext';
import ZoomGuardian from './components/common/ZoomGuardian';
import NotificationPopup from './components/common/NotificationPopup';
import GuestbookModal from './components/modals/GuestbookModal';
import EvolutionOverlay from './components/common/EvolutionOverlay';
import LevelUpOverlay from './components/common/LevelUpOverlay';
import useNotificationStore from './store/useNotificationStore';
import MobileOrientationBanner from './components/common/MobileOrientationBanner';

/**
 * 앱 루트 컴포넌트 - 라우팅 설정
 */
function App() {
  const { toast, modal, hideToast, hideModal } = useNotificationStore();

  return (
    <BrowserRouter>
      <GenerationProvider>

        {/* ===== 전역 UI 레이어 ===== */}
        <GlobalLoadingModal />
        <ZoomGuardian />
        <MobileOrientationBanner />

        <NotificationPopup
          toast={toast}
          modal={modal}
          onToastClose={hideToast}
          onModalClose={hideModal}
        />

        <EvolutionOverlay />
        <LevelUpOverlay />

        {/* 🔥 핵심: Guestbook는 페이지가 아니라 "전역 모달"로 유지 */}
        <GuestbookModal />

        {/* ===== 라우트 ===== */}
        <Routes>
          {/* 공개 라우트 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* 보호된 라우트 */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/friend/:username"
            element={
              <ProtectedRoute>
                <MainPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/test"
            element={
              <ProtectedRoute>
                <DeveloperTest />
              </ProtectedRoute>
            }
          />

          <Route
            path="/blog/create"
            element={
              <ProtectedRoute>
                <BlogCreationPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/blog/post"
            element={
              <ProtectedRoute>
                <BlogPostingPage />
              </ProtectedRoute>
            }
          />

          {/* AI 디버그 콘솔 */}
          <Route
            path="/debug"
            element={
              <ProtectedRoute>
                <AiDebugConsole />
              </ProtectedRoute>
            }
          />
        </Routes>

      </GenerationProvider>
    </BrowserRouter>
  );
}

export default App;

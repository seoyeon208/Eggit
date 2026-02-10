import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import useUserStore from '../store/useUserStore';
import useAuthStore from '../store/useAuthStore';
import useRefreshStore from '../store/useRefreshStore';

import LeftSidePanel from '../components/layout/LeftSidePanel';
import MainCenterPanel from '../components/layout/MainCenterPanel';
import RightSidePanel from '../components/layout/RightSidePanel';
import FriendHomeLoading from '../components/common/FriendHomeLoading';
import BlogActionsSection from '../components/left/BlogActionsSection';
import MainAvatarScene from '../components/center/MainAvatarScene';
import GiftInteractionLayer from '../components/center/GiftInteractionLayer';
import { Panel } from '../components/common/CommonUI';
import { LogOut, UserX, X } from 'lucide-react';
import TitleLogo from '../assets/images/TitleLogo.png';
import TutorialOverlay from '../components/common/TutorialOverlay';
import useTutorialStore from '../store/useTutorialStore';
import { getAnimalNameWithPrefix } from '../utils/avatarUtils';
import useNotificationStore from '../store/useNotificationStore';


// Dynamically import all avatar images
const avatarImages = import.meta.glob('../assets/images/**/*.png', { eager: true });

/**
 * MainPage
 * The core layout of the application consisting of three panels.
 * Optimized for both Personal Home and Friend's Home.
 */
const MainPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { username: targetUsername } = useParams();
    const { notify } = useNotificationStore();
    const { user, setUser } = useUserStore();
    const [isMe, setIsMe] = useState(true);
    const [targetUserId, setTargetUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(location.state?.showLoading || !!targetUsername);
    const [friendName, setFriendName] = useState('');
    const [isReturningHome, setIsReturningHome] = useState(false);
    const [isMobileLandscape, setIsMobileLandscape] = useState(false);
    const [isMobilePortrait, setIsMobilePortrait] = useState(false);

    // Banner persistence (initial check from localStorage)
    const [showMobileBanner, setShowMobileBanner] = useState(() => {
        return localStorage.getItem('hideMobileBanner') !== 'true';
    });

    // Avatar states for mobile view
    const [isOutside, setIsOutside] = useState(false);
    const [avatarData, setAvatarData] = useState(null);
    const [avatarSrc, setAvatarSrc] = useState(null);

    // Gift states
    const [giftStatus, setGiftStatus] = useState('none');
    const [showGiftModal, setShowGiftModal] = useState(false);
    const hasAutoOpenedGift = useRef(false);

    // Tutorial hooks
    const { startTutorial, isCompleted, setCompleted, startTutorialAtStep, isActive: isTutorialActive } = useTutorialStore();


    // Get avatar image from match_type
    const getAvatarImageSrc = (data) => {
        if (!data) return null;
        const stage = data.growth_stage ? data.growth_stage.toUpperCase() : 'EGG';
        const code = data.match_type || 'LAG';
        let pathKey = '';
        if (stage === 'EGG') pathKey = '../assets/images/egg/egg.png';
        else if (stage === 'MASTER') pathKey = '../assets/images/master/master.png';
        else if (stage === 'BABY' || stage === 'CHILD') pathKey = `../assets/images/child/${code}.png`;
        else if (stage === 'ADULT') pathKey = `../assets/images/adult/${code}.png`;
        else pathKey = '../assets/images/egg/egg.png';
        const mod = avatarImages[pathKey];
        return mod ? mod.default : null;
    };

    // Check for mobile mode
    useEffect(() => {
        const checkMobileMode = () => {
            const isMobile = window.innerWidth <= 1024;
            const isLandscape = window.innerWidth > window.innerHeight;
            setIsMobileLandscape(isMobile && isLandscape);
            setIsMobilePortrait(isMobile && !isLandscape);
        };

        checkMobileMode();
        window.addEventListener('resize', checkMobileMode);
        return () => window.removeEventListener('resize', checkMobileMode);
    }, []);

    const { avatarRefreshKey, questRefreshKey } = useRefreshStore();

    // 0. 선물 데이터 체크 함수 추출 (메인페이지 상태용)
    const checkGiftStatus = async () => {
        if (!isMe) return;
        try {
            const res = await apiClient.get('/gift/today');
            if (res.data.has_gift) {
                setGiftStatus(res.data.is_opened ? 'opened' : 'unopened');
            } else {
                setGiftStatus('none');
            }
        } catch (err) {
            console.error("MainPage Gift Check Failed:", err);
            setGiftStatus('none');
        }
    };

    // Load gift status (Only auto-open ONCE per session/mount)
    useEffect(() => {
        if (isMe && !hasAutoOpenedGift.current) {
            apiClient.get('/gift/today')
                .then(res => {
                    if (res.data.has_gift) {
                        setGiftStatus(res.data.is_opened ? 'opened' : 'unopened');
                        // Only auto-show if unopened AND we haven't shown it yet in this mount
                        // 💡 튜토리얼이 완료되지 않았거나 진행 중이면 선물을 자동으로 열지 않음
                        const currentIsActive = useTutorialStore.getState().isActive;
                        const currentIsCompleted = useTutorialStore.getState().isCompleted;

                        if (!res.data.is_opened && !hasAutoOpenedGift.current && !currentIsActive && currentIsCompleted) {
                            setShowGiftModal(true);
                            hasAutoOpenedGift.current = true;
                        } else if (res.data.is_opened) {
                            hasAutoOpenedGift.current = true;
                        }

                    } else {
                        setGiftStatus('none');
                    }
                })
                .catch(() => setGiftStatus('none'));
        }
    }, [isMe]);

    // Zustand 기반 갱신 트리거 구독 (모바일 뷰 및 전역 상태 동기화)
    const { setAvatar } = useUserStore();

    useEffect(() => {
        checkGiftStatus();

        // 모바일 뷰 및 전역 스토어용 아바타 데이터 갱신
        if (isMe) {
            apiClient.get('/avatar/me').then(res => {
                setAvatarData(res.data);
                setAvatar(res.data); // 전역 스토어 업데이트 (튜토리얼 이름 매칭용)
                setAvatarSrc(getAvatarImageSrc(res.data));
            }).catch(err => console.error("Avatar refresh failed:", err));
        }
    }, [questRefreshKey, avatarRefreshKey]);

    // 📌 친구 홈 방문 여부에 따라 Body 클래스 토글 (CSS 배경 변경용)
    useEffect(() => {
        if (!isMe) {
            document.body.classList.add('friends-home');
        } else {
            document.body.classList.remove('friends-home');
        }
        return () => document.body.classList.remove('friends-home');
    }, [isMe]);

    useEffect(() => {
        if (location.state?.showLoading && !targetUsername) {
            setIsLoading(true);
            setIsReturningHome(true);
        }

        if (targetUsername) {
            setIsLoading(true);
            setIsReturningHome(false);
        }

        apiClient.get('/users/me').then(async (res) => {
            const myUser = res.data;
            setUser(myUser);

            // 튜토리얼 완료 여부 동기화
            if (myUser.tutorial_completed) {
                setCompleted(true);
            } else if (isMe && !isCompleted && !targetUsername) {
                // 내 홈이고 튜토리얼 미완료시 시작 (이미 활성화된 상태면 건너뜀)
                if (!useTutorialStore.getState().isActive) {
                    startTutorial('main');
                }
            }

            if (!targetUsername || targetUsername === myUser.username) {
                if (!isMe && targetUserId) {
                    setIsReturningHome(true);
                    setIsLoading(true);
                }
                setIsMe(true);
                setTargetUserId(myUser.id);
                const shouldShowLoading = isLoading || location.state?.showLoading;

                if (shouldShowLoading) {
                    setIsLoading(false);
                    setIsReturningHome(false);
                    window.history.replaceState({}, '');
                } else {
                    setIsLoading(false);
                }

                // Load avatar for mobile view
                try {
                    const avatarRes = await apiClient.get('/avatar/me');
                    setAvatarData(avatarRes.data);
                    const imageSrc = getAvatarImageSrc(avatarRes.data);
                    setAvatarSrc(imageSrc);
                } catch (err) {
                    console.error('Failed to load avatar:', err);
                }
            } else {
                setIsMe(false);
                try {
                    const userRes = await apiClient.get(`/users/by-username/${targetUsername}`);
                    const targetUser = userRes.data;
                    setTargetUserId(targetUser.id);
                    setFriendName(targetUser.username);

                    apiClient.post(`/friends/${targetUser.id}/visit`, {})
                        .catch(err => console.error("방문 기록 실패:", err));

                    setIsLoading(false);
                } catch (err) {
                    console.error("친구 정보 로드 실패:", err);
                    setIsLoading(false);
                }
            }
        }).catch((err) => {
            console.error("사용자 정보 로드 실패:", err);
            useAuthStore.getState().logout();
            navigate("/login", { replace: true });
        });
    }, [navigate, setUser, targetUsername]);

    const handleLogout = () => {
        useAuthStore.getState().logout();
        navigate('/login');
    };

    const handleDeleteAccount = async () => {
        if (window.confirm('정말로 회원 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            try {
                await apiClient.delete('/users/me');
                useAuthStore.getState().logout();
                navigate('/login');
            } catch (err) {
                console.error('회원 탈퇴 실패:', err);
                notify('회원 탈퇴에 실패했습니다.', 'error');
            }
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return <FriendHomeLoading friendName={friendName} isReturningHome={isReturningHome} />;
        }

        // Mobile Portrait Mode - Simplified vertical view
        if (isMobilePortrait && isMe) {
            return (
                <div className="h-screen flex flex-col font-sans text-gray-900 bg-gray-50 overflow-hidden">
                    <header className="flex-shrink-0 bg-white p-4 border-b border-gray-100 flex justify-center items-center relative">
                        <img src={TitleLogo} alt="Eggit Logo" className="w-32 h-auto" />
                    </header>
                    <main className="flex-1 overflow-y-auto custom-scrollbar p-0 space-y-4">
                        {/* Hero Section: Avatar & Stats */}
                        <div className="bg-white p-6 pb-8 rounded-b-[40px] shadow-sm">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-md">
                                    <img src={`https://github.com/${user?.username}.png`} alt="profile" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-black text-gray-800">{user?.username || 'GUEST'}</h1>
                                    <p className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
                                        Lv.{avatarData?.level || 1} {getAnimalNameWithPrefix(avatarData?.match_type, avatarData?.growth_stage)}
                                    </p>
                                </div>
                            </div>

                            <div className="relative aspect-square w-full max-w-[320px] mx-auto bg-gray-50 rounded-3xl shadow-inner overflow-hidden">
                                <MainAvatarScene
                                    isMe={isMe}
                                    isOutside={isOutside}
                                    setIsOutside={setIsOutside}
                                    avatarData={avatarData}
                                    needsTest={false}
                                    currentQuote={null}
                                    avatarSrc={avatarSrc}
                                    deployStatus="idle"
                                    navigate={navigate}
                                    showLogo={false}
                                />
                                {/* Mobile Gift Positioning */}
                                <GiftInteractionLayer
                                    isMe={isMe}
                                    giftStatus={giftStatus}
                                    showGiftModal={showGiftModal}
                                    setShowGiftModal={setShowGiftModal}
                                    setGiftStatus={setGiftStatus}
                                    customPosition="right-2 bottom-2"
                                />
                            </div>
                        </div>

                        {/* Actions Panel */}
                        <div className="px-4 pb-12">
                            <Panel className="w-full">
                                <div className="p-2">
                                    <BlogActionsSection
                                        isMe={isMe}
                                        needsHome={false}
                                        onNavigate={navigate}
                                        onVisitBlog={() => user?.username && window.open(`https://${user.username}.github.io`, '_blank')}
                                        hasBlog={true}
                                    />
                                </div>
                            </Panel>

                            {/* Logout for mobile */}
                            <button
                                onClick={handleLogout}
                                className="w-full mt-6 p-4 bg-white border-2 border-red-50 text-red-400 rounded-2xl font-bold flex items-center justify-center gap-2"
                            >
                                <LogOut size={18} /> 로그아웃
                            </button>
                        </div>
                    </main>
                </div>
            );
        }

        // Mobile Landscape Mode - Simplified View
        if (isMobileLandscape && isMe) {
            return (
                <div className="h-screen flex flex-col font-sans text-gray-900 overflow-hidden">
                    <main className="flex-1 w-full p-4 overflow-hidden">
                        <div className="grid grid-cols-2 gap-4 h-full">
                            {/* Left: Blog Actions with Logo above */}
                            <div className="flex flex-col gap-1 h-full">
                                <div className="flex-shrink-0 flex justify-center">
                                    <img src={TitleLogo} alt="Eggit Logo" className="w-48 h-auto drop-shadow-sm opacity-90" />
                                </div>
                                <div className="flex-1 flex flex-col justify-center min-h-0">
                                    <Panel className="w-full">
                                        <BlogActionsSection
                                            isMe={isMe}
                                            needsHome={false}
                                            onNavigate={navigate}
                                            onVisitBlog={() => user?.username && window.open(`https://${user.username}.github.io`, '_blank')}
                                            hasBlog={true}
                                        />
                                    </Panel>
                                </div>
                            </div>

                            {/* Right: Avatar + Gift + Account Actions */}
                            <div className="flex flex-col h-full relative">
                                {/* Avatar Scene (No Logo, No Toggle) */}
                                <div className="flex-1 relative">
                                    <MainAvatarScene
                                        isMe={isMe}
                                        isOutside={isOutside}
                                        setIsOutside={setIsOutside}
                                        avatarData={avatarData}
                                        needsTest={false}
                                        currentQuote={null}
                                        avatarSrc={avatarSrc}
                                        deployStatus="idle"
                                        navigate={navigate}
                                        showLogo={false}
                                        showToggle={false}
                                    />
                                    {/* Gift Button Layer (Aligned to right edge) */}
                                    {!isTutorialActive && (
                                        <GiftInteractionLayer
                                            isMe={isMe}
                                            giftStatus={giftStatus}
                                            showGiftModal={showGiftModal}
                                            setShowGiftModal={setShowGiftModal}
                                            setGiftStatus={setGiftStatus}
                                            customPosition="right-4"
                                        />
                                    )}

                                </div>

                                {/* Account Actions */}
                                <div className="flex gap-3 p-4">
                                    <button
                                        onClick={handleLogout}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 hover:bg-gray-50 rounded-xl font-bold transition-all shadow-sm active:scale-95"
                                    >
                                        <LogOut size={18} className="text-gray-500" />
                                        <span className="text-sm text-gray-700">로그아웃</span>
                                    </button>
                                    <button
                                        onClick={handleDeleteAccount}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 border-2 border-red-100 hover:bg-red-100 text-red-600 rounded-xl font-bold transition-all shadow-sm active:scale-95"
                                    >
                                        <UserX size={18} />
                                        <span className="text-sm">회원 탈퇴</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            );
        }

        // Desktop/Normal View
        return (
            <div className="h-screen flex flex-col font-sans text-gray-900 overflow-hidden">
                <main className="flex-1 w-full p-4 overflow-hidden">
                    <div className="grid grid-cols-12 gap-6 h-full items-stretch pb-2">
                        <div className="col-span-3 h-full overflow-hidden">
                            <LeftSidePanel isMe={isMe} targetUserId={targetUserId} />
                        </div>
                        <div className="col-span-6 h-full overflow-hidden">
                            <MainCenterPanel isMe={isMe} targetUserId={targetUserId} />
                        </div>
                        <div className="col-span-3 h-full overflow-hidden relative z-50">
                            <RightSidePanel isMe={isMe} targetUserId={targetUserId} />
                        </div>
                    </div>
                </main>
            </div>
        );
    };

    return (
        <>
            {renderContent()}

            {/* Tutorial Overlay */}
            {isMe && !targetUsername && (
                <TutorialOverlay
                    page="main"
                />
            )}
        </>
    );
};

export default MainPage;

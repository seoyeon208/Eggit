import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useMessageStore from '../../store/useMessageStore';
import useNotificationStore from '../../store/useNotificationStore';
import useGuestbookStore from '../../store/useGuestbookStore';
import useRefreshStore from '../../store/useRefreshStore';
import apiClient from '../../utils/apiClient';

// Sub-components
import RightSideQuests from '../right/RightSideQuests';
import RightSideDashboard from '../right/RightSideDashboard';
import RightSideToolbar from '../right/RightSideToolbar';
import { Panel } from '../common/CommonUI';

const RightSidePanel = ({ isMe = true, targetUserId = null }) => {
    const navigate = useNavigate();
    const { notify, confirm } = useNotificationStore();
    const { questRefreshKey, avatarRefreshKey, refreshAvatar } = useRefreshStore();
    const { open: openGuestbook } = useGuestbookStore();
    const sidebarRef = useRef(null);

    // [State] 데이터 상태 관리
    const [quests, setQuests] = useState([]);
    const [analytics, setAnalytics] = useState({
        totalCommits: 0, totalPrs: 0, totalStars: 0,
        todayVisitors: 0, totalVisitors: 0, weeklyVisitors: 0,
        techStack: [],
        totalPosts: 0
    });

    const [activeTab, setActiveTab] = useState(null);
    const [blogUrl, setBlogUrl] = useState('');

    // [State] 중복 클릭 방지용 상태 (처리 중인 퀘스트 ID 목록)
    const [claimingIds, setClaimingIds] = useState(new Set());
    // [State] 새로 채워진 주간 출석 인덱스 (반짝임 효과용)
    const [newlyFilledIdx, setNewlyFilledIdx] = useState(-1);
    const [lastWeeklyCount, setLastWeeklyCount] = useState(-1);

    const logout = useAuthStore((state) => state.logout);
    const { totalUnread = 0 } = useMessageStore();

    // [API] 데이터 로드
    const loadData = useCallback(async () => {
        try {
            // [Important] 퀘스트는 방문 여부와 상관없이 항상 '내 것'을 보여주어야 실시간 진행도가 보임
            const questUrl = '/quests/'; // 내 퀘스트
            // 대시보드는 방문 중인 경우 해당 유저의 것을 보여줌 (친구의 방문자 수 등)
            const dashboardUrl = targetUserId ? `/dashboard/summary?user_id=${targetUserId}` : '/dashboard/summary';

            console.log(`[RightSidePanel] Fetching quests (me) and dashboard (${targetUserId || 'me'})`);

            const [questsRes, dashboardRes] = await Promise.all([
                apiClient.get(questUrl),
                apiClient.get(dashboardUrl)
            ]);

            if (Array.isArray(questsRes.data)) {
                setQuests(questsRes.data);

                // 주간 출석 카운트 변화 감지
                const weeklyQuest = questsRes.data.find(q => q.type === 'WEEKLY' && q.text?.includes('5 days'));
                if (weeklyQuest) {
                    const currentCount = weeklyQuest.weekly_checkin_count || 0;
                    // lastWeeklyCount를 ref로 관리하거나 여기서 직접 이전 상태와 비교
                    setLastWeeklyCount(prev => {
                        if (prev !== -1 && currentCount > prev) {
                            setNewlyFilledIdx(currentCount - 1);
                            setTimeout(() => setNewlyFilledIdx(-1), 2000);
                        }
                        return currentCount;
                    });
                }
            }

            const data = dashboardRes.data || {};
            setAnalytics({
                totalCommits: data.github_stats?.total_commits || 0,
                totalPrs: data.github_stats?.total_prs || 0,
                totalStars: data.github_stats?.total_stars || 0,
                todayVisitors: data.today_visitors || 0,
                totalVisitors: data.total_visitors || 0,
                weeklyVisitors: data.weekly_visitors || 0,
                techStack: data.tech_stack || [],
                totalPosts: data.weekly_post_count || 0
            });

            const savedBlog = localStorage.getItem('representative_blog_url');
            if (savedBlog) setBlogUrl(savedBlog);

        } catch (err) {
            console.error("데이터 로드 실패:", err);
        }
    }, [targetUserId]); // targetUserId가 바뀔 때만 (친구 홈 이동 시) 재생성

    useEffect(() => {
        loadData();
    }, [loadData, questRefreshKey, avatarRefreshKey]); // Zustand 갱신키 감지 시 데이터 로드

    // [Event] 사이드바 외부 클릭 감지
    useEffect(() => {
        const handleClickOutside = (event) => {
            // 💡 튜토리얼 오버레이나 버튼을 누른 경우 사이드바가 닫히지 않게 보호
            if (event.target.closest('.tutorial-overlay-ignore')) return;
            if (event.target.closest('.tutorial-tooltip-container')) return; // 툴팁 영역 보호

            if (activeTab && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                setActiveTab(null);
            }
        };

        if (activeTab) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeTab]);


    const handleLogout = async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch (err) {
            console.error('Logout API failed:', err);
        } finally {
            logout();
            navigate('/login');
        }
    };

    const handleDeleteAccount = async () => {
        confirm('정말로 탈퇴하시겠습니까? \n 모든 데이터가 삭제되며 복구할 수 없습니다.', async () => {
            try {
                await apiClient.delete('/users/me');
                notify('회원 탈퇴가 완료되었습니다.', 'success');
                setTimeout(() => {
                    logout();
                    navigate('/login');
                }, 1500);
            } catch (err) {
                console.error('Account deletion failed:', err);
                notify('탈퇴 처리 중 오류가 발생했습니다.', 'error');
            }
        }, "탈퇴", "delete");
    };

    const handleSaveBlogUrl = () => {
        if (!blogUrl.trim()) return;
        localStorage.setItem('representative_blog_url', blogUrl);
        notify('대표 블로그가 설정되었습니다!', 'success');
    };

    // [Effect] 파티클 생성 함수
    const createExpParticles = (buttonElement, expGained) => {
        let startX, startY;

        if (buttonElement) {
            const buttonRect = buttonElement.getBoundingClientRect();
            startX = buttonRect.left + buttonRect.width / 2;
            startY = buttonRect.top + buttonRect.height / 2;
        } else {
            startX = window.innerWidth * 0.8;
            startY = window.innerHeight * 0.5;
        }

        const expBar = document.getElementById('exp-bar-container');
        let targetX = 150, targetY = 150;

        if (expBar) {
            const expBarRect = expBar.getBoundingClientRect();
            targetX = expBarRect.left + expBarRect.width / 2;
            targetY = expBarRect.top + expBarRect.height / 2;
        }

        const particleCount = Math.max(3, Math.min(Math.floor(expGained / 2), 15));
        const emojis = ['✦', '✧', '✨', '✴', '✳'];

        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.innerHTML = `<span class="particle-inner">${emojis[Math.floor(Math.random() * emojis.length)]}</span>`;
                particle.style.cssText = `
                    left: ${startX}px;
                    top: ${startY}px;
                    --tx: ${targetX - startX + (Math.random() - 0.5) * 60}px;
                    --ty: ${targetY - startY + (Math.random() - 0.5) * 30}px;
                `;
                document.body.appendChild(particle);
                setTimeout(() => particle.remove(), 2200);
            }, i * 60);
        }
    };

    const toggleTab = (id) => setActiveTab(current => current === id ? null : id);

    useEffect(() => {
        const handleOpenChat = () => setActiveTab('chat');
        window.addEventListener('openChat', handleOpenChat);
        return () => window.removeEventListener('openChat', handleOpenChat);
    }, []);

    const handleClaimReward = async (questId, event) => {
        if (!isMe) return;
        if (claimingIds.has(questId)) return;

        if (event) {
            event.stopPropagation();
            event.persist();
        }

        const buttonEl = event?.currentTarget;
        setClaimingIds(prev => new Set(prev).add(questId));

        try {
            const res = await apiClient.post(`/quests/claim/${questId}`);

            if (res.data.success) {
                createExpParticles(buttonEl, res.data.exp_gained);
                notify(`보상 수령 완료! +${res.data.exp_gained} XP`, 'success');

                setQuests(prevQuests =>
                    prevQuests.map(q =>
                        q.id === questId ? { ...q, status: 'CLAIMED' } : q
                    )
                );

                // Zustand 스토어를 통한 아바타 갱신
                refreshAvatar();
            } else {
                if (res.data.message.includes("이미")) {
                    setQuests(prevQuests =>
                        prevQuests.map(q =>
                            q.id === questId ? { ...q, status: 'CLAIMED' } : q
                        )
                    );
                }
                notify(res.data.message, 'info');
            }
        } catch (err) {
            console.error("보상 수령 실패:", err);
            const msg = err.response?.data?.detail || '보상 수령에 실패했습니다.';
            notify(msg, 'error');
        } finally {
            setClaimingIds(prev => {
                const next = new Set(prev);
                next.delete(questId);
                return next;
            });
        }
    };

    return (
        <div className="h-full flex flex-col space-y-3 pr-1 relative">
            <RightSideDashboard
                analytics={analytics}
                isMe={isMe}
                onOpenGuestbook={openGuestbook}
            />

            {/* Quest Panel */}
            <Panel className="flex-1 min-h-0 quest-panel">
                <RightSideQuests
                    quests={quests}
                    isMe={isMe}
                    claimingIds={claimingIds}
                    onClaimReward={handleClaimReward}
                />
            </Panel>

            <RightSideToolbar
                activeTab={activeTab}
                toggleTab={toggleTab}
                totalUnread={totalUnread}
                isMe={isMe}
                blogUrl={blogUrl}
                setBlogUrl={setBlogUrl}
                handleSaveBlogUrl={handleSaveBlogUrl}
                handleLogout={handleLogout}
                handleDeleteAccount={handleDeleteAccount}
                sidebarRef={sidebarRef}
            />
        </div>
    );
};

export default RightSidePanel;

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import { Panel } from '../common/CommonUI';
import useUserStore from '../../store/useUserStore';
import useNotificationStore from '../../store/useNotificationStore';
import useDeploymentStore from '../../store/useDeploymentStore';
import useRefreshStore from '../../store/useRefreshStore';
import { useGeneration } from '../../contexts/GenerationContext';
import useTutorialStore from '../../store/useTutorialStore';


// Sub-components
import GiftInteractionLayer from '../center/GiftInteractionLayer';
import MainAvatarScene from '../center/MainAvatarScene';
import SystemLogsPanel from '../center/SystemLogsPanel';
import HelpModal from '../common/HelpModal';

// Dynamically import all avatar images
const avatarImages = import.meta.glob('../../assets/images/**/*.png', { eager: true });

const avatarQuotes = [
    "오늘도 열심히 코딩해볼까?",
    "새로운 커밋이 필요해!",
    "둥지가 포근해서 좋아~",
    "블로그 글 쓰기 좋은 날씨네!",
    "에그머니나! 벌써 시간이?!",
    "커밋 한 번에 행복 한 번!"
];

const MainCenterPanel = ({ isMe = true, targetUserId = null }) => {
    const navigate = useNavigate();
    const { user: currentUser } = useUserStore();
    const { notify, confirm, evolution } = useNotificationStore();
    const { deployStatus, deployMessage, resultUrl, resetStatus, setDeployStatus } = useDeploymentStore();
    const { avatarRefreshKey, questRefreshKey, refreshQuest } = useRefreshStore();
    const { tasks } = useGeneration(); // AI 작업 상태 가져오기
    const { isActive: isTutorialActive } = useTutorialStore();


    const [avatarData, setAvatarData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chatLogs, setChatLogs] = useState([]);
    const [chatMinimized, setChatMinimized] = useState(false);
    const [chatHeight, setChatHeight] = useState(140);
    const [isDragging, setIsDragging] = useState(false);
    const chatPanelRef = useRef(null);
    const [currentQuote, setCurrentQuote] = useState("");
    const [needsTest, setNeedsTest] = useState(false);
    const [guestbookText, setGuestbookText] = useState("");
    const [isOutside, setIsOutside] = useState(false);

    // [Gift State]
    const [giftStatus, setGiftStatus] = useState('none'); // 'none' | 'unopened' | 'opened'
    const [showGiftModal, setShowGiftModal] = useState(false);

    // [Help Modal State]
    const [showHelpModal, setShowHelpModal] = useState(false);
    // 0. 선물 데이터 체크 함수 추출
    const checkGift = async () => {
        if (!isMe) return;
        try {
            const res = await apiClient.get('/gift/today');
            if (res.data.has_gift) {
                setGiftStatus(res.data.is_opened ? 'opened' : 'unopened');
            } else {
                setGiftStatus('none');
            }
        } catch (err) {
            console.error("Gift Check Failed:", err);
        }
    };

    // 1. 초기 선물 체크
    useEffect(() => {
        checkGift();
    }, [isMe]);

    // 2. AI 작업 상태 감지 및 Deployment Store 동기화
    // 2. AI 작업 상태 감지 및 Deployment Store 동기화 (다중 작업 지원)
    const prevTasksRef = useRef({});

    useEffect(() => {
        if (!isMe || !tasks) return;

        Object.entries(tasks).forEach(([taskId, task]) => {
            const prevTask = prevTasksRef.current[taskId];
            const currentStatus = task.status;
            const prevStatus = prevTask?.status;

            if (currentStatus === prevStatus) return;

            const taskType = task.type || task.requestPayload?.template_type || '';
            const isTech = taskType.includes('tech_blog') || (task.requestPayload?.template_type === 'tech_blog');
            const targetTab = isTech ? 'tech' : 'docs';
            const logId = `task-${taskId}-${currentStatus}-${Date.now()}`;
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            let newLog = null;

            if (currentStatus === 'processing' && prevStatus !== 'processing') {
                const msg = isTech
                    ? "🤖 AI가 기술 블로그 글을 작성하고 있어요... ✍️"
                    : "📚 AI가 문서 사이트 내용을 생성하고 있어요... 🔨";

                newLog = { id: logId, type: 'info', text: msg, timestamp: timeStr };
                setDeployStatus('loading', msg, null, null);

            } else if (currentStatus === 'success' && prevStatus !== 'success') {
                // 블로그 생성/포스팅 모두 커버하기 위해 포괄적인 메시지 사용 + 배포 지연 안내
                const msg = isTech
                    ? "✨ 작업 완료! 🎉\n(GitHub 배포: 약 1~5분 소요)"
                    : "✨ 문서 작업 완료! 📖\n(GitHub 배포: 약 1~5분 소요)";

                const linkUrl = `/blog/post?tab=${targetTab}`;
                const payload = task.requestPayload || {};

                // [Important] 네비게이션 시 전달할 state 데이터 포함 (설정 복원용)
                newLog = {
                    id: logId, type: 'complete', text: msg, timestamp: timeStr,
                    link: linkUrl,
                    navState: {
                        restoreId: taskId,
                        aiResult: task.result,
                        taskType,
                        activeTab: targetTab,
                        blogRepo: payload.blog_repo || payload.source_repo,
                        sourceRepo: payload.source_repo,
                        category: payload.selected_category
                    }
                };
                setDeployStatus('success', msg, null, linkUrl);

            } else if (currentStatus === 'failure' && prevStatus !== 'failure') {
                const msg = "❌ AI 작업 중 문제가 발생했습니다.";
                newLog = { id: logId, type: 'error', text: msg, timestamp: timeStr };
                setDeployStatus('error', msg, null, null);
            }

            if (newLog) {
                setChatLogs(prev => [...prev.slice(-19), newLog]);
            }
        });

        // 상태 스냅샷 갱신
        prevTasksRef.current = tasks;
    }, [tasks, isMe, setDeployStatus]);

    // 3. Deployment Status & Chat Logs
    useEffect(() => {
        if (!deployStatus || deployStatus === 'idle') return;

        // 채팅 로그에만 추가 (말풍선은 MainAvatarScene에서 deployMessage로 직접 처리)
        const newLog = {
            id: `sys-${Date.now()}`,
            type: deployStatus === 'success' ? 'complete' : deployStatus === 'error' ? 'error' : 'greeting',
            text: `📢 ${deployMessage}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatLogs(prev => [...prev.slice(-19), newLog]);

        // 작업 완료/실패 시 일정 시간 후 초기화
        if (deployStatus === 'success' || deployStatus === 'error') {
            const timer = setTimeout(() => {
                resetStatus();
                // 초기화 후 랜덤 대사 설정
                if (isMe) {
                    const randomQuote = avatarQuotes[Math.floor(Math.random() * avatarQuotes.length)];
                    setCurrentQuote(randomQuote);
                } else {
                    setCurrentQuote("");
                }
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [deployStatus, deployMessage, resetStatus, isMe]);

    // 3. Avatar Load
    const loadAvatar = () => {
        const url = isMe ? '/avatar/me' : `/avatar/user/${targetUserId}`;

        apiClient.get(url)
            .then(res => {
                const stage = res.data.growth_stage?.toUpperCase();
                const matchType = res.data.match_type;

                console.log("[Debug] Avatar Load Success:", {
                    stage,
                    matchType,
                    level: res.data.level,
                    isMe
                });

                setAvatarData(res.data);

                // 🛠️ 로직 수정: 
                // 1. match_type이 아예 없으면 -> 성향 검사부터 (needsTest = true)
                // 2. level 1(EGG)인데 match_type이 있으면 -> 알 깨기부터 (needsTest = true)
                // 3. 그 외 (level >= 2) -> 알 깨기 불필요 (needsTest = false)
                if (isMe && (!matchType || stage === 'EGG' || res.data.level === 1)) {
                    setNeedsTest(true);
                } else {
                    setNeedsTest(false);
                }
                setLoading(false);
            })

            .catch(err => {
                console.error('Avatar API Error:', err);
                if (isMe) {
                    setAvatarData({ growth_stage: 'EGG', level: 1, exp: 0, max_exp: 10 });
                    setNeedsTest(true);
                }
                setLoading(false);
            });

    };

    const loadGuestbookLogs = async () => {
        if (isMe || !targetUserId) return;
        try {
            const res = await apiClient.get(`/guestbook/${targetUserId}`);
            const logs = res.data.map(msg => ({
                id: `guest-${msg.id}`, dbId: msg.id, type: 'guestbook', authorId: msg.author_id,
                authorName: msg.author_name,
                text: `${msg.author_name}: ${msg.content}`,
                timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                rawTimestamp: new Date(msg.created_at).getTime(),
                isPinned: msg.is_pinned === 1
            }));

            // Sort: Normal messages by time, then Pinned messages at the very bottom
            // This places pinned messages right above the "Write" input field.
            const sortedLogs = logs.sort((a, b) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? 1 : -1;
                return a.rawTimestamp - b.rawTimestamp;
            });
            setChatLogs(sortedLogs.slice(-50));
        } catch (err) { console.error("방명록 로드 실패:", err); }
    };

    // [Init] 챗 로그 초기화 및 로드
    const hasInitialized = useRef(false);
    useEffect(() => {
        loadAvatar();

        // 초기 1회 또는 대상 사용자가 바뀔 때만 초기화
        if (!hasInitialized.current || targetUserId) {
            if (isMe) {
                setChatLogs([]); // 자동 인사말 제거 및 빈 기록으로 시작
            } else {
                loadGuestbookLogs();
            }
            hasInitialized.current = true;
        }

    }, [isMe, targetUserId]);

    // Zustand 기반 갱신 트리거 구독 (avatarRefreshKey, questRefreshKey 변화 감지)
    useEffect(() => {
        loadAvatar();
        if (!isMe) loadGuestbookLogs();
        checkGift(); // 퀘스트 완료 시 선물 상자가 생길 수 있으므로 체크
    }, [avatarRefreshKey, questRefreshKey]);

    // Random quote sync
    useEffect(() => {
        if (!isMe) { setCurrentQuote(""); return; }
        if (deployStatus !== 'idle') return;

        const randomQuote = avatarQuotes[Math.floor(Math.random() * avatarQuotes.length)];

        // 말풍선 대사만 업데이트 (채팅 로그 기록 기능 제거)
        setCurrentQuote(randomQuote);
    }, [isMe, deployStatus]);

    const handleWriteGuestbook = async (e) => {
        e.preventDefault();
        const tid = targetUserId;
        if (!guestbookText.trim() || !tid) return;
        try {
            await apiClient.post('/guestbook', { owner_id: parseInt(tid), content: guestbookText });
            notify("방명록을 남겼습니다! ✨", "success");
            setGuestbookText("");
            loadGuestbookLogs();
            // Zustand 스토어를 통한 퀘스트 갱신
            refreshQuest();
        } catch (err) {
            console.error("방명록 작성 실패:", err);
            notify(`작성 실패: ${err.response?.data?.detail || "오류 발생"}`, "error");
        }
    };

    const handleDeleteGuestbook = async (dbId) => {
        confirm("방명록을 삭제하시겠습니까?", async () => {
            try {
                await apiClient.delete(`/guestbook/${dbId}`);
                notify("방명록이 삭제되었습니다.", "success");
                loadGuestbookLogs();
            } catch (err) {
                console.error("방명록 삭제 실패:", err);
                notify("삭제 실패했습니다.", "error");
            }
        }, "삭제", "delete");
    };

    const getAvatarSrc = (data) => {
        if (!data) return null;
        let stage = data.growth_stage ? data.growth_stage.toUpperCase() : 'EGG';
        if (isMe && evolution.show && evolution.animStage !== 'result') {
            stage = 'CHILD';
        }
        const code = data.match_type || 'LAG';
        let pathKey = '';
        if (stage === 'EGG') pathKey = '../../assets/images/egg/egg.png';
        else if (stage === 'MASTER') pathKey = '../../assets/images/master/master.png';
        else if (stage === 'BABY' || stage === 'CHILD') pathKey = `../../assets/images/child/${code}.png`;
        else if (stage === 'ADULT') pathKey = `../../assets/images/adult/${code}.png`;
        else pathKey = '../../assets/images/egg/egg.png';
        const mod = avatarImages[pathKey];
        return mod ? mod.default : null;
    };

    const handleMouseDown = (e) => { e.preventDefault(); setIsDragging(true); };
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging || !chatPanelRef.current) return;
            const panel = chatPanelRef.current.parentElement;
            const panelRect = panel.getBoundingClientRect();
            const maxHeight = panelRect.height * 0.3;
            const mouseY = e.clientY;
            const panelBottom = panelRect.bottom - 16;
            const newHeight = panelBottom - mouseY;
            if (newHeight >= 48 && newHeight <= maxHeight) {
                setChatHeight(newHeight);
                if (newHeight <= 80) setChatMinimized(true);
                else if (chatMinimized) setChatMinimized(false);
            }
        };
        const handleMouseUp = () => setIsDragging(false);
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, chatMinimized]);

    if (loading) return <Panel className="h-full"><div className="h-full flex items-center justify-center">Loading...</div></Panel>;

    return (
        <Panel className="h-full relative overflow-hidden">
            {/* Help Button - 좌측 상단 */}
            <button
                onClick={() => setShowHelpModal(true)}
                className="absolute top-4 left-4 z-50 w-14 h-14 bg-white/50 backdrop-blur-xl border-2 border-white rounded-2xl flex items-center justify-center cursor-pointer hover:bg-white/60 hover:scale-105 active:scale-95 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.15)] group"
                title="사용 가이드"
                aria-label="사용 가이드 열기"
            >
                <span className="text-red-500 font-black text-2xl group-hover:scale-110 transition-transform">?</span>
            </button>

            {/* Help Modal */}
            <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />

            {/* 튜토리얼 중에는 선물 상자 상호작용 레이어를 숨김 */}
            {!isTutorialActive && (
                <GiftInteractionLayer
                    isMe={isMe}
                    giftStatus={giftStatus}
                    showGiftModal={showGiftModal}
                    setShowGiftModal={setShowGiftModal}
                    setGiftStatus={setGiftStatus}
                />
            )}


            <MainAvatarScene
                isMe={isMe}
                isOutside={isOutside}
                setIsOutside={setIsOutside}
                avatarData={avatarData}
                needsTest={needsTest}
                currentQuote={currentQuote}
                avatarSrc={getAvatarSrc(avatarData)}
                deployStatus={deployStatus}
                deployMessage={deployMessage}
                navigate={navigate}
            />

            <SystemLogsPanel
                chatPanelRef={chatPanelRef}
                chatMinimized={chatMinimized}
                setChatMinimized={setChatMinimized}
                chatHeight={chatHeight}
                isDragging={isDragging}
                handleMouseDown={handleMouseDown}
                chatLogs={chatLogs}
                isMe={isMe}
                currentUser={currentUser}
                handleDeleteGuestbook={handleDeleteGuestbook}
                guestbookText={guestbookText}
                setGuestbookText={setGuestbookText}
                handleWriteGuestbook={handleWriteGuestbook}
                deployStatus={deployStatus}
                resultUrl={resultUrl}
            />
        </Panel>
    );
};

export default MainCenterPanel;

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, ArrowLeft, ExternalLink } from 'lucide-react';
import useUserStore from '../../store/useUserStore';
import useNotificationStore from '../../store/useNotificationStore';
import useRefreshStore from '../../store/useRefreshStore';
import { Panel } from '../common/CommonUI';
import BlogCalendar from '../left/BlogCalendar';
import apiClient from '../../utils/apiClient';

// Sub-components
import UserProfileSection from '../left/UserProfileSection';
import BlogActionsSection from '../left/BlogActionsSection';
import { getAnimalNameWithPrefix, animalNames } from '../../utils/avatarUtils';

// Dynamically import all avatar images
const avatarImages = import.meta.glob('../../assets/images/**/*.png', { eager: true });

// 💡 동물이름 매핑 (유틸리티와 동기화됨)
const animalNamesMap = {
    "LAG": "토끼", "LAS": "햄스터", "LBG": "고양이", "LBS": "다람쥐",
    "VAG": "강아지", "VAS": "여우", "VBG": "펭귄", "VBS": "라쿤"
};

const LeftSidePanel = ({ isMe = true, targetUserId = null }) => {
    const navigate = useNavigate();
    const { user: currentUser } = useUserStore();
    const { avatarRefreshKey } = useRefreshStore();
    const [targetUser, setTargetUser] = useState(null);
    const [hasBlog, setHasBlog] = useState(false);
    const [avatarData, setAvatarData] = useState(null);
    const [isCharging, setIsCharging] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    // 플립 카드 상태
    const [isFlipped, setIsFlipped] = useState(false);
    const [blogs, setBlogs] = useState([]);
    const [loadingBlogs, setLoadingBlogs] = useState(false);

    const { evolution, showEvolution, showLevelUp } = useNotificationStore();
    const prevLevelRef = useRef(null);
    const prevExpRef = useRef(null);
    const prevStageRef = useRef(null);

    const getAvatarImageSrc = (data) => {
        if (!data) return null;
        let stage = data.growth_stage ? data.growth_stage.toUpperCase() : 'EGG';
        if (isMe && evolution.show && evolution.animStage !== 'result') stage = 'CHILD';
        const code = data.match_type || 'LAG';
        let pathKey = '';
        if (stage === 'EGG') pathKey = '../../assets/images/egg/egg.png';
        else if (stage === 'CHILD') pathKey = `../../assets/images/child/${code}.png`;
        else if (stage === 'ADULT') pathKey = `../../assets/images/adult/${code}.png`;
        else if (stage === 'MASTER') pathKey = `../../assets/images/master/master.png`;
        return avatarImages[pathKey]?.default || null;
    };

    useEffect(() => {
        const effectiveUserId = isMe ? null : targetUserId;
        const checkUrl = effectiveUserId ? `/blog/check?user_id=${effectiveUserId}` : `/blog/check`;
        const avatarUrl = effectiveUserId ? `/avatar/user/${effectiveUserId}` : `/avatar/me`;
        const userUrl = effectiveUserId ? `/users/${effectiveUserId}` : `/users/me`;

        apiClient.get(checkUrl).then(res => setHasBlog(res.data.exists)).catch(() => setHasBlog(false));

        apiClient.get(avatarUrl)
            .then(res => {
                const newData = res.data;
                const newStage = newData.growth_stage ? newData.growth_stage.toUpperCase() : 'EGG';
                const isEvolution = isMe && prevStageRef.current && prevStageRef.current !== newStage && (newStage === 'ADULT' || newStage === 'MASTER');

                if (isEvolution) {
                    const code = newData.match_type || 'LAG';
                    const isMaster = newStage === 'MASTER';

                    const childImg = isMaster
                        ? avatarImages[`../../assets/images/adult/${code}.png`]?.default
                        : avatarImages[`../../assets/images/child/${code}.png`]?.default;

                    const adultImg = isMaster
                        ? avatarImages[`../../assets/images/master/master.png`]?.default
                        : avatarImages[`../../assets/images/adult/${code}.png`]?.default;

                    showEvolution(code, childImg, adultImg, isMaster);
                } else {
                    const levelChanged = prevLevelRef.current !== null && newData.level > prevLevelRef.current;
                    const expChanged = prevExpRef.current !== null && (newData.exp > prevExpRef.current || levelChanged);

                    if (isMe && levelChanged) {
                        showLevelUp();
                    }

                    if (isMe && expChanged) {
                        setIsCharging(true);
                        setTimeout(() => setIsCharging(false), 1200);
                    }
                }

                prevLevelRef.current = newData.level;
                prevExpRef.current = newData.exp;
                prevStageRef.current = newStage;
                setAvatarData(newData);
            })
            .catch(e => console.error(e));

        if (!isMe) {
            apiClient.get(userUrl).then(res => setTargetUser(res.data)).catch(e => console.error(e));
        } else {
            setTargetUser(currentUser);
        }

        setTimeout(() => setHasLoaded(true), 300);
    }, [isMe, targetUserId, currentUser, showEvolution, avatarRefreshKey]);

    // 블로그 목록 가져오기
    const fetchBlogs = async () => {
        if (!isMe || blogs.length > 0) return;

        setLoadingBlogs(true);
        try {
            const response = await apiClient.get('/blog/blogs');
            console.log('📦 API Response - Full blogs data:', JSON.stringify(response.data, null, 2));
            setBlogs(response.data || []);
        } catch (error) {
            console.error('Failed to fetch blogs:', error);
            setBlogs([]);
        } finally {
            setLoadingBlogs(false);
        }
    };

    // 플립 핸들러
    const handleFlipClick = async () => {
        if (!hasBlog || !isMe) {
            if (targetUser?.username) {
                window.open(`https://${targetUser.username}.github.io`, '_blank');
            }
            return;
        }

        if (!isFlipped) {
            await fetchBlogs();
        }
        setIsFlipped(!isFlipped);
    };

    // repo_name에서 실제 레포지토리 이름만 추출
    const parseRepoName = (repoName) => {
        if (repoName && repoName.includes('/')) {
            return repoName.split('/')[1];
        }
        return repoName;
    };

    // 블로그 방문
    const visitBlog = (blog) => {
        console.log('🔍 Original blog object:', blog);

        const username = isMe ? currentUser?.username : targetUser?.username;
        const rawRepoName = blog.repo_name;
        const repoName = parseRepoName(rawRepoName);

        if (!username || !repoName) {
            console.error('❌ Missing data:', { username, repoName });
            return;
        }

        const isMainBlog = repoName.toLowerCase() === `${username.toLowerCase()}.github.io`;
        const url = isMainBlog
            ? `https://${username}.github.io`
            : `https://${username}.github.io/${repoName}`;

        console.log('✅ Generated URL:', { rawRepoName, parsedRepoName: repoName, username, isMainBlog, finalUrl: url });
        window.open(url, '_blank');
    };

    const avatarSrc = getAvatarImageSrc(avatarData);
    const animalName = avatarData ? getAnimalNameWithPrefix(avatarData.match_type, avatarData.growth_stage) : '알';

    return (
        <div className="h-full flex flex-col space-y-3" style={{ perspective: '2000px' }}>

            {/* Flip Card Container - 우측 Dashboard와 동일하게 flex-shrink-0, 고정 높이로 애니메이션 버그 방지 */}
            <div
                className="flex-shrink-0 relative"
                style={{ minHeight: '276px' }}
            >
                <div
                    className={`flip-panel-inner ${isFlipped ? 'flipped' : ''}`}
                    style={{
                        transformStyle: 'preserve-3d',
                        transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        height: '100%',
                        minHeight: '276px'
                    }}
                >
                    {/* Front Side - Profile & Actions */}
                    <div
                        className="flip-panel-face"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(0deg)'
                        }}
                    >
                        <Panel className="h-full overflow-y-auto custom-scrollbar">
                            <UserProfileSection
                                avatarSrc={avatarSrc}
                                level={avatarData?.level || 0}
                                experience={avatarData?.exp || 0}
                                maxExperience={avatarData?.max_exp || 10}
                                animalName={animalName}
                                username={targetUser?.username || '...'}
                                isCharging={isCharging}
                                hasLoaded={hasLoaded}
                            />

                            <BlogActionsSection
                                isMe={isMe}
                                needsHome={!isMe}
                                onHomeClick={() => navigate('/', { state: { showLoading: true } })}
                                onNavigate={navigate}
                                onVisitBlog={handleFlipClick}
                                hasBlog={hasBlog}
                            />
                        </Panel>
                    </div>

                    {/* Back Side - Blog List */}
                    <div
                        className="flip-panel-face"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)'
                        }}
                    >
                        <Panel className="h-full flex flex-col overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-indigo-200 flex-shrink-0">
                                <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                                    <List size={18} className="text-indigo-600" />
                                    내 블로그 목록
                                </h3>
                                <button
                                    onClick={() => setIsFlipped(false)}
                                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <ArrowLeft size={16} className="text-gray-600" />
                                </button>
                            </div>

                            {/* Blog List - 스크롤 가능 */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                <div className="space-y-2">
                                    {loadingBlogs ? (
                                        <div className="text-center py-8 text-gray-400">
                                            <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full mx-auto mb-2"></div>
                                            <p className="text-xs font-medium">로딩 중...</p>
                                        </div>
                                    ) : blogs.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400">
                                            <p className="text-sm font-medium">생성된 블로그가 없습니다</p>
                                            <p className="text-xs mt-1">블로그 생성 버튼을 눌러 시작하세요!</p>
                                        </div>
                                    ) : (
                                        blogs.map((blog, index) => {
                                            const username = isMe ? currentUser?.username : targetUser?.username;
                                            const repoName = parseRepoName(blog.repo_name);
                                            const isMainBlog = repoName?.toLowerCase() === `${username?.toLowerCase()}.github.io`;
                                            const displayUrl = isMainBlog
                                                ? `${username}.github.io`
                                                : `${username}.github.io/${repoName}`;

                                            return (
                                                <button
                                                    key={blog.id || index}
                                                    onClick={() => visitBlog(blog)}
                                                    className="w-full p-3 bg-gradient-to-br from-white to-gray-50 hover:from-indigo-50 hover:to-indigo-100 border-2 border-gray-200 hover:border-indigo-400 rounded-lg text-left transition-all group shadow-sm hover:shadow-md"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-gray-800 truncate mb-1.5">
                                                                {repoName}
                                                            </p>
                                                            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                                                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${blog.theme_type === 'chirpy'
                                                                    ? 'bg-indigo-500 text-white'
                                                                    : 'bg-emerald-500 text-white'
                                                                    }`}>
                                                                    {blog.theme_type === 'chirpy' ? 'TECH' : 'DOCS'}
                                                                </span>
                                                                <span className="text-[10px] text-gray-500 font-medium">
                                                                    📁 {blog.default_branch}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-gray-400 font-mono truncate">
                                                                🌐 {displayUrl}
                                                            </p>
                                                        </div>
                                                        <ExternalLink
                                                            size={14}
                                                            className="text-gray-400 group-hover:text-indigo-600 flex-shrink-0 mt-0.5 transition-colors"
                                                        />
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </Panel>
                    </div>
                </div>
            </div>

            {/* Calendar Section - flex-1 min-h-0으로 남은 공간 차지 */}
            <Panel className="flex-1 min-h-0 calendar-panel">
                <BlogCalendar userId={isMe ? null : targetUserId} />
            </Panel>

            {/* CSS for flip animation */}
            <style>{`
                .flip-panel-inner.flipped {
                    transform: rotateY(180deg);
                }
                
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 2px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 2px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    );
};

export default LeftSidePanel;

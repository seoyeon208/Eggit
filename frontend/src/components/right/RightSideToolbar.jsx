import React, { useState, useEffect } from 'react';
import { Bell, Settings, Send, X, Globe, LogOut, ArrowRight, UserX, ClipboardList, User, FolderGit, ExternalLink } from 'lucide-react';
import ChatSidebar from '../chat/ChatSidebar';
import apiClient from '../../utils/apiClient';

const RightSideToolbar = ({
    activeTab,
    toggleTab,
    totalUnread,
    isMe,
    blogUrl,
    setBlogUrl,
    handleSaveBlogUrl,
    handleLogout,
    handleDeleteAccount,
    sidebarRef
}) => {
    const [iframeLoading, setIframeLoading] = useState(true);
    const [showFallback, setShowFallback] = useState(false);
    const [userInfo, setUserInfo] = useState(null);
    const [pendingFriendId, setPendingFriendId] = useState(null); // 알림에서 클릭한 친구 ID

    // Fetch user info when settings tab is opened
    useEffect(() => {
        if (activeTab === 'settings' && isMe && !userInfo) {
            apiClient.get('/users/me')
                .then(res => {
                    setUserInfo(res.data);
                })
                .catch(err => {
                    console.error('Failed to fetch user info:', err);
                });
        }
    }, [activeTab, isMe, userInfo]);

    const buttons = [
        { id: 'alarm', icon: <ClipboardList size={24} />, color: 'text-orange-500', activeBg: 'bg-orange-500', label: '설문조사', showBadge: true },
        ...(isMe ? [{ id: 'settings', icon: <Settings size={24} />, color: 'text-gray-400', activeBg: 'bg-indigo-600', label: '설정' }] : []),
        { id: 'chat', icon: <Send size={24} />, color: 'text-blue-500', activeBg: 'bg-blue-500', label: '채팅' },
    ];

    // Reset loading state when tab changes
    useEffect(() => {
        if (activeTab === 'alarm') {
            setIframeLoading(true);
            setShowFallback(false);
            // If it doesn't load in 4 seconds, show the fallback button
            const timer = setTimeout(() => setShowFallback(true), 4000);
            return () => clearTimeout(timer);
        }
    }, [activeTab]);

    // Listen for notification clicks to open chat
    useEffect(() => {
        const handleOpenChatFromNotification = (event) => {
            const { friendId } = event.detail;
            setPendingFriendId(friendId);
            toggleTab('chat');
        };

        window.addEventListener('openChatFromNotification', handleOpenChatFromNotification);
        return () => window.removeEventListener('openChatFromNotification', handleOpenChatFromNotification);
    }, [toggleTab]);

    return (
        <div
            ref={sidebarRef}
            className={`fixed top-0 right-0 h-full flex z-[1000] right-toolbar transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${activeTab ? 'translate-x-0' : 'translate-x-[384px]'}`}
        >
            <div className="w-14 flex flex-col py-10 space-y-5 items-end flex-shrink-0 toolbar-buttons">
                {buttons.map((btn) => (
                    <button
                        key={btn.id}
                        title={btn.label}
                        onClick={() => toggleTab(btn.id)}
                        className={`w-14 h-14 border-2 border-r-0 rounded-l-xl flex items-center justify-center shadow-[-4px_0_15px_rgba(0,0,0,0.1)] transition-all relative group
                            ${activeTab === btn.id ? `${btn.activeBg} text-white border-transparent z-20` : `bg-white ${btn.color} border-gray-200 hover:bg-gray-50 z-10`}
                        `}
                    >
                        <div className={`${activeTab === btn.id ? '' : 'translate-x-[-1px]'} relative`}>
                            {btn.icon}
                            {btn.id === 'chat' && totalUnread > 0 && (
                                <div className="absolute -top-3 -right-3 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce shadow-lg">
                                    {totalUnread > 9 ? '9+' : totalUnread}
                                </div>
                            )}
                            {btn.showBadge && activeTab !== btn.id && (
                                <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse shadow-lg"></div>
                            )}
                        </div>
                        {!activeTab && (
                            <div className="absolute right-full mr-3 px-2 py-1 bg-gray-900 text-white text-[10px] font-black rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {btn.label}
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <div className="w-96 h-full bg-white border-l-4 border-gray-300 shadow-2xl flex flex-col overflow-hidden">
                {activeTab === 'alarm' && (
                    <div className="flex flex-col h-full animate-fade-in font-sans">
                        <div className="px-6 py-5 border-b-2 border-gray-100 flex justify-between items-center bg-gradient-to-r from-orange-50 to-red-50 flex-shrink-0">
                            <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
                                <ClipboardList className="text-orange-500" />
                                설문조사 📋
                            </h3>
                            <button onClick={() => toggleTab(null)} className="p-2 hover:bg-white rounded-xl transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                            {/* Iframe Loading Spinner */}
                            {iframeLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
                                    <div className="w-10 h-10 border-4 border-gray-100 border-t-orange-500 rounded-full animate-spin mb-4"></div>
                                    <p className="text-xs font-bold text-gray-400">설문조사를 불러오는 중...</p>
                                </div>
                            )}

                            {/* Fallback CTA - Only shows if it takes too long AND it's still loading (didn't work) */}
                            {showFallback && iframeLoading && (
                                <div className="absolute top-0 inset-x-0 p-4 bg-orange-50 border-b border-orange-100 z-20 animate-fade-in flex flex-col items-center shadow-md">
                                    <p className="text-xs font-bold text-orange-800 mb-2">화면이 보이지 않나요?</p>
                                    <a
                                        href="https://forms.gle/bA8XGtreYmBK7xii7"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-xl font-black text-xs hover:bg-orange-600 transition-all shadow-md active:scale-95"
                                    >
                                        새 창에서 참여하기 <ArrowRight size={14} />
                                    </a>
                                </div>
                            )}

                            <iframe
                                src="https://docs.google.com/forms/d/1JJTgsEaG8D8tqJvpgK5JPF-Sdfdh7810QN_TOgME5aU/viewform?embedded=true"
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                marginHeight="0"
                                marginWidth="0"
                                className="w-full h-full"
                                onLoad={() => setIframeLoading(false)}
                            >
                                로드 중...
                            </iframe>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && isMe && (
                    <div className="flex flex-col h-full animate-fade-in font-sans">
                        <div className="px-6 py-5 border-b-2 border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
                            <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
                                <Globe className="text-indigo-600" /> 환경 설정
                            </h3>
                            <button onClick={() => toggleTab(null)} className="p-2 hover:bg-white rounded-xl transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar">
                            {/* 계정 정보 섹션 */}
                            <div className="space-y-4">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">
                                    계정 정보
                                </label>
                                <div className="bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <User size={18} className="text-gray-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-gray-400 font-bold">GitHub ID</p>
                                            <p className="text-sm font-black text-gray-800 truncate">
                                                {userInfo?.username || '로딩 중...'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <ExternalLink size={18} className="text-gray-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-gray-400 font-bold">GitHub 프로필</p>
                                            {userInfo?.username ? (
                                                <a
                                                    href={`https://github.com/${userInfo.username}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1 truncate group"
                                                >
                                                    프로필 보기
                                                    <ExternalLink size={12} className="flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                                                </a>
                                            ) : (
                                                <p className="text-sm font-black text-gray-800">로딩 중...</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <FolderGit size={18} className="text-gray-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-gray-400 font-bold">Public 레포지토리</p>
                                            <p className="text-sm font-black text-gray-800 truncate">
                                                {userInfo?.github_raw_info?.public_repos !== undefined
                                                    ? `${userInfo.github_raw_info.public_repos}개`
                                                    : '로딩 중...'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 구분선 */}
                            <div className="border-t-2 border-gray-100"></div>

                            {/* 계정 관리 섹션 */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">
                                    계정 관리
                                </label>
                                <button onClick={handleLogout} className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center justify-between transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <LogOut size={20} className="text-gray-400 group-hover:text-gray-600" />
                                        <span className="font-bold">로그아웃</span>
                                    </div>
                                    <ArrowRight size={18} className="text-gray-300" />
                                </button>
                                <button onClick={handleDeleteAccount} className="w-full p-4 bg-red-50/50 hover:bg-red-50 rounded-2xl flex items-center justify-between transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <UserX size={20} className="text-red-300" />
                                        <span className="font-bold text-red-600">회원 탈퇴</span>
                                    </div>
                                    <ArrowRight size={18} className="text-red-200" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'chat' && <ChatSidebar isOpen={true} onClose={() => toggleTab(null)} pendingFriendId={pendingFriendId} onClearPending={() => setPendingFriendId(null)} />}
            </div>
        </div>
    );
};

export default RightSideToolbar;

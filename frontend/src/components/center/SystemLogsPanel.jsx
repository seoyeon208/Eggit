import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, ExternalLink, ArrowRight, Pin } from 'lucide-react';
import { useGeneration } from '../../contexts/GenerationContext';



const SystemLogsPanel = ({
    chatPanelRef,
    chatMinimized,
    setChatMinimized,
    chatHeight,
    isDragging,
    handleMouseDown,
    chatLogs,
    isMe,
    currentUser,
    handleDeleteGuestbook,
    guestbookText,
    setGuestbookText,
    handleWriteGuestbook,
    // [NEW] deployment 관련 props
    deployStatus,
    resultUrl
}) => {
    const navigate = useNavigate();
    const { tasks, removeTask } = useGeneration();
    const scrollRef = useRef(null);



    // Auto-scroll to bottom when logs change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatLogs, chatMinimized, chatHeight]);

    // [New] 완료된 작업 목록 필터링 (다중 작업 지원)
    const completedTasks = Object.entries(tasks || {})
        .filter(([_, task]) => task.status === 'success')
        .map(([id, task]) => {
            const taskType = task.type || task.requestPayload?.template_type || '';
            const isTech = taskType.includes('tech_blog') || (task.requestPayload?.template_type === 'tech_blog');
            return {
                id,
                isTech,
                label: isTech ? 'Tech 블로그 완성! (확인하기)' : 'Docs 문서 완성! (확인하기)',
                targetTab: isTech ? 'tech' : 'docs',
                taskData: task,
                taskType: isTech ? 'tech_blog' : taskType // 정확한 타입 전달
            };
        });

    const handleTaskResultClick = (item) => {
        const { id, targetTab, taskData, taskType } = item;
        const link = `/blog/post?tab=${targetTab}`;
        const payload = taskData.requestPayload || {};

        // 작업 제거 (이동 후 목록에서 사라짐)
        removeTask(id);

        navigate(link, {
            state: {
                restoreId: id,
                aiResult: taskData.result,
                taskType: taskType,
                activeTab: targetTab,
                blogRepo: payload.blog_repo || payload.source_repo,
                sourceRepo: payload.source_repo,
                category: payload.selected_category
            }
        });
    };

    const handleLogClick = (log) => {
        if (!log.link) return;

        if (log.navState) {
            // 작업 완료 처리 (목록에서 제거)
            if (log.navState.restoreId) {
                removeTask(log.navState.restoreId);
            }
            // 해당 탭 및 데이터와 함께 이동
            navigate(log.link, {
                state: log.navState
            });
        } else {
            navigate(log.link);
        }
    };



    return (
        <div
            ref={chatPanelRef}
            className="absolute bottom-4 left-4 right-4 system-logs-container"
            style={{
                zIndex: 10,
                height: chatMinimized ? '48px' : `${chatHeight}px`,
                transition: isDragging ? 'none' : 'height 0.2s ease'
            }}
        >
            <div className="h-full bg-black/70 backdrop-blur-md rounded-2xl border-2 border-white/20 shadow-2xl flex flex-col overflow-hidden relative">
                {/* Resize Handle */}
                <div
                    onMouseDown={handleMouseDown}
                    className="absolute top-0 left-0 right-0 h-4 cursor-ns-resize hover:bg-white/10 transition-colors z-30 group"
                    title="드래그하여 크기 조절"
                >
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/30 rounded-full group-hover:bg-white/50"></div>
                </div>

                {/* Minimized Toggle */}
                <button
                    onClick={() => setChatMinimized(!chatMinimized)}
                    className="absolute top-2 right-2 p-1.5 hover:bg-white/10 rounded-lg transition-colors z-20 bg-black/40 border border-white/10"
                >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {chatMinimized ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />}
                    </svg>
                </button>

                {/* Logs Area */}
                <div
                    ref={scrollRef}
                    className={`flex-1 overflow-y-auto px-5 py-4 space-y-2 no-scrollbar ${chatMinimized ? 'hidden' : ''}`}
                >
                    {chatLogs.map((log) => (
                        <div
                            key={log.id}
                            onClick={() => handleLogClick(log)}
                            className={`flex items-center justify-between group/log animate-slide-in ${log.isPinned ? 'bg-indigo-500/10 border-indigo-500/20 px-2 -mx-2 rounded py-0.5' : ''} ${log.link ? 'cursor-pointer hover:bg-white/10 rounded px-2 -mx-2 transition-colors border border-transparent hover:border-white/20' : ''}`}
                            title={log.link ? "클릭하여 결과 확인" : ""}
                        >
                            <div className="flex items-start gap-2 min-w-0">
                                <span className={`text-[10px] font-black ${log.type === 'complete' ? 'text-green-400' :
                                    log.type === 'greeting' ? 'text-blue-400' :
                                        log.type === 'quote' ? 'text-yellow-300' :
                                            log.type === 'guestbook' ? 'text-pink-400' : 'text-orange-400'
                                    } flex-shrink-0`}>[{log.timestamp}]</span>
                                <span className={`text-sm font-bold leading-relaxed truncate ${log.isPinned ? 'text-indigo-300' : log.type === 'quote' ? 'text-yellow-50' : 'text-white'} ${log.link ? 'underline decoration-white/30 underline-offset-4' : ''}`}>
                                    {log.isPinned && <Pin size={10} className="inline-block mr-1 fill-indigo-400 text-indigo-400" />}
                                    {log.text}
                                </span>
                            </div>


                            {log.type === 'guestbook' && (isMe || log.authorId === currentUser?.id) && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteGuestbook(log.dbId); }}
                                    className="opacity-0 group-hover/log:opacity-100 p-1 hover:bg-white/10 rounded transition-all text-red-400 flex-shrink-0"
                                    title="삭제"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                            {/* Link Indicator */}
                            {log.link && <ExternalLink size={14} className="text-white/50 ml-2" />}
                        </div>
                    ))}
                </div>

                {/* [NEW] 완료된 작업 목록 (다중 버튼 지원) */}
                {completedTasks.length > 0 && !chatMinimized && (
                    <div className="px-5 py-3 bg-gradient-to-r from-green-500/20 to-blue-500/20 border-t border-white/10 space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {completedTasks.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleTaskResultClick(item)}
                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-white/90 hover:bg-white text-gray-900 rounded-lg font-bold text-sm transition-all hover:scale-105 shadow-lg group animate-fade-in"
                            >
                                <ExternalLink size={16} className="group-hover:rotate-12 transition-transform" />
                                <span>{item.label}</span>
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        ))}
                    </div>
                )}

                {/* Friend Guestbook Input */}
                {!isMe && !chatMinimized && completedTasks.length === 0 && (
                    <form onSubmit={handleWriteGuestbook} className="px-5 py-3 bg-white/5 border-t border-white/10 flex gap-2">
                        <input
                            type="text"
                            value={guestbookText}
                            onChange={(e) => setGuestbookText(e.target.value)}
                            placeholder="친구에게 방명록을 남겨보세요..."
                            className="flex-1 bg-transparent border-none outline-none text-white text-sm font-bold placeholder:text-gray-500"
                        />
                        <button type="submit" className="text-blue-400 font-black text-xs uppercase hover:text-blue-300 transition-colors">Write</button>
                    </form>
                )}

                {/* Minimized Log Preview */}
                {chatMinimized && chatLogs.length > 0 && (
                    <div className="flex-1 px-5 py-2 flex items-center gap-3">
                        {(() => {
                            const logs = [...chatLogs].reverse();
                            const displayLog = !isMe ? (logs.find(l => l.type === 'guestbook') || logs[0]) : logs[0];
                            return (
                                <>
                                    <span className="text-[10px] text-blue-400 font-black">[{displayLog.timestamp}]</span>
                                    <span className="text-sm text-white font-bold truncate pr-8">{displayLog.text}</span>
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SystemLogsPanel;

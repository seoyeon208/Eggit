import React, { useState } from 'react';

const STATUS = {
    NOT_STARTED: 'NOT_STARTED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CLAIMED: 'CLAIMED'
};

const RightSideQuests = ({ quests, isMe, claimingIds, onClaimReward }) => {
    const [activeTab, setActiveTab] = useState('daily');

    const sortQuests = (questList) => {
        return [...questList].sort((a, b) => {
            const getScore = (status) => {
                if (status === STATUS.COMPLETED) return 1;
                if (status === STATUS.CLAIMED) return 3;
                return 2;
            };
            return getScore(a.status) - getScore(b.status);
        });
    };

    // Filter by type
    const dailyQuests = sortQuests(quests.filter(q => q.type === 'DAILY'));
    const weeklyQuests = sortQuests(quests.filter(q => q.type === 'WEEKLY'));

    // [New] All completed quests regardless of type
    const allCompletedQuests = quests
        .filter(q => q.status === STATUS.COMPLETED)
        .sort((a, b) => {
            // Sort by completed_at (earliest first as requested: "먼저 완료된 순")
            const timeA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
            const timeB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
            return timeA - timeB;
        });

    const renderQuestItem = (q) => {
        const questType = q.type === 'DAILY' ? 'DAILY' : 'WEEKLY';
        const isDailyItem = questType === 'DAILY';

        const isCompleted = q.status === STATUS.COMPLETED;
        const isClaimed = q.status === STATUS.CLAIMED;
        const isProcessing = claimingIds.has(q.id);

        const baseClass = isDailyItem
            ? 'group p-2.5 rounded-xl border transition-all duration-300 relative'
            : 'p-2.5 rounded-xl border-2 border-dashed transition-all duration-300';

        let stateClass = 'bg-white border-gray-200';

        if (isClaimed) {
            stateClass = isDailyItem
                ? 'bg-gray-100 border-gray-200 opacity-70 scale-[0.98]'
                : 'bg-indigo-100 border-indigo-200 opacity-70 scale-[0.98]';
        } else if (isCompleted && isMe) {
            stateClass = isDailyItem
                ? 'bg-blue-100 border-blue-500 cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.25)] hover:scale-[1.01] active:scale-95'
                : 'bg-indigo-100 border-indigo-500 cursor-pointer shadow-[0_0_15px_rgba(79,70,229,0.25)] hover:scale-[1.01] active:scale-95';
        } else if (!isDailyItem) {
            stateClass = 'bg-indigo-50/30 border-indigo-200';
        }

        const themeColor = isDailyItem ? 'blue' : 'indigo';
        const textColor = isDailyItem ? 'text-gray-800' : 'text-indigo-900';
        const doneColor = isDailyItem ? 'text-gray-500' : 'text-indigo-700';

        const handleClick = (e) => {
            if (isCompleted && !isClaimed && !isProcessing) {
                onClaimReward(q.id, e);
            }
        };

        return (
            <div
                key={q.id}
                onClick={handleClick}
                className={`${baseClass} ${stateClass} ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
            >
                {isCompleted && isMe && !isClaimed && (
                    <div className={`absolute inset-0 bg-gradient-to-r from-${themeColor}-400/5 to-transparent animate-shimmer pointer-events-none`}></div>
                )}

                <div className="flex items-start gap-2 relative z-10">
                    <div className="mt-1 flex-shrink-0">
                        {isClaimed ? (
                            <span className={`text-${themeColor}-600 text-sm font-black`}>✓</span>
                        ) : isCompleted ? (
                            <div className={`w-2.5 h-2.5 rounded-full bg-${themeColor}-600 ${isProcessing ? 'animate-pulse' : ''}`}></div>
                        ) : (
                            <div className={`w-2 h-2 rounded-full bg-${isDailyItem ? 'gray' : 'indigo'}-200 mt-1`}></div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <p className={`font-bold text-sm leading-tight break-words ${isClaimed ? `${doneColor} line-through` : textColor}`}>
                                {q.text || q.title || "제목 없음"}
                            </p>
                            {!isDailyItem && q.text && q.text.includes('5 days') && (
                                <div className="flex gap-1 ml-0.5">
                                    {[...Array(5)].map((_, i) => {
                                        const checkinCount = q.weekly_checkin_count || 0;
                                        const isFilled = i < checkinCount;
                                        return (
                                            <div key={i} className="relative">
                                                <div
                                                    className={`w-2 h-2 rounded-full transition-all duration-700 ${isFilled
                                                        ? `bg-indigo-500 scale-110`
                                                        : 'bg-indigo-100 scale-100'
                                                        }`}
                                                ></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        {isCompleted && isMe && !isClaimed && (
                            <p className={`text-[10px] font-black text-${themeColor}-600 mt-0.5 animate-bounce`}>
                                {isProcessing ? '보상 수령 중...' : '클릭하여 보상 받기! ✨'}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col items-end flex-shrink-0">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded whitespace-nowrap transition-colors 
                            ${isClaimed ? 'bg-gray-100 text-gray-400' : 'bg-yellow-50 text-yellow-600'}`}>
                            +{q.exp || 10} XP
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    const currentQuests = activeTab === 'daily' ? dailyQuests : weeklyQuests;
    const isDaily = activeTab === 'daily';
    const themeColor = isDaily ? 'blue' : 'indigo';

    return (
        <div className="flex-1 min-h-0 flex flex-col relative overflow-x-hidden">
            {/* Completed Quests Section - All completed (Daily + Weekly) */}
            {allCompletedQuests.length > 0 && (
                <div className="px-1 pt-2 pb-3 border-b-2 border-gray-100 flex-shrink flex-grow-0 overflow-x-hidden">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="font-black text-green-700 uppercase tracking-wider text-[10px]">
                            완료된 퀘스트 ({allCompletedQuests.length})
                        </span>
                    </div>
                    <div className="space-y-2">
                        {allCompletedQuests.map(q => renderQuestItem(q))}
                    </div>
                </div>
            )}

            {/* Tab Toggle */}
            <div className="flex items-center justify-between px-1 pt-4 pb-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full bg-${themeColor}-500 ${isDaily ? 'animate-pulse' : ''}`}></div>
                    <span className={`font-black text-${themeColor}-${isDaily ? '800' : '700'} uppercase tracking-wider text-[11px]`}>
                        {isDaily ? '일일 퀘스트' : '주간 퀘스트'}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold text-${themeColor}-600 bg-${themeColor}-100/50 px-2 py-0.5 rounded-full`}>
                        {currentQuests.filter(q => q.status === STATUS.CLAIMED).length} / {currentQuests.length}
                    </span>

                    {/* Toggle Switch */}
                    <button
                        onClick={() => setActiveTab(activeTab === 'daily' ? 'weekly' : 'daily')}
                        className={`relative w-14 h-6 rounded-full transition-colors duration-300 ${isDaily ? 'bg-blue-400' : 'bg-indigo-400'
                            }`}
                        title={isDaily ? '주간 퀘스트로 전환' : '일일 퀘스트로 전환'}
                    >
                        <div
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${isDaily ? 'translate-x-0' : 'translate-x-8'
                                }`}
                        >
                            <span className="text-[8px] font-black">
                                {isDaily ? '일' : '주'}
                            </span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Quest List - Excluding completed ones */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 px-1 pb-2 custom-scrollbar">
                {currentQuests.filter(q => q.status !== STATUS.COMPLETED).length > 0 ? (
                    currentQuests
                        .filter(q => q.status !== STATUS.COMPLETED)
                        .map(q => renderQuestItem(q))
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-300 text-xs text-center leading-relaxed">
                        진행 중인 {isDaily ? '일일' : '주간'} 퀘스트가 없습니다.<br />나중에 다시 확인해주세요!
                    </div>
                )}
            </div>
        </div>
    );
};

export default RightSideQuests;

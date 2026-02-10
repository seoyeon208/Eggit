import React from 'react';
import { Layers, PenTool, BarChart2, TrendingUp, BookOpen, ArrowUpRight } from 'lucide-react';
import { Panel } from '../common/CommonUI';

const RightSideDashboard = ({ analytics, isMe, onOpenGuestbook }) => {
    return (
        <Panel className="flex-shrink-0">
            <div className="grid grid-cols-2 gap-2 p-1">
                {/* 기술 스택 */}
                <div className="bg-indigo-100/50 rounded-2xl p-3 flex flex-col justify-between border-2 border-indigo-200 h-28 relative overflow-hidden group tech-stack-card">
                    <div className="flex items-center gap-2 mb-1">
                        <Layers size={16} className="text-indigo-500" />
                        <span className="text-[14px] font-black text-indigo-800 uppercase tracking-widest">기술 스택</span>
                    </div>
                    <div className="flex flex-wrap gap-1 relative z-10">
                        {(analytics.techStack || ['React', 'Spring']).map((stack, i) => {
                            const stackName = typeof stack === 'object' && stack !== null ? stack.name : stack;
                            return (
                                <span key={i} className="px-1.5 py-0.5 bg-white border border-indigo-200 text-indigo-700 rounded-md text-[10px] font-black shadow-sm">
                                    {stackName}
                                </span>
                            );
                        })}
                    </div>
                    <div className="absolute -right-3 -bottom-3 text-indigo-200/40 group-hover:scale-110 transition-transform">
                        <Layers size={60} />
                    </div>
                </div>

                {/* 게시글 수 */}
                <div className="bg-emerald-100/50 rounded-2xl p-3 flex flex-col justify-between border-2 border-emerald-200 h-28 relative overflow-hidden group post-count-card">
                    <div className="flex items-center gap-2 mb-1">
                        <PenTool size={16} className="text-emerald-500" />
                        <span className="text-[14px] font-black text-emerald-800 uppercase tracking-widest">게시글 수</span>
                    </div>
                    <div className="flex items-end justify-between mt-auto relative z-10">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400">Posts</span>
                            <span className="text-3xl font-black text-emerald-700 pl-2">{analytics.totalPosts}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-gray-400">Stars</span>
                            <span className="text-sm font-bold text-yellow-500">★ {analytics.totalStars}</span>
                        </div>
                    </div>
                    <div className="absolute -right-3 -bottom-3 text-emerald-200/40 group-hover:rotate-12 transition-transform">
                        <PenTool size={60} />
                    </div>
                </div>

                {/* 방문자 수 */}
                <div className={`${isMe ? 'col-span-1' : 'col-span-2'} bg-sky-100/50 rounded-2xl p-3 flex flex-col justify-between border-2 border-sky-200 h-24 relative overflow-hidden group visitor-count-card`}>
                    <div className="flex items-center gap-2 mb-1">
                        <BarChart2 size={16} className="text-sky-500" />
                        <span className="text-[14px] font-black text-sky-800 uppercase tracking-widest">방문자 수</span>
                    </div>
                    <div className="flex items-center justify-between relative z-10">
                        <span className="text-2xl font-black text-sky-700 tracking-tighter pl-2">{analytics.weeklyVisitors}</span>
                    </div>
                    <div className="absolute -right-1 -bottom-1 text-sky-200/40 group-hover:translate-x-1 transition-transform">
                        <TrendingUp size={50} />
                    </div>
                </div>

                {/* 방명록 버튼 */}
                {isMe && (
                    <button
                        onClick={onOpenGuestbook}
                        className="bg-violet-100/80 hover:bg-violet-200 rounded-2xl p-3 flex flex-col justify-center items-center text-violet-700 transition-all shadow-md active:scale-95 h-24 group relative border-2 border-violet-300 overflow-hidden guestbook-card"
                    >
                        <div className="absolute top-2 left-2 p-1 bg-violet-200/70 rounded-lg group-hover:bg-violet-300 transition-colors">
                            <ArrowUpRight size={12} className="text-violet-700" />
                        </div>
                        <BookOpen size={24} className="mb-1 group-hover:scale-110 transition-transform text-violet-600" />
                        <span className="text-[14px] font-black uppercase tracking-widest">방명록</span>
                    </button>
                )}
            </div>
        </Panel>
    )
};

export default RightSideDashboard;

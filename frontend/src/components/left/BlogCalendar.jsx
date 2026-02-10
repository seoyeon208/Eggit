import { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, BookOpen, FileText, RefreshCw, ArrowLeft, ExternalLink } from 'lucide-react';
import apiClient from '../../utils/apiClient';

const BlogCalendar = ({ userId = null }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);

    // [Changed] 팝오버 대신 화면 전환을 위한 선택된 날짜 State
    const [selectedDate, setSelectedDate] = useState(null);

    // [Helper] 날짜 변환
    const toDateString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // 1. 데이터 로드 (userId에 따라 엔드포인트 변경)
    const fetchEvents = async () => {
        setLoading(true);
        try {
            const endpoint = userId ? `/calendar/events?user_id=${userId}` : '/calendar/events';
            const res = await apiClient.get(endpoint);
            setEvents(res.data);
        } catch (err) {
            console.error("캘린더 데이터 로드 실패:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
        const handleRefresh = () => fetchEvents();
        window.addEventListener('calendarUpdate', handleRefresh);
        return () => window.removeEventListener('calendarUpdate', handleRefresh);
    }, [userId]); // userId 변경 시 재로드

    // 2. 달력 계산 및 네비게이션
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        return {
            year,
            month,
            daysInMonth: lastDay.getDate(),
            startingDayOfWeek: firstDay.getDay()
        };
    };

    const prevMonth = () => {
        setSelectedDate(null);
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };
    const nextMonth = () => {
        setSelectedDate(null);
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // 3. [Sub-View] 달력 그리드 뷰
    const renderCalendarGrid = () => {
        const { year, month, daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
        const todayStr = toDateString(new Date());
        const days = [];

        // 빈 칸 (지난달)
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(<div key={`empty-start-${i}`} className="flex-1"></div>);
        }

        // 날짜 칸
        for (let day = 1; day <= daysInMonth; day++) {
            const currentRenderDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dailyEvents = events.filter(e => e.date === currentRenderDateStr);
            const isToday = currentRenderDateStr === todayStr;
            const hasEvents = dailyEvents.length > 0;

            days.push(
                <div
                    key={day}
                    onClick={() => {
                        if (hasEvents) setSelectedDate(currentRenderDateStr);
                    }}
                    className={`
                        flex-1 relative flex flex-col items-center justify-start pt-1 rounded-lg transition-all h-full min-h-[36px]
                        ${hasEvents ? 'cursor-pointer hover:bg-indigo-50 group' : 'cursor-default'}
                        ${isToday ? 'bg-blue-50/50' : ''}
                    `}
                >
                    <span className={`
                        text-[10px] w-5 h-5 flex items-center justify-center rounded-full mb-0.5 z-10 transition-colors
                        ${isToday ? 'bg-blue-500 text-white font-bold' : 'text-gray-500'}
                        ${hasEvents && !isToday ? 'group-hover:text-indigo-600 group-hover:font-bold' : ''}
                    `}>
                        {day}
                    </span>

                    {/* 이벤트 도트 표시 */}
                    {hasEvents && (
                        <div className="flex gap-0.5 flex-wrap justify-center px-1">
                            {dailyEvents.slice(0, 4).map((evt, idx) => (
                                <div
                                    key={`dot-${evt.id}-${idx}`}
                                    className={`w-1 h-1 rounded-full ${evt.type === 'chirpy' ? 'bg-indigo-500' : 'bg-emerald-500'
                                        }`}
                                />
                            ))}
                            {dailyEvents.length > 4 && <div className="w-1 h-1 rounded-full bg-gray-300" />}
                        </div>
                    )}
                </div>
            );
        }

        // 남은 칸 채우기
        const totalCells = 42;
        const remainingCells = totalCells - days.length;
        for (let i = 0; i < remainingCells; i++) {
            days.push(<div key={`empty-end-${i}`} className="flex-1"></div>);
        }

        return (
            <>
                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 gap-1 mb-1 shrink-0">
                    {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                        <div key={idx} className={`text-center text-[10px] font-black ${idx === 0 ? 'text-red-400' : idx === 6 ? 'text-blue-400' : 'text-gray-300'}`}>
                            {day}
                        </div>
                    ))}
                </div>
                {/* 날짜 그리드 */}
                <div className="grid grid-cols-7 grid-rows-6 gap-1 flex-1 animate-fade-in">
                    {days}
                </div>
            </>
        );
    };

    // 4. [Sub-View] 상세 리스트 뷰 (전환된 화면)
    const renderDetailList = () => {
        const dailyEvents = events.filter(e => e.date === selectedDate);
        const [year, month, day] = selectedDate.split('-');

        return (
            <div className="flex flex-col h-full animate-slide-in-right">
                {/* 리스트 헤더 */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                    <button
                        onClick={() => setSelectedDate(null)}
                        className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors"
                    >
                        <ArrowLeft size={14} /> 뒤로가기
                    </button>
                    <span className="text-xs font-black text-gray-800">
                        {month}월 {day}일의 기록 ({dailyEvents.length})
                    </span>
                </div>

                {/* 게시글 목록 */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                    {dailyEvents.length > 0 ? dailyEvents.map((evt) => (
                        <a
                            key={evt.id}
                            href={evt.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-gray-50 hover:bg-white border border-transparent hover:border-indigo-200 rounded-xl p-3 transition-all shadow-sm hover:shadow-md group"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                    {evt.type === 'chirpy' ? (
                                        <BookOpen size={12} className="text-indigo-500" />
                                    ) : (
                                        <FileText size={12} className="text-emerald-500" />
                                    )}
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${evt.type === 'chirpy' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                        {evt.type === 'chirpy' ? 'BLOG' : 'DOCS'}
                                    </span>
                                </div>
                                <ExternalLink size={10} className="text-gray-300 group-hover:text-indigo-400" />
                            </div>

                            <h4 className="text-xs font-bold text-gray-800 leading-snug group-hover:text-indigo-700 mb-1 line-clamp-2">
                                {evt.title}
                            </h4>
                            <div className="flex items-center gap-1 text-[9px] text-gray-400">
                                <span className="truncate max-w-[120px]">{evt.repo_name}</span>
                            </div>
                        </a>
                    )) : (
                        <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                            <span className="text-xs">작성된 글이 없습니다.</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm h-full flex flex-col relative overflow-hidden">

                {/* 상단 헤더 (리스트 뷰일 때는 숨김 or 날짜 표시용으로 유지 - 여기선 캘린더 뷰일때만 컨트롤 표시) */}
                {!selectedDate && (
                    <div className="flex items-center justify-between mb-4 shrink-0">
                        <div className="flex items-center gap-2">
                            <CalendarIcon size={16} className="text-indigo-600" />
                            <span className="font-bold text-gray-800 text-sm">
                                {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                            </span>
                            {loading && <RefreshCw size={12} className="animate-spin text-gray-400" />}
                        </div>
                        <div className="flex gap-1">
                            <button onClick={prevMonth} className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                                <ChevronLeft size={16} />
                            </button>
                            <button onClick={nextMonth} className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* 메인 컨텐츠 영역 (조건부 렌더링) */}
                <div className="flex-1 overflow-hidden relative">
                    {selectedDate ? renderDetailList() : renderCalendarGrid()}
                </div>

                {/* 하단 범례 (캘린더 뷰일 때만 표시) */}
                {!selectedDate && (
                    <div className="mt-2 flex items-center justify-end gap-3 border-t border-gray-50 pt-2 shrink-0">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                            <span className="text-[9px] font-bold text-gray-500 uppercase">Blog</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            <span className="text-[9px] font-bold text-gray-500 uppercase">Docs</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BlogCalendar;
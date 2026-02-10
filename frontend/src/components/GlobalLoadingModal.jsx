import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useGeneration } from '../contexts/GenerationContext';
import { Loader2, CheckCircle, XCircle, ArrowRight, FileText, Code } from 'lucide-react';

const GlobalLoadingModal = () => {
    const { tasks, removeTask } = useGeneration();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    // [State] URL 파라미터 변경 감지를 위해 로컬 state로 탭 관리
    const [currentTab, setCurrentTab] = useState(searchParams.get('tab'));

    useEffect(() => {
        setCurrentTab(searchParams.get('tab'));
    }, [searchParams]);

    // [Draggable Logic]
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            // 부드러운 이동을 위해 requestAnimationFrame 사용 가능하나, 간단히 state 업데이트
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart]);

    // 1. 현재 사용자의 위치 파악
    const isMainPage = location.pathname === '/';
    const isPostPage = location.pathname === '/blog/post';

    // 메인 페이지는 캐릭터 말풍선이 담당하므로 모달 숨김
    if (isMainPage) return null;

    // 2. 활성 작업 필터링
    const activeTasks = Object.entries(tasks || {}).filter(([_, task]) => task.status !== 'idle');

    // 3. 렌더링 할 작업 필터링 (표시 조건 로직 개선)
    const visibleTasks = activeTasks.filter(([_, task]) => {
        // (A) 포스팅 페이지가 아니면 무조건 표시
        if (!isPostPage) return true;

        // (B) 포스팅 페이지라면, '현재 보고 있는 탭'과 '같은 종류'의 '진행 중'인 작업만 숨김
        // (성공한 작업은 자동 소비 로직에 의해 사라질 때까지 보여주거나, 혹은 탭이 달라서 못 보는 경우 보여줌)

        const isTechTask = task.type?.includes('tech');
        const isDocsTask = task.type?.includes('docs');

        const isWatchingTech = currentTab === 'tech';
        const isWatchingDocs = currentTab === 'docs';

        // 1. 내가 Tech 탭을 보고 있는데 Tech 작업이 '진행 중'이다 -> 사이드바 로딩이 있으므로 모달 숨김
        if (isTechTask && isWatchingTech && task.status === 'processing') return false;

        // 2. 내가 Docs 탭을 보고 있는데 Docs 작업이 '진행 중'이다 -> 사이드바 로딩이 있으므로 모달 숨김
        if (isDocsTask && isWatchingDocs && task.status === 'processing') return false;

        // 3. 내가 Tech 탭을 보고 있는데 Tech 작업이 '성공'했다 
        // -> BlogPostingPage의 Auto-Consume 로직이 즉시 데이터를 적용하고 removeTask를 호출하여 모달을 지울 것임.
        // -> 따라서 여기서 굳이 숨기지 않아도 됨 (찰나의 순간 보일 수 있으나 자연스러움).
        // -> 만약 Auto-Consume이 실패하거나 늦어질 경우를 대비해 여기선 보여주는 게 안전함. 
        // -> 단, "중복 표시"가 싫다면 숨길 수 있음.
        if (isTechTask && isWatchingTech && task.status === 'success') return false;
        if (isDocsTask && isWatchingDocs && task.status === 'success') return false;

        // 그 외 (예: Tech 편집 중인데 Docs 작업 관련 / 탭 선택 화면) -> 표시
        return true;
    });

    if (visibleTasks.length === 0) return null;

    // [Action] 결과 페이지로 이동 (데이터 스왑 트리거)
    const handleGoToResult = (key, task) => {
        const targetTab = task.type?.includes('tech') ? 'tech' : 'docs';
        const payload = task.requestPayload || {};

        // 쿼리 파라미터가 포함된 경로로 이동
        // state를 함께 넘겨주어 BlogPostingPage가 이를 감지하고 데이터를 스왑하도록 함
        navigate(`/blog/post?tab=${targetTab}`, {
            state: {
                restoreId: key,
                aiResult: task.result,
                taskType: task.type,
                activeTab: targetTab,
                blogRepo: payload.blog_repo || payload.source_repo,
                sourceRepo: payload.source_repo,
                category: payload.selected_category
            }
        });

        // *주의* : 여기서 removeTask를 바로 호출하면, 페이지 이동 후 데이터를 로드하기 전에 작업이 사라질 수 있음.
        // BlogPostingPage의 useEffect에서 데이터를 다 바꾼 후 removeTask를 호출하도록 하는 게 더 안전함.
        // 하지만 사용자 경험상 버튼 누르자마자 모달은 사라지는 게 좋으므로 호출함.
        // (BlogPostingPage는 location.state로 데이터를 받으므로 tasks가 비워져도 상관없게 구현됨)
        removeTask(key);
    };

    return (
        <div
            className="fixed top-12 left-1/2 z-[9999] flex flex-col gap-4 w-96 pointer-events-none transition-none"
            style={{ transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)` }}
        >
            {visibleTasks.map(([key, task]) => (
                <div
                    key={key}
                    className={`
                        pointer-events-auto flex flex-col p-4 rounded-xl shadow-2xl border transition-all duration-300 animate-slide-in-right
                        ${task.status === 'success' ? 'bg-white border-green-200' : 'bg-white/95 border-gray-200 backdrop-blur'}
                    `}
                >
                    {/* Header - Drag Handle */}
                    <div
                        className="flex items-start justify-between mb-2 cursor-move select-none"
                        onMouseDown={handleMouseDown}
                        title="드래그하여 이동"
                    >
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-full ${task.status === 'processing' ? 'bg-purple-100 text-purple-600' :
                                task.status === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                }`}>
                                {task.status === 'processing' && <Loader2 size={16} className="animate-spin" />}
                                {task.status === 'success' && <CheckCircle size={16} />}
                                {task.status === 'failure' && <XCircle size={16} />}
                            </div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                {task.type?.includes('tech') ? <Code size={12} /> : <FileText size={12} />}
                                {task.type?.includes('tech') ? 'TECH BLOG' : 'DOCS SITE'}
                            </span>
                        </div>
                        {/* 닫기 버튼: 작업 삭제 */}
                        <button onClick={() => removeTask(key)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded transition-colors">
                            <XCircle size={16} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="mb-3 pl-1">
                        <h4 className="text-sm font-bold text-gray-800">
                            {task.status === 'processing' ? 'AI 작업 진행 중...' :
                                task.status === 'success' ? '작업이 완료되었습니다!' : '작업 실패'}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            {task.status === 'processing' ? '다른 작업을 진행하셔도 됩니다.' :
                                task.status === 'success' ? '결과를 확인하러 이동하세요.' : '오류가 발생했습니다.'}
                        </p>
                    </div>

                    {/* Footer: 성공 시 이동 버튼 유지 */}
                    {task.status === 'success' && (
                        <button
                            onClick={() => handleGoToResult(key, task)}
                            className="w-full py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-md group"
                        >
                            결과 확인하러 가기
                            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
};

export default GlobalLoadingModal;
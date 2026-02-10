import { useState } from 'react';
import { HelpCircle, PenTool, CheckCircle, Gift, RefreshCw, ChevronRight, Star, PlusSquare, Users, MessageSquare, Calendar as CalendarIcon } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import useUserStore from '../../store/useUserStore';
import useNotificationStore from '../../store/useNotificationStore';

// Dynamically import all avatar images for the growth guide
const avatarImages = import.meta.glob('../../assets/images/**/*.png', { eager: true });

/**
 * HelpModal - 사용설명서 모달 (Windows 95 Retro Style)
 * 
 * 초보 사용자를 위한 가이드와 캐릭터 성장 시스템 소개를 제공합니다.
 */
const HelpModal = ({ isOpen, onClose }) => {
    const { user, setUser } = useUserStore();
    const { notify, confirm } = useNotificationStore();
    const [isResetting, setIsResetting] = useState(false);

    if (!isOpen) return null;

    const handleRestartTutorial = () => {
        confirm(
            "튜토리얼을 처음부터 다시 시작하시겠습니까?\n이전 튜토리얼 진행 내역이 초기화됩니다.",
            async () => {
                setIsResetting(true);
                try {
                    const res = await apiClient.post('/users/tutorial/reset');
                    if (res.data.tutorial_completed === false || res.data.message) {
                        if (user) {
                            setUser({ ...user, tutorial_completed: false });
                        }
                        notify("튜토리얼이 초기화되었습니다! 페이지를 새로고침하면 가이드가 시작됩니다.", "success");
                        onClose();
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    }
                } catch (err) {
                    console.error("튜토리얼 리셋 실패:", err);
                    notify("초기화 실패! 잠시 후 다시 시도해주세요.", "error");
                } finally {
                    setIsResetting(false);
                }
            },
            "초기화",
            "info"
        );
    };

    // Helper to get image path safely
    const getImg = (path) => avatarImages[path]?.default || null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 font-sans"
            onClick={onClose}
        >
            <div
                className="w-[92%] max-w-3xl bg-white border-[3px] border-[#2D3748] overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Windows 95 Retro Title Bar */}
                <div className="bg-[#B3E5FC] border-b-[3px] border-[#2D3748] px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <HelpCircle size={20} className="text-[#2D3748]" />
                        <span className="text-base font-black text-[#2D3748]" style={{ fontFamily: 'RoundedFixedsys' }}>
                            eggit_guide.exe
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button className="w-7 h-7 bg-white border-[2px] border-[#2D3748] flex items-center justify-center text-xs font-bold cursor-default shadow-[1px_1px_0_0_#2D3748]">-</button>
                        <button className="w-7 h-7 bg-white border-[2px] border-[#2D3748] flex items-center justify-center text-xs font-bold cursor-default shadow-[1px_1px_0_0_#2D3748]">□</button>
                        <button
                            onClick={onClose}
                            className="w-7 h-7 bg-[#FFB3B3] border-[2px] border-[#2D3748] flex items-center justify-center text-sm font-bold hover:bg-[#ff8a8a] transition-colors shadow-[1px_1px_0_0_#2D3748]"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="overflow-y-auto max-h-[calc(100%-60px)] px-8 md:px-12 py-8 md:py-10 bg-white custom-scrollbar">
                    {/* 1. 서비스 소개 */}
                    <div className="mb-12">
                        <h3 className="text-2xl md:text-3xl font-black text-[#2D3748] mb-6 flex items-center gap-3" style={{ fontFamily: 'RoundedFixedsys' }}>
                            <span className="text-3xl">✨</span>
                            반가워요! Eggit 입니다.
                        </h3>
                        <p className="text-[#4A5568] font-bold text-lg md:text-xl leading-relaxed mb-4" style={{ fontFamily: 'Umdot' }}>
                            Eggit은 <strong className="text-[#3182CE]">나의 GitHub 성장을 기록으로 남기는</strong> 특별한 공간이에요.
                        </p>
                        <p className="text-[#718096] font-medium text-base md:text-lg leading-relaxed" style={{ fontFamily: 'Umdot' }}>
                            코드를 짤 때마다 쌓이는 커밋들, 그냥 두기엔 아깝죠?
                            Eggit AI가 커밋을 분석해 블로그 글감을 만들어주고,
                            그 활동만큼 내가 키우는 아바타도 무럭무럭 자라난답니다.
                        </p>
                    </div>

                    <hr className="border-t-[2px] border-[#E2E8F0] my-8" />

                    {/* 2. 캐릭터 성장 가이드 (소개글 바로 아래로 이동) */}
                    <div className="mb-16">
                        <h3 className="text-xl md:text-2xl font-black text-[#2D3748] mb-8 flex items-center gap-3" style={{ fontFamily: 'RoundedFixedsys' }}>
                            🐣 함께 성장하는 캐릭터
                        </h3>
                        <p className="text-[#4A5568] font-bold text-base md:text-lg leading-relaxed mb-8" style={{ fontFamily: 'Umdot' }}>
                            Eggit에는 왜 캐릭터가 있냐고요? 이 캐릭터는 바로 <strong className="text-[#3182CE]">학습하고 기록하는 당신의 모습</strong>을 닮아있기 때문이에요!
                            블로그를 쓰고 퀘스트를 깰 때마다 캐릭터는 점점 더 멋진 모습으로 진화합니다.
                        </p>

                        <div className="bg-gray-50 rounded-2xl p-6 md:p-8 border-2 border-gray-100 shadow-inner">
                            <div className="grid grid-cols-4 gap-2 md:gap-4 relative">
                                {/* Connection lines */}
                                <div className="absolute top-1/2 left-[12%] right-[12%] h-[2px] bg-indigo-100 -translate-y-1/2 hidden md:block"></div>

                                {/* Stage 1: Egg */}
                                <div className="flex flex-col items-center z-10">
                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full border-2 border-indigo-200 flex items-center justify-center shadow-md mb-3 overflow-hidden">
                                        <img src={getImg('../../assets/images/egg/egg.png')} alt="Egg" className="w-10 md:w-12 h-auto object-contain" />
                                    </div>
                                    <p className="text-[10px] md:text-xs font-black text-indigo-400 mb-1">LV.0</p>
                                    <p className="text-xs md:text-sm font-bold text-gray-700">EGG</p>
                                </div>

                                <div className="flex items-center justify-center md:hidden"><ChevronRight size={14} className="text-indigo-200" /></div>

                                {/* Stage 2: Child (Blurred) */}
                                <div className="flex flex-col items-center z-10">
                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full border-2 border-indigo-300 flex items-center justify-center shadow-md mb-3 overflow-hidden">
                                        <img src={getImg('../../assets/images/child/LAG.png')} alt="Child" className="w-12 md:w-14 h-auto object-contain blur-[6px]" />
                                    </div>
                                    <p className="text-[10px] md:text-xs font-black text-indigo-500 mb-1">LV.1~9</p>
                                    <p className="text-xs md:text-sm font-bold text-gray-700">CHILD</p>
                                </div>

                                <div className="flex items-center justify-center md:hidden"><ChevronRight size={14} className="text-indigo-200" /></div>

                                {/* Stage 3: Adult (Blurred) */}
                                <div className="flex flex-col items-center z-10">
                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full border-2 border-indigo-400 flex items-center justify-center shadow-md mb-3 overflow-hidden">
                                        <img src={getImg('../../assets/images/adult/LAG.png')} alt="Adult" className="w-14 md:w-16 h-auto object-contain blur-[8px]" />
                                    </div>
                                    <p className="text-[10px] md:text-xs font-black text-indigo-600 mb-1">LV.10~</p>
                                    <p className="text-xs md:text-sm font-bold text-gray-700">ADULT</p>
                                </div>

                                <div className="flex items-center justify-center md:hidden"><ChevronRight size={14} className="text-indigo-200" /></div>

                                {/* Stage 4: Master (Mysterious question mark) */}
                                <div className="flex flex-col items-center z-10">
                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-600 rounded-full border-2 border-indigo-700 flex items-center justify-center shadow-xl mb-3 overflow-hidden ring-4 ring-indigo-100 relative group">
                                        <div className="text-white text-3xl md:text-4xl font-black animate-pulse drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">?</div>
                                    </div>
                                    <p className="text-[10px] md:text-xs font-black text-indigo-700 mb-1">LV. ???</p>
                                    <p className="text-xs md:text-sm font-black text-indigo-800 flex items-center gap-1">
                                        MASTER <Star size={10} className="fill-yellow-400 text-yellow-400 animate-pulse" />
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-t-[2px] border-[#E2E8F0] my-8" />

                    {/* 3. 핵심 기능 상세 */}
                    <div className="mb-16">
                        <h3 className="text-xl md:text-2xl font-black text-[#2D3748] mb-10 flex items-center gap-3" style={{ fontFamily: 'RoundedFixedsys' }}>
                            🕹️ 주요 기능을 소개할게요
                        </h3>

                        <div className="space-y-16">
                            {/* 1. 블로그 생성 */}
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                <div className="shrink-0 flex justify-center w-full md:w-auto">
                                    <div className="w-36 flex items-center justify-center space-x-2 py-3 px-4 border-2 border-gray-300 bg-white text-gray-700 rounded-lg shadow-md hover:scale-105 transition-all">
                                        <PlusSquare size={20} />
                                        <span className="font-bold text-base">생성</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-black text-[#2D3748] text-xl mb-3 flex items-center gap-2">
                                        🛠️ 블로그 생성
                                    </h4>
                                    <p className="text-[#4A5568] font-medium text-base md:text-lg leading-relaxed" style={{ fontFamily: 'Umdot' }}>
                                        처음 오셨다면 <strong>[생성]</strong> 버튼을 눌러보세요.
                                        내 GitHub 레포지토리를 Eggit 블로그로 즉시 연결할 수 있어요.
                                        테마를 선택하고 몇 초만 기다리면 나만의 기술 블로그가 완성됩니다!
                                    </p>
                                </div>
                            </div>

                            {/* 2. 글쓰기 */}
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                <div className="shrink-0 flex justify-center w-full md:w-auto">
                                    <div className="w-36 flex items-center justify-center space-x-2 py-3 px-4 border-2 border-gray-800 bg-gray-800 text-white rounded-lg shadow-xl hover:scale-105 transition-all">
                                        <PenTool size={20} />
                                        <span className="font-bold text-base">글쓰기</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-black text-[#2D3748] text-xl mb-3 flex items-center gap-2">
                                        📝 블로그 만들기
                                    </h4>
                                    <p className="text-[#4A5568] font-medium text-base md:text-lg leading-relaxed" style={{ fontFamily: 'Umdot' }}>
                                        생성된 블로그에 새 글을 쓸 땐 <strong>[글쓰기]</strong> 버튼을 클릭하세요.
                                        최근 GitHub 커밋들을 AI 에이전트가 분석해서 <strong className="text-[#3182CE]">기술 블로그 초안</strong>을 뚝딱 만들어줘요.
                                        기록에 대한 부담은 Eggit에게 맡기세요!
                                    </p>
                                </div>
                            </div>

                            {/* 3. 퀘스트 */}
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                <div className="shrink-0 flex justify-center w-full md:w-auto">
                                    <div className="w-36 p-2.5 rounded-xl border bg-blue-100 border-blue-500 shadow-lg">
                                        <div className="flex items-start gap-2">
                                            <div className="mt-1 flex-shrink-0">
                                                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-[10px] text-blue-900 leading-tight truncate">출석체크</p>
                                                <p className="text-[8px] font-black text-blue-600 mt-0.5 animate-bounce">
                                                    보상 받기! ✨
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end shrink-0">
                                                <span className="text-[8px] font-black px-1 py-0.5 rounded bg-yellow-50 text-yellow-600 border border-yellow-200">
                                                    +10 XP
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-black text-[#2D3748] text-xl mb-3 flex items-center gap-2">
                                        🎯 미션과 보상
                                    </h4>
                                    <p className="text-[#4A5568] font-medium text-base md:text-lg leading-relaxed" style={{ fontFamily: 'Umdot' }}>
                                        우측 패널에는 매일 새로운 미션들이 기다리고 있어요.
                                        완료된 항목을 클릭해 <strong className="text-[#805AD5]">경험치(XP)</strong>를 받으세요!
                                        이 경험치는 캐릭터를 성장시키는 소중한 에너지가 된답니다.
                                    </p>
                                </div>
                            </div>

                            {/* 4. 선물 상자 */}
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                <div className="shrink-0 flex justify-center w-full md:w-auto">
                                    <div className="relative w-36 h-14 group cursor-default">
                                        <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-pink-500 rounded-xl shadow-lg border-2 border-white/20 transform transition-transform group-hover:scale-105">
                                            {/* Ribbon Vertical */}
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-full bg-yellow-300 shadow-sm" />
                                            {/* Ribbon Horizontal */}
                                            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-3 bg-yellow-300 shadow-sm" />
                                            {/* Bow top */}
                                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                                                <div className="w-5 h-5 rounded-full border-[3px] border-yellow-300" />
                                                <div className="w-5 h-5 rounded-full border-[3px] border-yellow-300" />
                                            </div>
                                            {/* Icon */}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Gift size={24} className="text-white drop-shadow-md animate-bounce" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-black text-[#2D3748] text-xl mb-3 flex items-center gap-2">
                                        🎁 AI의 깜짝 선물
                                    </h4>
                                    <p className="text-[#4A5568] font-medium text-base md:text-lg leading-relaxed" style={{ fontFamily: 'Umdot' }}>
                                        매일 오후 5시 30분이 되면 중앙 화면에 선물 상자가 나타나요.
                                        상자를 열면 내 최근 활동을 바탕으로 한 <strong className="text-[#D53F8C]">개발 퀴즈</strong>나
                                        맞춤형 블로그 글감을 추천받을 수 있어요.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-t-[2px] border-[#E2E8F0] my-8" />

                    {/* 4. 부가 기능 섹션 */}
                    <div className="mb-16">
                        <h3 className="text-xl md:text-2xl font-black text-[#2D3748] mb-8 flex items-center gap-3" style={{ fontFamily: 'RoundedFixedsys' }}>
                            🔍 이런 기능도 있어요
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 친구 홈피 & 채팅 */}
                            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                                        <Users size={20} />
                                    </div>
                                    <h4 className="font-black text-[#2D3748] text-lg">친구와 교류하기</h4>
                                </div>
                                <p className="text-sm text-[#718096] font-medium leading-relaxed" style={{ fontFamily: 'Umdot' }}>
                                    친구의 닉네임을 검색해 친구가 고민한 기록들을 보러 놀러가보세요! 실시간 <strong>채팅</strong>을 나누거나 <strong>방명록</strong>을 남길 수도 있어요.
                                </p>
                                <div className="flex gap-2">
                                    <div className="px-3 py-1 bg-white border border-gray-200 rounded-full text-[10px] font-bold text-gray-500 flex items-center gap-1">
                                        <MessageSquare size={12} /> 채팅
                                    </div>
                                    <div className="px-3 py-1 bg-white border border-gray-200 rounded-full text-[10px] font-bold text-gray-500 flex items-center gap-1">
                                        <Users size={12} /> 친구 검색
                                    </div>
                                </div>
                            </div>

                            {/* 캘린더 */}
                            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                                        <CalendarIcon size={20} />
                                    </div>
                                    <h4 className="font-black text-[#2D3748] text-lg">나의 기록 보관소</h4>
                                </div>
                                <p className="text-sm text-[#718096] font-medium leading-relaxed" style={{ fontFamily: 'Umdot' }}>
                                    <strong>캘린더</strong>를 통해 내가 언제 어떤 포스팅을 했는지 한눈에 모아보세요. 꾸준한 기록이 쌓여가는 과정을 시각적으로 확인할 수 있습니다.
                                </p>
                                <div className="mt-auto h-8 flex gap-1 items-end opacity-40">
                                    {[3, 5, 8, 4, 6, 2, 7].map((h, i) => (
                                        <div key={i} className="flex-1 bg-emerald-400 rounded-t" style={{ height: `${h * 10}%` }}></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-t-[2px] border-[#E2E8F0] my-8" />

                    {/* 5. 응원 메시지 */}
                    <div className="bg-[#FEFCBF] border-l-[4px] border-[#F6AD55] px-6 py-6 rounded-r-lg mb-10 shadow-sm">
                        <p className="text-[#744210] font-black text-xl mb-2 flex items-center gap-2" style={{ fontFamily: 'RoundedFixedsys' }}>
                            <span className="text-2xl">🌱</span> 조금씩 시작해볼까요?
                        </p>
                        <p className="text-[#744210] font-bold text-base leading-relaxed" style={{ fontFamily: 'Umdot' }}>
                            오늘의 커밋 하나를 블로그 글로 기록하는 것부터 시작해보세요.
                            캐릭터가 자라나는 기쁨만큼이나, 당신의 기록도 멋진 자산이 될 거예요.
                            Eggit이 당신의 꾸준함을 응원합니다!
                        </p>
                    </div>

                    {/* 튜토리얼 리셋 옵션 */}
                    <div className="flex justify-center border-t border-gray-100 pt-8 mt-4">
                        <button
                            onClick={handleRestartTutorial}
                            disabled={isResetting}
                            className="flex items-center gap-2 text-[20px] font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 px-4 py-2.5 rounded-xl transition-all group"
                        >
                            <RefreshCw size={20} className={`transition-transform duration-700 ${isResetting ? "animate-spin" : "group-hover:rotate-180"}`} />
                            <span className="underline decoration-dotted underline-offset-4 tracking-tight">튜토리얼 다시 시작하기</span>
                        </button>
                    </div>
                </div>

                {/* Footer Button */}
                <div className="bg-[#F7FAFC] px-6 py-5 border-t-[3px] border-[#2D3748] flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-4 border-[3px] border-[#2D3748] bg-[#4A5568] text-white font-black text-xl hover:bg-[#2D3748] active:bg-[#1a202c] shadow-[8px_8px_0_0_#CBD5E1] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-3"
                        style={{ fontFamily: 'RoundedFixedsys' }}
                    >
                        가이드 닫고 시작하기! 🚀
                    </button>
                </div>
            </div>

            {/* Retro Scrollbar Style (Inline for simplicity) */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-left: 1px solid #ddd;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border: 2px solid #f1f1f1;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }
            `}</style>
        </div>
    );
};

export default HelpModal;

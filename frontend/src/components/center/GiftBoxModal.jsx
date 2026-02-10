import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import useRefreshStore from '../../store/useRefreshStore';
import { X, Gift, BookOpen, HelpCircle, CheckCircle, AlertCircle } from 'lucide-react';

const GiftBoxModal = ({ onClose }) => {
    const { refreshQuest } = useRefreshStore();

    const [step, setStep] = useState('closed'); // closed -> opening -> opened
    const [giftContent, setGiftContent] = useState(null);
    const [activeTab, setActiveTab] = useState('quiz'); // quiz | blog,

    // 퀴즈 상태
    const [selectedOption, setSelectedOption] = useState(null);
    const [quizResult, setQuizResult] = useState(null); // null, 'correct', 'incorrect'
    const [explanation, setExplanation] = useState("");
    const [isCopied, setIsCopied] = useState(false); // [New] 복사 상태

    const resultRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (quizResult && resultRef.current) {
            resultRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }, [quizResult]);

    // 1. 선물 데이터 로드 및 열기 (자동 오픈)
    useEffect(() => {
        const fetchAndOpenGift = async () => {
            try {
                // 오늘의 선물 ID 조회
                const checkRes = await apiClient.get('/gift/today');
                if (checkRes.data.has_gift) {
                    const giftId = checkRes.data.gift_id;

                    // 선물 열기 API 호출
                    const openRes = await apiClient.post(`/gift/${giftId}/open`);
                    setGiftContent(openRes.data); // blog_item, quiz_item 포함

                    // 이미 푼 퀴즈인지 확인
                    if (checkRes.data.is_solved) {
                        setQuizResult('already_solved');
                        setExplanation("이미 정답을 맞추셨습니다!");
                    }

                    setStep('opened');
                }
            } catch (err) {
                console.error("선물 열기 실패:", err);
            }
        };

        setStep('opening');
        fetchAndOpenGift();
    }, []);

    // 2. 퀴즈 정답 제출
    const handleSubmitQuiz = async () => {
        if (selectedOption === null || quizResult === 'correct' || quizResult === 'already_solved') return;

        try {
            const checkRes = await apiClient.get('/gift/today');
            const giftId = checkRes.data.gift_id;

            const res = await apiClient.post(`/gift/${giftId}/solve`, {
                answer_idx: selectedOption
            });

            if (res.data.result === 'correct' || res.data.quest_status === 'already_cleared') {
                setQuizResult('correct');
                setExplanation(res.data.explanation || "정답입니다!");
                // Zustand 스토어를 통한 퀘스트 갱신
                refreshQuest();
            } else {
                setQuizResult('incorrect');
                setExplanation("오답입니다. 다시 시도해보세요!");
            }
        } catch (err) {
            console.error("퀴즈 제출 에러:", err);
        }
    };

    if (step === 'closed') return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >

            {/* 1. 선물 상자 오픈 애니메이션 */}
            {step === 'opening' && (
                <div className="flex flex-col items-center animate-bounce" onClick={(e) => e.stopPropagation()}>
                    <Gift size={120} className="text-pink-500 drop-shadow-[0_0_20px_rgba(236,72,153,0.6)]" />
                    <p className="text-white font-bold mt-4 text-xl animate-pulse">선물을 여는 중...</p>
                </div>
            )}

            {/* 2. 선물 내용 (Windows 모달 스타일) */}
            {step === 'opened' && giftContent && (
                <div className="w-[92%] max-w-3xl bg-white border-[3px] border-[#2D3748] overflow-hidden flex flex-col max-h-[90vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>

                    {/* Retro Title Bar */}
                    <div className="bg-[#B3E5FC] border-b-[3px] border-[#2D3748] px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Gift size={20} className="text-[#2D3748]" />
                            <span className="text-base font-black text-[#2D3748]" style={{ fontFamily: 'RoundedFixedsys' }}>
                                gift_box.exe
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

                    {/* Tabs (Retro Style) */}
                    <div className="flex bg-[#F7FAFC] border-b-[3px] border-[#2D3748]">
                        <button
                            onClick={() => setActiveTab('quiz')}
                            className={`flex-1 py-3.5 font-black text-base flex items-center justify-center gap-3 transition-all
                                ${activeTab === 'quiz'
                                    ? 'bg-white text-[#2D3748] border-r-[3px] border-[#2D3748]'
                                    : 'bg-[#EDF2F7] text-[#718096] border-r-[3px] border-[#2D3748] hover:bg-[#E2E8F0]'}`}
                            style={{ fontFamily: 'RoundedFixedsys' }}
                        >
                            <HelpCircle size={18} /> 일일 퀴즈
                        </button>
                        <button
                            onClick={() => setActiveTab('blog')}
                            className={`flex-1 py-3.5 font-black text-base flex items-center justify-center gap-3 transition-all
                                ${activeTab === 'blog'
                                    ? 'bg-white text-[#2D3748]'
                                    : 'bg-[#EDF2F7] text-[#718096] hover:bg-[#E2E8F0]'}`}
                            style={{ fontFamily: 'RoundedFixedsys' }}
                        >
                            <BookOpen size={18} /> 추천 주제
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="p-7 md:p-9 overflow-y-auto custom-scrollbar flex-1 bg-white">

                        {/* --- QUIZ TAB --- */}
                        {activeTab === 'quiz' && (
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-[#FEEBC8] border-2 border-[#2D3748] text-[#744210] text-[10px] font-black uppercase" style={{ fontFamily: 'RoundedFixedsys' }}>
                                            TODAY_QUIZ.DAT
                                        </span>
                                    </div>
                                    <h3 className="text-2xl md:text-2xl font-black text-[#2D3748] leading-snug break-keep" style={{ fontFamily: 'RoundedFixedsys' }}>
                                        Q. {giftContent.quiz_item?.question || "주제를 불러오는 중..."}
                                    </h3>
                                </div>

                                <div className="grid gap-3">
                                    {giftContent.quiz_item?.options?.map((opt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                if (quizResult !== 'correct' && quizResult !== 'already_solved') {
                                                    setSelectedOption(idx);
                                                    setQuizResult(null);
                                                }
                                            }}
                                            disabled={quizResult === 'correct' || quizResult === 'already_solved'}
                                            className={`group w-full p-3.5 px-5 border-[3px] border-[#2D3748] flex items-center gap-5 transition-all
                                                ${selectedOption === idx
                                                    ? 'bg-[#E0F2FE] shadow-[3px_3px_0_0_#2D3748] translate-x-[-3px] translate-y-[-3px]'
                                                    : 'bg-white hover:bg-[#F7FAFC] shadow-[5px_5px_0_0_#CBD5E1]'
                                                }
                                                ${(quizResult === 'correct' || quizResult === 'already_solved') && selectedOption !== idx ? 'opacity-50' : ''}
                                            `}
                                        >
                                            <span className={`w-9 h-9 border-2 border-[#2D3748] flex items-center justify-center shrink-0 font-black text-base
                                                ${selectedOption === idx ? 'bg-[#93C5FD]' : 'bg-[#EDF2F7] group-hover:bg-[#E2E8F0]'}`}
                                                style={{ fontFamily: 'RoundedFixedsys' }}>
                                                {String.fromCharCode(65 + idx)}
                                            </span>
                                            <span className="flex-1 text-left font-bold text-[#4A5568] text-lg break-keep" style={{ fontFamily: 'Umdot' }}>{opt}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* 결과창 (Windows 스타일) */}
                                <div className="flex flex-col items-center gap-6" ref={resultRef}>
                                    {quizResult === 'correct' || quizResult === 'already_solved' ? (
                                        <div className="w-full bg-[#C6F6D5] border-[3px] border-[#2D3748] p-5 flex items-start gap-4 animate-fade-in shadow-[6px_6px_0_0_#9AE6B4]">
                                            <CheckCircle className="flex-shrink-0 text-[#2F855A]" size={24} />
                                            <div>
                                                <p className="font-black text-[#22543D] text-lg mb-0.5" style={{ fontFamily: 'RoundedFixedsys' }}>SUCCESS! 🎉</p>
                                                <p className="text-[#276749] font-bold text-base" style={{ fontFamily: 'Umdot' }}>{explanation}</p>
                                            </div>
                                        </div>
                                    ) : quizResult === 'incorrect' ? (
                                        <div className="w-full bg-[#FED7D7] border-[3px] border-[#2D3748] p-5 flex items-center gap-4 animate-shake shadow-[6px_6px_0_0_#FEB2B2]">
                                            <AlertCircle className="text-[#C53030]" size={24} />
                                            <span className="font-black text-[#822727] text-lg" style={{ fontFamily: 'Umdot' }}>오답입니다. 다시 시도해보세요!</span>
                                        </div>
                                    ) : null}

                                    {quizResult !== 'correct' && quizResult !== 'already_solved' && (
                                        <button
                                            onClick={handleSubmitQuiz}
                                            disabled={selectedOption === null}
                                            className={`w-full py-4.5 border-[3px] border-[#2D3748] font-black text-xl transition-all
                                                ${selectedOption !== null
                                                    ? 'bg-[#4A5568] text-white hover:bg-[#2D3748] shadow-[8px_8px_0_0_#CBD5E1] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                                                    : 'bg-[#EDF2F7] text-[#A0AEC0] cursor-not-allowed'}
                                            `}
                                            style={{ fontFamily: 'RoundedFixedsys' }}
                                        >
                                            SUBMIT_ANSWER
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- BLOG TAB --- */}
                        {activeTab === 'blog' && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2">
                                        <span className="px-4 py-1.5 bg-[#C6F6D5] border-2 border-[#2D3748] text-[#22543D] text-[10px] font-black uppercase" style={{ fontFamily: 'RoundedFixedsys' }}>
                                            TOPIC_RECOMMEND.TXT
                                        </span>
                                    </div>
                                    <div className="space-y-5">
                                        <h3 className="text-2xl font-black text-[#2D3748]" style={{ fontFamily: 'RoundedFixedsys' }}>
                                            {giftContent.blog_item?.title || "추천 주제가 없습니다."}
                                        </h3>
                                        <div className="bg-[#F7FAFC] p-7 border-[3px] border-[#2D3748] shadow-inner">
                                            <p className="text-[#4A5568] font-bold text-lg leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Umdot' }}>
                                                {giftContent.blog_item?.outline || "내용을 불러오는데 실패했습니다."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    onClick={() => {
                                        const text = `제목: ${giftContent.blog_item?.title}\n\n${giftContent.blog_item?.outline}`;
                                        navigator.clipboard.writeText(text);
                                        setIsCopied(true);
                                        setTimeout(() => navigate('/blog/post'), 1000);
                                    }}
                                    className={`p-7 border-[3px] border-[#2D3748] flex items-center gap-6 shadow-[6px_6px_0_0_#BEE3F8] cursor-pointer transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${isCopied ? 'bg-[#C6F6D5]' : 'bg-[#EBF8FF] hover:bg-[#bee3f8]'}`}
                                >
                                    <div className="bg-white p-3 border-2 border-[#2D3748] shadow-[3px_3px_0_0_#2D3748]">
                                        {isCopied ? <CheckCircle size={26} className="text-[#2F855A]" /> : <BookOpen size={26} className="text-[#3182CE]" />}
                                    </div>
                                    <div>
                                        <p className="text-lg font-black text-[#2A4365]" style={{ fontFamily: 'RoundedFixedsys' }}>
                                            {isCopied ? "주제가 복사되었습니다!" : "이 주제로 기록해볼까요?"}
                                        </p>
                                        <p className="text-base font-bold text-[#2B6CB0]" style={{ fontFamily: 'Umdot' }}>
                                            {isCopied ? "잠시 후 블로그 작성 페이지로 이동합니다..." : "작성 후 퀘스트 보상도 잊지 마세요!"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GiftBoxModal;
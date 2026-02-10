import React from 'react';
import eggImage from '../../../assets/images/egg/egg.png';
import { animalNames } from '../developerTestData';

// --- Local UI Elements for DeveloperTest (to avoid touching global common components) ---
const Window = ({ children, title, width = "max-w-3xl", color = "bg-[#B3E5FC]", noPadding = false }) => (
    <div className={`relative z-10 w-full ${width} transition-all duration-500`}>
        <div className="bg-white border-[3px] border-[#2D3748] shadow-[6px_6px_0_0_#A0AEC0]">
            <div className={`${color} border-b-[3px] border-[#2D3748] px-4 py-2 flex items-center justify-between`}>
                <span className="text-sm font-black text-[#2D3748]" style={{ fontFamily: 'RoundedFixedsys' }}>{title}</span>
                <div className="flex gap-1.5 text-[#2D3748]">
                    <div className="w-5 h-5 bg-white border-[2px] border-[#2D3748] flex items-center justify-center text-[10px] font-bold cursor-default">-</div>
                    <div className="w-5 h-5 bg-white border-[2px] border-[#2D3748] flex items-center justify-center text-[10px] font-bold cursor-default">□</div>
                    <div className="w-5 h-5 border-[2px] border-[#2D3748] flex items-center justify-center text-[10px] font-bold bg-[#FFB3B3] cursor-default">×</div>
                </div>
            </div>
            <div className={`${noPadding ? '' : 'p-6 md:p-8'} bg-white transition-all`}>
                {children}
            </div>
        </div>
    </div>
);

const GridBg = ({ children, bgColor = "bg-[#F0F9FF]", overlayColor = "rgba(125, 211, 252, 0.8)" }) => (
    <div className={`min-h-screen ${bgColor} relative flex items-center justify-center p-6 overflow-hidden`}>
        <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `
                linear-gradient(to right, ${overlayColor} 1px, transparent 1px),
                linear-gradient(to bottom, ${overlayColor} 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px'
        }}></div>
        <div className="relative z-10 w-full flex justify-center items-center">
            {children}
        </div>
    </div>
);

export const StartView = ({ onStart }) => (
    <GridBg>
        <Window title="welcome.exe" width="max-w-2xl" color="bg-[#FFD1DA]">
            <div className="text-center space-y-10">
                <div className="space-y-4">
                    <h1 className="text-5xl font-black text-[#4A5568] pb-6 tracking-tighter" style={{ fontFamily: 'RoundedFixedsys' }}>
                        개발자 유형 테스트
                    </h1>
                    <p className="text-2xl text-[#718096] font-bold">
                        나는 어떤 개발자일까? 🤔
                    </p>
                </div>
                <button
                    onClick={onStart}
                    className="bg-white border-[3px] border-[#2D3748] px-12 py-5 text-[#2D3748] font-black text-2xl hover:bg-[#F7FAFC] shadow-[4px_4px_0_0_#2D3748] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                    style={{ fontFamily: 'RoundedFixedsys' }}
                >
                    시작하기 ➔
                </button>
            </div>
        </Window>
    </GridBg>
);

export const QuestionView = ({ step, questions, onAnswer }) => {
    const currentQ = questions[step - 1];
    const progress = (step / questions.length) * 100;

    return (
        <GridBg>
            <div className="w-full max-w-2xl flex flex-col gap-6 animate-fade-in">
                <div className="space-y-2 bg-white/50 p-4 border-[3px] border-[#2D3748] shadow-[4px_4px_0_0_#A0AEC0]">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-black text-[#4A5568]" style={{ fontFamily: 'RoundedFixedsys' }}>ATTAINING DREAMS...</span>
                        <div className="text-right text-sm font-bold text-[#4A5568]" style={{ fontFamily: 'Mulmaru' }}>{Math.round(progress)}%</div>
                    </div>
                    <div className="h-5 bg-white border-[3px] border-[#2D3748] rounded-none overflow-hidden p-0.5">
                        <div className="h-full bg-sky-400 transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                <Window title={`question_${step}.exe`} width="max-w-none" color="bg-[#E0F2FE]">
                    <div className="space-y-8">
                        <div key={step} className="text-center py-4 animate-scale-in">
                            <h2 className="text-2xl md:text-3xl font-black text-[#2D3748] leading-tight" style={{ fontFamily: 'RoundedFixedsys' }}>
                                {currentQ.q}
                            </h2>
                        </div>

                        <div className="grid gap-4">
                            {currentQ.shuffledChoices?.map((choice, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => onAnswer(choice.value)}
                                    className="w-full p-5 bg-white border-[3px] border-[#2D3748] hover:bg-[#FEEBC8] text-[#2D3748] font-black text-lg shadow-[4px_4px_0_0_#CBD5E1] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-left flex items-center gap-4"
                                    style={{ fontFamily: 'RoundedFixedsys' }}
                                >
                                    <span className="w-8 h-8 bg-[#B3E5FC] border-2 border-[#2D3748] flex items-center justify-center shrink-0 text-sm">{idx + 1}</span>
                                    <span className="flex-1" style={{ fontFamily: 'Mulmaru' }}>{choice.text}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </Window>
            </div>
        </GridBg>
    );
};

export const ResultView = ({ result, onStartEggit, hasExistingAvatar }) => (

    <GridBg bgColor="bg-indigo-50" overlayColor="rgba(190, 227, 248, 0.6)">
        <div className="animate-result-pop">
            <Window title="test_result.txt" color="bg-[#BEE3F8]" width="max-w-4xl">
                <div className="text-center space-y-10">
                    <div className="space-y-4">
                        <p className="text-2xl font-black text-[#3182CE] tracking-[0.15em]" style={{ fontFamily: 'Mulmaru' }}>
                            {result.subtitle}
                        </p>
                        <h2 className="text-6xl md:text-7xl font-black text-[#2D3748] leading-none tracking-tighter" style={{ fontFamily: 'RoundedFixedsys, sans-serif' }}>
                            {result.title}
                        </h2>
                    </div>

                    <div className="bg-[#EDF2F7] p-8 border-[3px] border-[#2D3748] shadow-inner">
                        <p className="text-xl text-[#4A5568] font-black leading-relaxed" style={{ fontFamily: 'Mulmaru' }}>
                            {result.desc}
                        </p>
                    </div>

                    <div className="flex gap-3 justify-center flex-wrap pt-2">
                        {result.tags.map((tag, i) => (
                            <span key={i} className="px-6 py-2 bg-white text-[#2D3748] border-[2px] border-[#2D3748] font-black text-base shadow-[3px_3px_0_0_#cbd5e0]" style={{ fontFamily: 'Mulmaru' }}>
                                {tag}
                            </span>
                        ))}
                    </div>

                    <div className="pt-4 space-y-4">
                        <button
                            onClick={onStartEggit}
                            className="w-full py-6 bg-[#4A5568] hover:bg-[#2D3748] text-white border-[3px] border-[#2D3748] font-black text-2xl shadow-[6px_6px_0_0_#CBD5E1] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                            style={{ fontFamily: 'RoundedFixedsys' }}
                        >
                            START Eggit ➔
                        </button>

                        {hasExistingAvatar && (
                            <p className="text-sm font-bold text-pink-500 animate-pulse" style={{ fontFamily: 'Mulmaru' }}>
                                (이미 아바타가 있는 유저는 아바타가 변경되지 않아요!)
                            </p>
                        )}
                    </div>

                </div>
            </Window>
        </div>
    </GridBg>
);

export const EggView = ({ animState, onEggClick }) => {
    if (animState === 'egg') {
        return (
            <GridBg>
                <div className="relative z-10 flex flex-col items-center gap-16 animate-fade-in">
                    <div onClick={onEggClick} className="cursor-pointer transition-transform hover:scale-110 active:scale-90 animate-bounce-slow">
                        <img src={eggImage} alt="egg" className="w-[30rem] h-[30rem] object-contain drop-shadow-[10px_10px_0_0_rgba(45,55,72,0.1)]" />
                    </div>
                    <div className="animate-bounce">
                        <p className="text-3xl font-black text-[#4A5568]" style={{ fontFamily: 'RoundedFixedsys' }}>
                            알이 깨어나려고 해요!
                        </p>
                        <p className="text-xl font-black text-[#5f656f] text-center" style={{ fontFamily: 'RoundedFixedsys' }}>
                            (클릭으로 부화시키기)
                        </p>
                    </div>
                </div>
            </GridBg>
        );
    }

    if (animState === 'cracking') {
        return (
            <GridBg>
                <div className="relative z-10 animate-shake">
                    <img src={eggImage} alt="cracking egg" className="w-[30rem] h-[30rem] object-contain drop-shadow-[10px_10px_0_0_rgba(45,55,72,0.1)]" />
                </div>
            </GridBg>
        );
    }

    return null;
};

export const HatchedView = ({ currentUser, resultCode, childImageSrc }) => (
    <GridBg bgColor="bg-white" overlayColor="rgba(255, 209, 218, 0.4)">
        <div className="absolute inset-0 bg-white animate-flash z-50 pointer-events-none"></div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
            {[...Array(12)].map((_, i) => (
                <span key={i} className="animate-sparkle-once text-5xl absolute" style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.5}s`
                }}>✨</span>
            ))}
        </div>

        <Window title="system message: new friend acquired!" color="bg-[#FFD1DA]">
            <div className="text-center space-y-12 animate-slide-up">
                <div className="space-y-4">
                    <h1 className="text-6xl font-black text-[#FFB3B3] tracking-tighter" style={{ fontFamily: 'RoundedFixedsys' }}>
                        CONGRATULATIONS!
                    </h1>
                    <p className="text-3xl font-black text-[#4A5568]" style={{ fontFamily: 'RoundedFixedsys' }}>
                        {currentUser?.name || currentUser?.username || '당신'}님만을 위한 아바타 탄생! ✨
                    </p>
                </div>

                <div className="relative py-8">
                    <div className="absolute inset-0 flex items-center justify-center -z-10">
                        <div className="w-[28rem] h-[28rem] bg-[#FFF5F5] rounded-full blur-[40px] animate-pulse"></div>
                    </div>

                    {childImageSrc && (
                        <img src={childImageSrc} alt="character" className="w-[18rem] h-[18rem] mx-auto object-contain drop-shadow-[8px_8px_0_0_#FFF0F0] animate-bounce-slow" />
                    )}
                </div>

                <p className="text-2xl text-[#A0AEC0] font-black animate-pulse" style={{ fontFamily: 'RoundedFixedsys' }}>
                    잠시 후 보금자리로 이동합니다...
                </p>
            </div>
        </Window>
    </GridBg>
);

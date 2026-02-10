import React, { useEffect, useMemo } from 'react';
import useNotificationStore from '../../store/useNotificationStore';
import { animalNames } from '../../pages/DeveloperTest/developerTestData';
import { Crown, Sparkles, Zap, Stars } from 'lucide-react';

const EvolutionOverlay = () => {
    const { evolution, hideEvolution, setEvolutionStage } = useNotificationStore();
    const { show, resultCode, childImage, adultImage, isMaster, animStage } = evolution;

    useEffect(() => {
        if (show) {
            setEvolutionStage('strange');
            const t1 = setTimeout(() => {
                setEvolutionStage('evolving');
                const t2 = setTimeout(() => {
                    setEvolutionStage('result');
                }, isMaster ? 3000 : 1500);
                return () => clearTimeout(t2);
            }, isMaster ? 3000 : 2500);
            return () => clearTimeout(t1);
        }
    }, [show, setEvolutionStage, isMaster]);

    // Master를 위한 랜덤 파티클 생성
    const particles = useMemo(() => {
        if (!show || !isMaster) return [];
        return [...Array(40)].map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 4 + 2,
            delay: Math.random() * 2,
            duration: Math.random() * 2 + 1,
            color: ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d'][Math.floor(Math.random() * 4)] // 황금/호박색 계열로 변경
        }));
    }, [show, isMaster]);

    if (!show) return null;

    const animalName = animalNames[resultCode] || "동물";

    return (
        <div className={`level-up-overlay ${isMaster ? 'bg-black/95' : 'bg-black/80'}`}>
            <style>{`
                @keyframes cosmic-pulse {
                    0%, 100% { transform: scale(1); opacity: 0.3; }
                    50% { transform: scale(1.2); opacity: 0.6; }
                }
                @keyframes master-aura {
                    0% { box-shadow: 0 0 30px #fbbf24, 0 0 60px #f59e0b; }
                    50% { box-shadow: 0 0 80px #fbbf24, 0 0 120px #fcd34d; }
                    100% { box-shadow: 0 0 30px #fbbf24, 0 0 60px #f59e0b; }
                }
                .master-glow { animation: master-aura 2s infinite ease-in-out; }
            `}</style>

            {/* Background Effects for Master */}
            {isMaster && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-900/40 via-yellow-900/20 to-black/30"></div>
                    {particles.map(p => (
                        <div
                            key={p.id}
                            className="absolute rounded-full animate-pulse"
                            style={{
                                left: `${p.x}%`,
                                top: `${p.y}%`,
                                width: `${p.size}px`,
                                height: `${p.size}px`,
                                backgroundColor: p.color,
                                boxShadow: `0 0 10px ${p.color}`,
                                animationDelay: `${p.delay}s`,
                                animationDuration: `${p.duration}s`
                            }}
                        />
                    ))}
                    {animStage === 'evolving' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-[800px] h-[800px] bg-yellow-400/10 rounded-full animate-[cosmic-pulse_4s_infinite]"></div>
                        </div>
                    )}
                </div>
            )}

            {/* Flash Effect */}
            {animStage === 'evolving' && (
                <div className="absolute inset-0 bg-white animate-flash z-[20002] pointer-events-none"></div>
            )}

            <div className="level-up-content relative z-[20001] max-w-2xl w-full px-6">
                {/* Strange Stage */}
                {animStage === 'strange' && (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h2 className={`text-4xl md:text-6xl font-black italic drop-shadow-[0_0_15px_rgba(239,68,68,0.6)] ${isMaster ? 'text-amber-400' : 'text-red-500'}`} style={{ fontFamily: 'RoundedFixedsys' }}>
                                {isMaster ? "세상의 중심이 흔들립니다...!" : "\"어... 어라?!?\""}
                            </h2>
                            <p className="text-2xl font-bold text-white drop-shadow-md">
                                {isMaster ? `전설적인 존재가 눈을 뜨려 합니다...` : `${animalName}(이)가 이상해요!!!`}
                            </p>
                        </div>
                        <div className={`relative ${isMaster ? 'animate-evolution-intense-shake' : 'animate-evolution-shake'}`}>
                            <div className={`absolute -inset-8 ${isMaster ? 'bg-amber-600/20' : 'bg-red-500/10'} rounded-full blur-3xl animate-pulse`}></div>
                            <img src={childImage} alt="child" className={`w-56 h-56 mx-auto object-contain relative z-10 ${isMaster ? 'brightness-125 saturate-150' : 'opacity-90'}`} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className={`w-72 h-72 border-4 border-dashed rounded-full animate-spin-slow ${isMaster ? 'border-amber-400/50' : 'border-red-400/50'}`}></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Evolving Stage */}
                {animStage === 'evolving' && (
                    <div className="space-y-8">
                        <div className="flex flex-col items-center">
                            {isMaster ? (
                                <div className="space-y-2">
                                    <div className="flex justify-center gap-4 text-amber-400 animate-bounce">
                                        <Stars size={40} />
                                        <Stars size={40} />
                                        <Stars size={40} />
                                    </div>
                                    <h2 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-600 animate-pulse drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]" style={{ fontFamily: 'RoundedFixedsys' }}>
                                        MASTER ASCENSION
                                    </h2>
                                </div>
                            ) : (
                                <h2 className="text-6xl font-black text-yellow-400 animate-pulse drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]" style={{ fontFamily: 'RoundedFixedsys' }}>
                                    EVOLVING...
                                </h2>
                            )}
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                {[...Array(isMaster ? 40 : 15)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="level-up-star"
                                        style={{
                                            '--dx': `${(Math.random() - 0.5) * (isMaster ? 1000 : 600)}px`,
                                            '--dy': `${(Math.random() - 0.5) * (isMaster ? 1000 : 600)}px`,
                                            animationDelay: `${Math.random() * 0.5}s`,
                                            background: isMaster ? (Math.random() > 0.5 ? '#fbbf24' : '#f59e0b') : '#facc15'
                                        }}
                                    ></div>
                                ))}
                            </div>
                            <div className={`w-64 h-64 mx-auto rounded-full animate-ping ${isMaster ? 'bg-amber-400/30' : 'bg-yellow-400/20'}`}></div>
                            {isMaster && <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-flash" size={80} />}
                        </div>
                    </div>
                )}

                {/* Result Stage */}
                {animStage === 'result' && (
                    <div className="space-y-10 animate-result-pop">
                        <div className="space-y-6">
                            {isMaster && (
                                <div className="flex justify-center items-center gap-3 mb-2">
                                    <div className="h-[2px] w-20 bg-gradient-to-r from-transparent to-yellow-400"></div>
                                    <div className="bg-yellow-400 p-2 rounded-lg rotate-12 shadow-lg">
                                        <Crown className="text-gray-900" size={32} />
                                    </div>
                                    <div className="h-[2px] w-20 bg-gradient-to-l from-transparent to-yellow-400"></div>
                                </div>
                            )}
                            <h2 className={`font-black tracking-tighter ${isMaster ? 'text-7xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-amber-600 drop-shadow-[0_0_40px_rgba(251,191,36,0.9)]' : 'text-6xl md:text-7xl text-yellow-400 drop-shadow-[0_0_25px_rgba(251,191,36,0.7)]'}`} style={{ fontFamily: 'RoundedFixedsys' }}>
                                {isMaster ? "LEGENDARY MASTER" : "SUCCESS!"}
                            </h2>
                            <div className="space-y-2">
                                <p className="text-3xl font-bold text-white drop-shadow-lg flex items-center justify-center gap-3">
                                    {isMaster && <Sparkles className="text-yellow-400" />}
                                    {isMaster ? `전설의 마스터로 재탄생!` : `멋진 ${animalName}(으)로 진화했어요!`}
                                    {isMaster && <Sparkles className="text-yellow-400" />}
                                </p>
                                {isMaster && <p className="text-amber-200 font-bold opacity-80 italic">모든 지식을 섭렵한 진정한 개발 거장</p>}
                            </div>
                        </div>

                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center justify-center -z-10">
                                <div className={`w-96 h-96 rounded-full blur-[80px] animate-pulse ${isMaster ? 'bg-amber-600/30' : 'bg-yellow-400/20'}`}></div>
                                {isMaster && <div className="absolute w-[500px] h-[500px] bg-yellow-400/10 rounded-full animate-ping"></div>}
                            </div>
                            <img src={adultImage} alt="adult" className={`w-80 h-80 mx-auto object-contain animate-bounce-slow`} />
                        </div>

                        <button
                            onClick={hideEvolution}
                            className={`px-16 py-5 font-black rounded-2xl transition-all active:translate-y-1 active:shadow-none text-2xl group relative overflow-hidden ${isMaster ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-gray-900 shadow-[0_8px_0_0_#92400e]' : 'bg-yellow-400 hover:bg-yellow-500 text-gray-900 shadow-[0_8px_0_0_#b45309]'}`}
                            style={{ fontFamily: 'RoundedFixedsys' }}
                        >
                            <span className="relative z-10 flex items-center gap-3">
                                함께하기
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EvolutionOverlay;

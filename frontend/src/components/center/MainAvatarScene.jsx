import React from 'react';
import { Home, Sun, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import TitleLogo from '../../assets/images/TitleLogo.png';
import InsideBg from '../../assets/images/inside.png';
import OutsideBg from '../../assets/images/outside.png';

const MainAvatarScene = ({

    isMe,
    isOutside,
    setIsOutside,
    avatarData,
    needsTest,
    currentQuote,
    avatarSrc,
    deployStatus,
    deployMessage,
    navigate,
    showLogo = true,
    showToggle = true
}) => {

    return (
        <div className="flex flex-col h-full relative" style={{ zIndex: 0 }}>
            {/* Nest Area */}
            <div className="h-full relative overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 background-feather"
                    style={{ backgroundImage: `url(${isOutside ? OutsideBg : InsideBg})` }}
                ></div>

                {isOutside && isMe && <div className="outside-light-beam"></div>}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `radial-gradient(#000 1px, transparent 1px)`,
                        backgroundSize: '24px 24px'
                    }}
                ></div>



                {/* Logo Section */}
                {showLogo && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex justify-center w-full">
                        <img src={TitleLogo} alt="Eggit Logo" className="w-48 h-auto opacity-90" />
                    </div>
                )}

                {/* Outside Toggle */}
                {showToggle && (
                    <div className="absolute top-4 right-4 z-20">
                        <button
                            onClick={() => setIsOutside(!isOutside)}
                            className="w-14 h-14 bg-white/50 backdrop-blur-xl border-2 border-white rounded-2xl flex items-center justify-center cursor-pointer hover:bg-white/60 hover:scale-105 active:scale-95 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.15)] group background-toggle-button"
                            title={isOutside ? "집 안으로" : "밖으로"}
                        >
                            {isOutside ? (
                                <Home size={28} className="text-indigo-600 group-hover:text-indigo-700" />
                            ) : (
                                <Sun size={28} className="text-amber-500 group-hover:text-amber-600" />
                            )}
                        </button>
                    </div>
                )}
            </div>


            {/* Avatar Area */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 5, paddingTop: '25%', paddingBottom: '5%' }}>
                <div className="relative pointer-events-auto flex items-center justify-center w-full h-full px-10 avatar-scene-container">
                    {/* Speech Bubble - My Avatar */}
                    {isMe && (deployStatus !== 'idle' || needsTest || currentQuote) && (
                        <>
                            {/* Deployment 진행 중 */}
                            {deployStatus === 'loading' && deployMessage && (
                                <div className="absolute bottom-[65%] left-1/2 -translate-x-1/2 mb-6 z-50 w-max max-w-[260px]">
                                    <div className="speech-bubble-tiled p-4 text-center animate-fade-in">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Loader2 size={18} className="animate-spin text-blue-600" />
                                            <p className="text-gray-900 font-bold text-xs leading-relaxed whitespace-pre-wrap break-keep" style={{ fontFamily: 'Umdot' }}>
                                                {deployMessage}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Deployment 성공 */}
                            {deployStatus === 'success' && deployMessage && (
                                <div className="absolute bottom-[65%] left-1/2 -translate-x-1/2 mb-6 z-50 w-max max-w-[280px]">
                                    <div className="speech-bubble-tiled p-4 text-center animate-fade-in">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <CheckCircle2 size={18} className="text-green-600" />
                                            <p className="text-gray-900 font-bold text-xs leading-relaxed whitespace-pre-wrap break-keep" style={{ fontFamily: 'Umdot' }}>
                                                {deployMessage}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Deployment 실패 */}
                            {deployStatus === 'error' && deployMessage && (
                                <div className="absolute bottom-[65%] left-1/2 -translate-x-1/2 mb-6 z-50 w-max max-w-[260px]">
                                    <div className="speech-bubble-tiled p-4 text-center animate-fade-in">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <AlertCircle size={18} className="text-red-600" />
                                            <p className="text-gray-900 font-bold text-xs leading-relaxed whitespace-pre-wrap break-keep" style={{ fontFamily: 'Umdot' }}>
                                                {deployMessage}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 일반 상태 - 알 깨기 유도 */}
                            {deployStatus === 'idle' && needsTest && (
                                <div
                                    onClick={() => {
                                        console.log("[Debug] MainAvatarScene Clicked. AvatarData:", avatarData);
                                        // DEFAULT 타입이거나 아예 없으면 테스트 처음으로 보내야 함
                                        const isDefault = !avatarData?.match_type || avatarData.match_type === 'DEFAULT';

                                        if (avatarData?.match_type && !isDefault) {
                                            console.log("[Debug] Navigating to EGG mode with match_type:", avatarData.match_type);
                                            navigate('/test', { state: { mode: 'egg', matchType: avatarData.match_type } });
                                        } else {
                                            console.warn("[Debug] Default or No match_type found. Navigating to start of test.");
                                            // 🛠️ 테스트 결과가 없는 경우 테스트 처음으로 보냄
                                            navigate('/test');
                                        }
                                    }}


                                    className="absolute bottom-[65%] left-1/2 -translate-x-1/2 mb-6 z-50 cursor-pointer hover:scale-105 transition-transform active:scale-95"
                                >

                                    <div className="speech-bubble-tiled p-2 text-center animate-fade-in">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <p className="text-gray-900 font-bold text-sm leading-relaxed" style={{ fontFamily: 'Umdot' }}>
                                                알을 깨러 가볼까요?
                                                <br />
                                                ( 말풍선을 클릭해주세요! )
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 일반 대사 */}
                            {deployStatus === 'idle' && !needsTest && currentQuote && (
                                <div className="absolute bottom-[65%] left-1/2 -translate-x-1/2 mb-6 z-50">
                                    <div className="speech-bubble-tiled p-2 text-center animate-fade-in">
                                        <p className="text-gray-900 font-bold text-sm leading-relaxed" style={{ fontFamily: 'Umdot' }}>
                                            {currentQuote}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Friend's Avatar Quotes */}
                    {!isMe && currentQuote && (
                        <div className="absolute bottom-[65%] left-1/2 -translate-x-1/2 mb-6 z-50">
                            <div className="speech-bubble-tiled p-2 text-center animate-fade-in">
                                <p className="text-gray-900 font-bold text-sm leading-relaxed" style={{ fontFamily: 'Umdot' }}>
                                    {currentQuote}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Avatar Image */}
                    <div className={`relative w-60 h-60 flex items-center justify-center transition-transform duration-500 hover:scale-105 z-20 avatar-container ${isOutside ? 'outside-avatar-shadow animate-float' : 'drop-shadow-2xl animate-float'}`}>
                        {avatarSrc ? (
                            <img src={avatarSrc} alt="Avatar" className="h-full w-full object-contain" />
                        ) : (
                            <span className="text-7xl">🥚</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MainAvatarScene;

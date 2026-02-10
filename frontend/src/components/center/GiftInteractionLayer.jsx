import React from 'react';
import { Gift } from 'lucide-react';
import GiftBoxModal from './GiftBoxModal';
import useTutorialStore from '../../store/useTutorialStore';

const GiftInteractionLayer = ({ isMe, giftStatus, showGiftModal, setShowGiftModal, setGiftStatus, customPosition = "right-20" }) => {
    const { isActive: isTutorialActive } = useTutorialStore();

    // 튜토리얼 진행 중이거나, 자신의 페이지가 아니거나, 선물이 없으면 숨김
    if (!isMe || giftStatus === 'none' || isTutorialActive) return null;


    return (
        <>
            {/* Gift Modal */}
            {showGiftModal && (
                <GiftBoxModal
                    onClose={() => {
                        setShowGiftModal(false);
                        setGiftStatus('opened');
                    }}
                />
            )}

            {/* Gift Layer (Unopened) */}
            {giftStatus === 'unopened' && !showGiftModal && (
                <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 100 }}>
                    <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] animate-fade-in pointer-events-auto">
                        <button
                            className="flex flex-col items-center cursor-pointer group outline-none border-none bg-transparent gift-box"
                            onClick={() => setShowGiftModal(true)}
                        >
                            <div className="relative mb-6 transform transition-transform duration-300 group-hover:scale-110">
                                <Gift size={120} className="text-pink-500 drop-shadow-[0_0_30px_rgba(236,72,153,0.8)] animate-bounce" />
                                <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full border-1 border-white animate-ping"></div>
                            </div>

                            <div className="bg-white/80 backdrop-blur-xl px-8 py-4 rounded-2xl border-2 border-white shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover:bg-white/100 group-hover:scale-105 active:scale-95">
                                <p className="text-lg font-black text-gray-800">🎁 오늘의 선물이 도착했습니다!</p>
                                <p className="text-xs text-center text-gray-600 font-bold mt-1 opacity-80">클릭해서 열어보세요</p>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Gift Layer (Opened) - Small toggle icon */}
            {giftStatus === 'opened' && (
                <div className={`absolute top-4 ${customPosition} z-20 pointer-events-auto`}>

                    <button
                        onClick={() => setShowGiftModal(true)}
                        className="w-14 h-14 bg-white/50 backdrop-blur-xl border-2 border-white rounded-2xl flex items-center justify-center cursor-pointer hover:bg-white/60 hover:scale-105 active:scale-95 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.15)] group gift-box"
                        title="오늘의 선물 다시 보기"
                    >
                        <div className="relative">
                            <Gift size={28} className="text-pink-500 group-hover:text-pink-600 transition-colors" />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                    </button>
                </div>
            )}
        </>
    );
};

export default GiftInteractionLayer;

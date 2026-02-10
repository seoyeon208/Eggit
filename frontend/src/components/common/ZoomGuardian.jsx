import React, { useState, useEffect } from 'react';

const ZoomGuardian = () => {
    const [isBlocked, setIsBlocked] = useState(false);
    const [reason, setReason] = useState('');
    const [ignored, setIgnored] = useState(false);

    useEffect(() => {
        const checkScale = () => {
            const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isTooNarrow = window.innerWidth < 1050;

            if (isMobileUA) {
                // Mobile is handled by MainPage.jsx specialized UI
                setIsBlocked(false);
            } else if (isTooNarrow) {
                setIsBlocked(true);
                setReason('브라우저 창이 너무 좁거나 화면 배율이 높습니다.\n최적의 경험을 위해 창을 최대화하고\n화면 배율을 80%~90%로 조정해 주세요! 🔍');
            } else {
                setIsBlocked(false);
            }
        };

        checkScale();
        window.addEventListener('resize', checkScale);
        return () => window.removeEventListener('resize', checkScale);
    }, []);

    if (!isBlocked || ignored) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-[#F0F9FF] flex items-center justify-center p-8 text-center select-none animate-fade-in">
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `
          linear-gradient(rgba(125, 211, 252, 0.8) 1px, transparent 1px),
          linear-gradient(90deg, rgba(125, 211, 252, 0.8) 1px, transparent 1px)
        `,
                backgroundSize: '32px 32px'
            }}></div>

            <div className="relative z-10 max-w-lg w-full bg-white border-[4px] border-[#2D3748] shadow-[12px_12px_0_0_#A0AEC0] p-8 space-y-6 animate-scale-in">
                <div className="space-y-4">
                    <h2 className="text-2xl font-black text-[#2D3748]" style={{ fontFamily: 'RoundedFixedsys' }}>
                        화면 최적화 안내
                    </h2>
                    <p className="text-sm text-[#4A5568] font-bold leading-relaxed whitespace-pre-line" style={{ fontFamily: 'Umdot' }}>
                        {reason}
                    </p>
                </div>

                <div className="flex flex-col gap-4 items-center">
                    <div className="text-xs text-[#A0AEC0] font-bold">
                        (PC Chrome 브라우저 권장)
                    </div>
                    <button
                        onClick={() => setIgnored(true)}
                        className="text-[10px] text-[#CBD5E0] hover:text-[#A0AEC0] underline underline-offset-2 transition-colors"
                    >
                        무시하고 이용하기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ZoomGuardian;

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * MobileOrientationBanner
 * Shows a banner on mobile devices (especially in landscape) to recommend PC view.
 * Shows a full-screen overlay in portrait to force landscape.
 */
const MobileOrientationBanner = () => {
    const [isMobileLandscape, setIsMobileLandscape] = useState(false);
    const [isMobilePortrait, setIsMobilePortrait] = useState(false);
    const [showBanner, setShowBanner] = useState(() => {
        return localStorage.getItem('hideMobileBanner') !== 'true';
    });

    useEffect(() => {
        const checkMode = () => {
            const isMobile = window.innerWidth <= 1024;
            const isLandscape = window.innerWidth > window.innerHeight;
            setIsMobileLandscape(isMobile && isLandscape);
            setIsMobilePortrait(isMobile && !isLandscape);
        };

        checkMode();
        window.addEventListener('resize', checkMode);
        return () => window.removeEventListener('resize', checkMode);
    }, []);

    const handleCloseBanner = (e) => {
        e.stopPropagation();
        setShowBanner(false);
        localStorage.setItem('hideMobileBanner', 'true');
    };

    // 1. Portrait Mode - Full Screen Overlay (Cannot be dismissed usually, to guide user)
    if (isMobilePortrait) {
        return (
            <div className="fixed inset-0 z-[10000] bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
                <div className="bg-white border-4 border-gray-800 shadow-[12px_12px_0_0_rgba(0,0,0,0.3)] p-8 max-sm:max-w-[280px] w-full space-y-6 text-center animate-scale-in">
                    <div className="text-6xl mb-4">📱➡️</div>
                    <h2 className="text-xl font-black text-gray-800" style={{ fontFamily: 'RoundedFixedsys' }}>
                        화면을 가로로 돌려주세요!
                    </h2>
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600 font-bold leading-relaxed" style={{ fontFamily: 'Umdot' }}>
                            간단히 이용하려면,<br />
                            <span className="text-blue-600 font-black">화면잠금을 풀고 가로로</span> 들어주세요!
                        </p>
                        <p className="text-[11px] text-gray-400 font-bold" style={{ fontFamily: 'Umdot' }}>
                            PC 브라우저에서는<br />더 많은 기능을 이용할 수 있어요. 💻
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Landscape Mode - Top Banner (Dismissible)
    if (isMobileLandscape && showBanner) {
        return (
            <div className="fixed top-0 left-0 w-full bg-[#FFFBF0]/95 backdrop-blur-md border-b-2 border-[#EADCC0] text-[#866D48] py-2 px-6 flex items-center justify-between flex-shrink-0 z-[10000] animate-slide-down shadow-md">
                <div className="flex items-center gap-2">
                    <span className="text-sm">📢</span>
                    <p className="text-[10px] sm:text-xs font-bold leading-tight" style={{ fontFamily: 'Umdot' }}>
                        Eggit은 PC 환경에 최적화되어있습니다! 더 다양한 기능을 원하시면 PC버전으로 접속해주세요!
                    </p>
                </div>
                <button
                    onClick={handleCloseBanner}
                    className="p-1.5 hover:bg-[#F2E8D5] rounded-full transition-colors text-[#A68F68] ml-2"
                >
                    <X size={16} />
                </button>
            </div>
        );
    }

    return null;
};

export default MobileOrientationBanner;

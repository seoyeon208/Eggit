import { useState, useEffect } from 'react';
import { Github } from 'lucide-react';
import TitleLogo from '../../assets/images/TitleLogo.png';
import LoginBg from '../../assets/images/LoginBg.jpg';

const LoginPage = () => {
    const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const REDIRECT_URI = `${window.location.origin}/auth/callback`;
    const SCOPE = "public_repo,user,workflow";

    const fullText = "당신의 개발, 알차게 부화시키세요! Eggit";
    const [displayText, setDisplayText] = useState("");
    const [index, setIndex] = useState(0);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // 모바일 감지 기준을 좀 더 엄격하게 조정 (데스크탑에서 쉽게 모바일로 변하지 않도록)
        const checkMobile = () => setIsMobile(window.innerHeight < 600 || window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (index < fullText.length) {
            const timeout = setTimeout(() => {
                setDisplayText(prev => prev + fullText[index]);
                setIndex(prev => prev + 1);
            }, 100);
            return () => clearTimeout(timeout);
        }
    }, [index, fullText]);

    const handleLogin = () => {
        if (!CLIENT_ID) {
            alert("GitHub Client ID가 설정되지 않았습니다. .env 파일을 확인해주세요.");
            return;
        }
        window.location.href = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPE}`;
    };

    return (
        <div
            className="relative h-[100dvh] w-full flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden bg-white"
            style={{
                backgroundImage: `url(${LoginBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            {/* Content Container */}
            <div className={`flex flex-col items-center z-10 w-full max-w-4xl px-4 flex-shrink ${isMobile ? 'gap-2' : 'gap-8'}`}>
                {/* Logo Section */}
                <div className={`w-full animate-float flex justify-center flex-shrink ${isMobile ? 'max-w-[220px]' : 'max-w-[400px]'}`}>
                    <img
                        src={TitleLogo}
                        alt="EGGIT Logo"
                        className="w-full h-auto drop-shadow-2xl"
                    />
                </div>

                {/* Tagline Section */}
                <div className={`text-center flex flex-col items-center justify-center w-full flex-shrink ${isMobile ? 'py-1' : 'py-3'}`}>
                    <div className="flex items-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.1)] whitespace-nowrap">
                        <p className={`${isMobile ? 'text-lg' : 'text-4xl'} font-normal text-gray-800 tracking-tight`} style={{ fontFamily: 'RoundedFixedsys' }}>
                            {displayText}
                        </p>
                        <span className={`animate-cursor ${isMobile ? 'text-lg' : 'text-4xl'} ml-1 text-sky-500`}></span>
                    </div>
                    <p className={`text-gray-600 transition-opacity duration-1000 ${index >= fullText.length ? 'opacity-100' : 'opacity-0'} drop-shadow-[0_1px_2px_rgba(0,0,0,0.05)] whitespace-nowrap break-keep ${isMobile ? 'text-[11px] mt-1.5' : 'text-xl mt-4'}`} style={{ fontFamily: 'RoundedFixedsys' }}>
                        편리하고 지속가능한 나만의 개발 기록 둥지
                    </p>
                </div>

                {/* Login Button Section */}
                <div className={`w-full max-w-md flex flex-col items-center flex-shrink ${isMobile ? 'mt-4' : 'mt-12'}`}>
                    <button
                        onClick={handleLogin}
                        className={`w-full flex items-center justify-center bg-gray-900 text-white rounded-2xl shadow-2xl hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 group ${isMobile ? 'max-w-[260px] gap-3 py-3.5' : 'max-w-sm gap-5 py-5'}`}
                    >
                        <Github size={isMobile ? 20 : 32} className="group-hover:rotate-12 transition-transform" />
                        <span className={`${isMobile ? 'text-base' : 'text-xl'} font-normal tracking-widest`} style={{ fontFamily: 'RoundedFixedsys' }}>GitHub로 로그인하기</span>
                    </button>
                    <p className={`text-center text-gray-400 font-medium opacity-80 ${isMobile ? 'text-[9px] mt-3 max-w-[240px]' : 'text-xs mt-8'}`}>
                        로그인 시 EGGIT의 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
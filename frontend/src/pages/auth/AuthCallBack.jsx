import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import apiClient from '../../utils/apiClient';
import useAuthStore from '../../store/useAuthStore';
import useNotificationStore from '../../store/useNotificationStore';

// Dynamically import all avatar images
const avatarImages = import.meta.glob('../../assets/images/child/*.png', { eager: true });
const avatarPaths = Object.values(avatarImages).map(mod => mod.default);

export default function AuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const processedRef = useRef(false);
    const [currentCharIdx, setCurrentCharIdx] = useState(0);
    const { notify } = useNotificationStore();

    // Rotate characters
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentCharIdx(prev => (prev + 1) % avatarPaths.length);
        }, 150); // Fast rotation
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const code = searchParams.get("code");
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        // [New] 에러 처리 (권한 거부 등)
        if (error) {
            if (!processedRef.current) {
                processedRef.current = true;
                if (error === 'access_denied') {
                    alert("GitHub 권한 설정이 거부되었습니다.\n서비스 이용을 위해 권한이 필요합니다.");
                } else {
                    alert(`로그인 오류가 발생했습니다.\n내용: ${errorDescription || error}`);
                }
                navigate("/login", { replace: true });
            }
            return;
        }

        if (code && !processedRef.current) {
            processedRef.current = true;

            // API call immediately (animation runs in parallel)
            apiClient.post(`/auth/login/github`, null, {
                params: {
                    code,
                    redirect_uri: `${window.location.origin}/auth/callback`
                }
            }).then((res) => {
                console.log("로그인 성공:", res.data);

                // 1. 토큰은 이제 HttpOnly 쿠키로 자동 저장됨 (백엔드가 Set-Cookie)
                // 호환성 유지를 위해 auth store에도 저장
                useAuthStore.getState().setToken(res.data.access_token);

                // 2. 아바타 정보 저장 (있다면)
                if (res.data.avatar) {
                    localStorage.setItem("avatar", JSON.stringify(res.data.avatar));
                }

                // 3. 🎯 퀘스트 체크인 결과 확인 및 알림
                if (res.data.quest_check_in) {
                    const questResult = res.data.quest_check_in;


                    if (!questResult.already_completed) {
                        // 첫 출석: 토스트 알림 표시
                        const message = `${questResult.message} (Lv.${questResult.current_level})`;


                        // 글로벌 토스트 알림
                        notify(message, "success");


                        console.log("✅ 출석 퀘스트 달성 (보상 수령 대기):", questResult);
                    } else {
                        console.log("ℹ️ 오늘 이미 출석했습니다.");
                    }
                }

                // 4. 백엔드에서 받은 정보로 페이지 결정
                const hasAvatar = res.data.has_avatar;
                const matchType = res.data.avatar?.match_type;

                // 아바타가 없거나, 있더라도 아직 DEFAULT(알) 상태면 테스트 페이지로
                if (hasAvatar && matchType !== 'DEFAULT') {
                    navigate("/", { replace: true });
                } else {
                    navigate("/test", { replace: true });
                }

            })
                .catch((err) => {
                    console.error("로그인 에러:", err);
                    notify("로그인에 실패했습니다. 서버 상태를 확인해주세요.", "error");
                    navigate("/login", { replace: true });
                });
        }
    }, [searchParams, navigate, notify]);

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 overflow-hidden">
            <div className="relative flex flex-col items-center gap-8">
                {/* Character Rotation Area */}
                <div className="w-40 h-40 relative flex items-center justify-center">
                    {/* Spinning ring background */}
                    <div className="absolute inset-0 border-8 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>

                    {/* Character image */}
                    <div className="relative w-28 h-28 flex items-center justify-center z-10">
                        {avatarPaths.length > 0 && (
                            <img
                                src={avatarPaths[currentCharIdx]}
                                alt="Loading Character"
                                className="w-full h-full object-contain animate-bounce-slow"
                            />
                        )}
                    </div>
                </div>

                {/* Text Area */}
                <div className="text-center space-y-3 z-10">
                    <h2 className="text-2xl font-black text-gray-800 tracking-tight" style={{ fontFamily: 'RoundedFixedsys' }}>
                        GitHub로 로그인 중이에요
                    </h2>
                    <div className="flex gap-1 justify-center">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                    </div>
                </div>
            </div>

            {/* Background elements */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
        </div>
    );
}
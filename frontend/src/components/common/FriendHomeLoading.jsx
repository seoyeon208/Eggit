import { useEffect, useState } from 'react';

// Dynamically import all avatar images
const avatarImages = import.meta.glob('../../assets/images/child/*.png', { eager: true });
const avatarPaths = Object.values(avatarImages).map(mod => mod.default);

/**
 * FriendHomeLoading Component
 * Displays a loading screen when navigating to a friend's home
 * Matches the AuthCallback loading screen style
 */
const FriendHomeLoading = ({ friendName, isReturningHome = false }) => {
    const [currentCharIdx, setCurrentCharIdx] = useState(0);

    // Rotate characters
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentCharIdx(prev => (prev + 1) % avatarPaths.length);
        }, 150); // Fast rotation
        return () => clearInterval(interval);
    }, []);

    const message = isReturningHome
        ? "내 둥지로 돌아가는 중이에요"
        : friendName
            ? `${friendName}님의 둥지에 놀러가고 있어요`
            : "친구 둥지에 놀러가고 있어요";

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 overflow-hidden">
            <div className="relative flex flex-col items-center gap-8">
                {/* Character Rotation Area */}
                <div className="w-40 h-40 relative flex items-center justify-center">
                    {/* Spinning ring background */}
                    <div className="absolute inset-0 border-8 border-gray-200 border-t-green-500 rounded-full animate-spin"></div>

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
                        {message}
                    </h2>
                    <div className="flex gap-1 justify-center">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                    </div>
                </div>
            </div>

            {/* Background elements */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
        </div>
    );
};

export default FriendHomeLoading;

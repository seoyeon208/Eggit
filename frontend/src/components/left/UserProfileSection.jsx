import React from 'react';

const UserProfileSection = ({
    avatarSrc,           // 전달받는 prop 이름 수정
    level,               // 전달받는 prop 이름 수정
    experience,          // 전달받는 prop 이름 수정
    maxExperience,       // 전달받는 prop 이름 수정
    animalName,          // 전달받는 prop 이름 수정
    username,            // 전달받는 prop 이름 수정
    isCharging,
    hasLoaded
}) => {
    return (
        <div className="flex items-center space-x-2.5 mb-2 profile-section">
            {/* Profile Picture with Character Badge */}
            <div className="w-14 h-14 relative flex-shrink-0">
                {/* GitHub Profile Picture */}
                <div className="w-full h-full bg-gray-200 rounded-full overflow-hidden border-2 border-gray-100 shadow-sm">
                    <img
                        src={`https://github.com/${username || 'github'}.png`}
                        alt="profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${username || 'User'}&background=random`
                        }}
                    />
                </div>
                {/* Character Badge Overlay */}
                {avatarSrc && (
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full border-2 border-gray-100 shadow-md overflow-hidden">
                        <img src={avatarSrc} alt="character" className="w-full h-full object-cover" />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 overflow-hidden mb-1">
                    <span className="font-bold text-gray-800 truncate text-base">
                        {username || 'Guest'}
                    </span>
                    <div className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full border border-blue-100 whitespace-nowrap">
                        Lv.{level || 1}
                    </div>
                </div>
                <div className="text-xs text-gray-500 truncate mb-1.5">{animalName}</div>
                <div>
                    <div id="exp-bar-container" className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-0.5 relative">
                        <div
                            className={`h-full exp-bar-base ${isCharging ? 'exp-charging-state' : ''} ${hasLoaded ? '' : 'w-0'}`}
                            style={{ width: `${(experience / maxExperience) * 100 || 0}%` }}
                        >
                            {/* Shimmer effect when charging */}
                            {isCharging && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer"></div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                        <span>Exp</span>
                        <span>{experience || 0} / {maxExperience || 10}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfileSection;

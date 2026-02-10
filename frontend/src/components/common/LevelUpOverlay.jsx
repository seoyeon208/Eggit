import { useEffect } from 'react';
import useNotificationStore from '../../store/useNotificationStore';

/**
 * LevelUpOverlay Component
 * Full-screen level-up celebration overlay
 */
const LevelUpOverlay = () => {
    const { levelUp, hideLevelUp } = useNotificationStore();
    const { show } = levelUp;

    // Auto-hide after 1.2 seconds
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                hideLevelUp();
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [show, hideLevelUp]);

    if (!show) return null;

    return (
        <div className="level-up-overlay bg-black/70">
            <div className="level-up-content">
                <h2 className="text-8xl font-black text-yellow-400 animate-pulse drop-shadow-[0_0_50px_rgba(251,191,36,1)]" style={{ fontFamily: 'RoundedFixedsys', textShadow: '0 0 60px rgba(251,191,36,0.9), 0 0 30px rgba(251,191,36,0.6)' }}>
                    LEVEL UP!
                </h2>
                <div className="relative h-32 w-32 mx-auto mt-8">
                    {[...Array(25)].map((_, i) => (
                        <div
                            key={i}
                            className="level-up-star"
                            style={{
                                '--dx': `${(Math.random() - 0.5) * 700}px`,
                                '--dy': `${(Math.random() - 0.5) * 700}px`,
                                animationDelay: `${i * 0.02}s`,
                                background: Math.random() > 0.5 ? '#facc15' : '#fbbf24'
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LevelUpOverlay;

import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, UserPlus, Trash2 } from 'lucide-react';

const getTypeStyles = (type) => {
    switch (type) {
        case 'success':
            return {
                bg: 'bg-green-50',
                border: 'border-green-500',
                icon: <CheckCircle className="text-green-500" size={24} />,
                iconBg: 'bg-green-100'
            };
        case 'error':
            return {
                bg: 'bg-red-50',
                border: 'border-red-500',
                icon: <AlertCircle className="text-red-500" size={24} />,
                iconBg: 'bg-red-100'
            };
        case 'friend':
            return {
                bg: 'bg-blue-50',
                border: 'border-blue-500',
                icon: <UserPlus className="text-blue-500" size={24} />,
                iconBg: 'bg-blue-100'
            };
        case 'delete':
            return {
                bg: 'bg-red-50',
                border: 'border-red-400',
                icon: <Trash2 className="text-red-500" size={24} />,
                iconBg: 'bg-red-100'
            };
        default:
            return {
                bg: 'bg-gray-50',
                border: 'border-gray-500',
                icon: <Info className="text-gray-500" size={24} />,
                iconBg: 'bg-gray-100'
            };
    }
};

/**
 * Passive Toast Component
 */
const Toast = ({ show, message, type, duration, onClose }) => {
    useEffect(() => {
        if (show && duration > 0) {
            const timer = setTimeout(() => {
                onClose?.();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration, onClose]);

    if (!show) return null;

    const styles = getTypeStyles(type);

    return (
        <div className="fixed top-6 right-6 z-[9999] animate-slide-down">
            <div className={`relative ${styles.bg} ${styles.border} border-l-4 rounded-xl shadow-2xl p-4 pr-12 min-w-[280px] max-w-[90vw] md:max-w-xl flex items-center gap-4`}>
                <div className={`${styles.iconBg} p-2 rounded-xl flex-shrink-0`}>
                    {styles.icon}
                </div>
                <p className="text-sm font-black text-gray-800 leading-normal whitespace-pre-wrap break-keep">
                    {message}
                </p>
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1 hover:bg-white/50 rounded-lg transition-colors"
                >
                    <X size={16} className="text-gray-400" />
                </button>
            </div>
        </div>
    );
};

/**
 * Active Modal Component
 */
const ConfirmationModal = ({ show, message, type, actionLabel, onAction, onClose }) => {
    useEffect(() => {
        if (!show) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                onAction?.();
            } else if (e.key === 'Escape') {
                onClose?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [show, onAction, onClose]);

    if (!show) return null;

    const styles = getTypeStyles(type);

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            ></div>

            <div className={`relative ${styles.bg} ${styles.border} w-full max-w-lg border-2 rounded-2xl shadow-2xl p-8 scale-in`}>
                <div className="flex flex-col items-center text-center gap-6">
                    <div className={`${styles.iconBg} p-4 rounded-2xl animate-bounce-slow`}>
                        {styles.icon}
                    </div>
                    <p className="text-lg font-black text-gray-800 leading-relaxed whitespace-pre-wrap break-keep">
                        {message}
                    </p>
                    <div className="flex justify-center gap-3 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 text-sm font-black rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all active:scale-95"
                        >
                            취소
                        </button>
                        <button
                            onClick={onAction}
                            className={`flex-1 py-3 text-sm font-black rounded-xl transition-all shadow-lg active:scale-95 text-white ${type === 'delete' || type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-200'
                                }`}
                        >
                            {actionLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * NotificationPopup Component
 * Main entry point that renders both Toast and Modal based on store state.
 */
const NotificationPopup = ({ toast, modal, onToastClose, onModalClose }) => {
    return (
        <>
            <Toast
                show={toast.show}
                message={toast.message}
                type={toast.type}
                duration={toast.duration}
                onClose={onToastClose}
            />
            <ConfirmationModal
                show={modal.show}
                message={modal.message}
                type={modal.type}
                actionLabel={modal.actionLabel}
                onAction={modal.onAction}
                onClose={onModalClose}
            />
        </>
    );
};

export default NotificationPopup;

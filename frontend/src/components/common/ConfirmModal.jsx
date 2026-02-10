import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", isProcessing = false }) {
    if (!isOpen) return null;

    return (
        // 1. 배경 (Overlay)
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            
            {/* 2. 모달 컨텐츠 (Modal Content) */}
            {/* transform 관련 클래스 제거 및 mx-auto 적용 */}
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-gray-200">
                
                {/* Header */}
                <div className="bg-amber-50 p-4 flex items-center gap-3 border-b border-amber-100">
                    <div className="bg-amber-100 p-2 rounded-full flex-shrink-0">
                        <AlertTriangle className="text-amber-600" size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-amber-800 flex-1 break-words">
                        {title}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-amber-100">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 bg-white">
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap break-keep">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg transition-colors shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? (
                            <>
                                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                                Processing...
                            </>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
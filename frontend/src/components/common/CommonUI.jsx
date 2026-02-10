/**
 * 공통 패널 컴포넌트
 */
export const Panel = ({ children, className = "", useTile = true }) => (
    <div className={`flex flex-col relative overflow-visible ${useTile ? 'panel-border' : 'bg-white border-2 border-gray-300 shadow-sm'} ${className}`}>
        <div className={`flex-1 overflow-auto ${useTile ? 'panel-content-tight' : 'p-5'}`}>
            {children}
        </div>
    </div>
);

/**
 * 공통 액션 버튼 컴포넌트
 */
export const ActionButton = ({ icon: Icon, label, primary = false, onClick, className = "" }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-center space-x-2 py-2.5 px-3 border-2 rounded-lg transition-all
    ${primary
                ? 'border-gray-800 bg-gray-800 text-white hover:bg-gray-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'} 
    ${className}`}
    >
        {Icon && <Icon size={18} />}
        <span className="font-bold text-sm">{label}</span>
    </button>
);

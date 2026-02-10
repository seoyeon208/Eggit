import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FloatingBackButton({ className = "" }) {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate('/')}
            className={`fixed top-8 left-8 z-50 flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-gray-700 hover:text-blue-600 border border-gray-200 group ${className}`}
            title="메인으로 돌아가기"
        >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium">홈으로</span>
        </button>
    );
}

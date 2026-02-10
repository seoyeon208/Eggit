import { useState, useEffect } from "react";
import {
    Sparkles, Lightbulb, BookOpen, Code, ArrowRight, Loader2, Copy, Check, GitBranch, FileText, RotateCcw
} from "lucide-react";
import SourceTreeSelector from "./SourceTreeSelector";
import useNotificationStore from "../../store/useNotificationStore";


export default function AIAssistant({
    isGenerating,
    aiRecommendations,
    onApplyExample,
    onApplyTopic,

    // New Props for Integration
    currentMode = 'tech', // 'tech' | 'docs'
    sourceRepos = [],     // for Tech
    docsSourceFiles,      // for Docs
    onGenerate,           // (payload) => void
    onReset,              // () => void
    initialTitle = "",
    activeDocPath = null
}) {
    const { notify } = useNotificationStore();
    const [activeTab, setActiveTab] = useState('topics');

    // Tech Inputs
    const [targetRepo, setTargetRepo] = useState("");

    // Docs Inputs
    const [docTitle, setDocTitle] = useState("");
    const [selectedRefs, setSelectedRefs] = useState([]);
    const [userPrompt, setUserPrompt] = useState("");

    // Effect: Docs 추천 파일 자동 선택
    useEffect(() => {
        if (docsSourceFiles && docsSourceFiles.length > 0) {
            const aiPicks = docsSourceFiles.filter(f => f.recommended).map(f => f.path);
            setSelectedRefs(aiPicks);
        } else {
            setSelectedRefs([]);
        }
    }, [docsSourceFiles]);

    // Effect: Sync Title from Parent (e.g. when post selected)
    useEffect(() => {
        if (initialTitle) setDocTitle(initialTitle);
    }, [initialTitle]);

    // Handlers
    const handleDocsScan = () => {
        if (!docTitle.trim()) return notify("문서 주제나 제목을 입력해주세요.", "error");
        onGenerate({
            type: 'docs_recommend',
            doc_title: docTitle,
            doc_path: activeDocPath
        });
    };

    const handleDocsGenerate = () => {
        if (selectedRefs.length === 0) return notify("참고할 파일을 최소 1개 선택해주세요.", "error");
        onGenerate({
            type: 'docs_copilot',
            reference_files: selectedRefs,
            user_prompt: userPrompt
        });
    };

    const handleSourceToggle = (path) => {
        setSelectedRefs(prev => {
            if (prev.includes(path)) return prev.filter(p => p !== path);
            if (prev.length >= 10) { notify("최대 10개까지 선택 가능합니다.", "error"); return prev; }
            return [...prev, path];
        });
    };

    // [View 1] Loading State
    if (isGenerating) {
        return (
            <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col items-center justify-center h-full font-sans">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-purple-200 rounded-full animate-ping opacity-20"></div>
                    <div className="bg-white p-4 rounded-full shadow-lg border border-purple-100 relative z-10">
                        <Loader2 className="animate-spin text-purple-600" size={32} />
                    </div>
                </div>
                <p className="text-gray-800 font-bold animate-pulse text-sm">AI가 작업을 수행 중입니다...</p>
                <div className="flex gap-1 mt-3">
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                </div>
            </div>
        );
    }

    // [View 2] Result State (Recommendations exist)
    if (aiRecommendations && Object.keys(aiRecommendations).length > 0) {
        const { recommended_topics = [], key_concepts = [], code_examples = [] } = aiRecommendations;

        return (
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full shadow-2xl z-30 font-sans ai-panel">
                {/* Header with Reset */}
                <div className="px-5 py-4 border-b border-gray-100 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-purple-600 fill-purple-100" size={18} />
                        <h3 className="font-black text-gray-900 tracking-tight">AI Suggestions</h3>
                    </div>
                    {onReset && (
                        <button
                            onClick={onReset}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="초기화 / 다시 시작"
                        >
                            <RotateCcw size={14} />
                        </button>
                    )}
                </div>

                {/* Tab Navigation */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50/50 border-b border-gray-100">
                    <TabButton
                        active={activeTab === 'topics'}
                        onClick={() => setActiveTab('topics')}
                        icon={Lightbulb}
                        label="주제 추천"
                        count={recommended_topics.length}
                        activeClass="bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm"
                        iconClass="text-yellow-500"
                    />
                    <TabButton
                        active={activeTab === 'concepts'}
                        onClick={() => setActiveTab('concepts')}
                        icon={BookOpen}
                        label="핵심 개념"
                        count={key_concepts.length}
                        activeClass="bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                        iconClass="text-blue-500"
                    />
                    <TabButton
                        active={activeTab === 'examples'}
                        onClick={() => setActiveTab('examples')}
                        icon={Code}
                        label="코드 예시"
                        count={code_examples.length}
                        activeClass="bg-green-50 text-green-700 border-green-200 shadow-sm"
                        iconClass="text-green-500"
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white">
                    {/* Topics */}
                    {activeTab === 'topics' && (
                        <div className="space-y-3 animate-fade-in">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">추천 제목 ({recommended_topics.length})</h4>
                            {recommended_topics.length > 0 ? recommended_topics.map((topic, idx) => (
                                <div key={idx} className="group bg-white p-4 rounded-xl border-2 border-gray-100 hover:border-yellow-400 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                                    onClick={() => onApplyTopic && onApplyTopic(topic.title)}>
                                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                                        <CopyButton text={topic.title} className="text-gray-400 hover:text-yellow-600 bg-white/80 hover:bg-yellow-50" />
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-800 mb-2 pr-4 leading-snug group-hover:text-yellow-700 transition-colors">
                                        {topic.title}
                                    </h4>
                                    <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-2 mt-2">{topic.reason}</p>
                                </div>
                            )) : <EmptyState message="추천된 주제가 없습니다." />}
                        </div>
                    )}

                    {/* Concepts */}
                    {activeTab === 'concepts' && (
                        <div className="space-y-3 animate-fade-in">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">핵심 개념 ({key_concepts.length})</h4>
                            {key_concepts.length > 0 ? key_concepts.map((concept, idx) => (
                                <div key={idx} className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 hover:bg-blue-50 transition-colors relative group">
                                    <div className="absolute top-2 right-2">
                                        <CopyButton text={`${concept.name}\n\n${concept.description}`} className="text-blue-300 hover:text-blue-600 hover:bg-blue-100" />
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-200"></span>
                                        <h4 className="text-sm font-bold text-gray-900">{concept.name}</h4>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed pl-4 border-l-2 border-blue-200 ml-1">
                                        {concept.description}
                                    </p>
                                </div>
                            )) : <EmptyState message="분석된 핵심 개념이 없습니다." />}
                        </div>
                    )}

                    {/* Examples */}
                    {activeTab === 'examples' && (
                        <div className="space-y-4 animate-fade-in">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">코드 예시 ({code_examples.length})</h4>
                            {code_examples.length > 0 ? code_examples.map((example, idx) => (
                                <div key={idx} className="bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-700 group">
                                    <div className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
                                        <span className="text-xs font-bold text-gray-300 truncate max-w-[180px] flex items-center gap-2">
                                            <Code size={12} className="text-green-400" />
                                            {example.title}
                                        </span>
                                        <CopyButtonWithLabel text={example.code} />
                                    </div>
                                    <div className="p-3 overflow-x-auto custom-scrollbar bg-gray-900/50">
                                        <pre className="text-[11px] font-mono text-green-300 leading-relaxed tabular-nums">
                                            {example.code}
                                        </pre>
                                    </div>
                                    {example.description && (
                                        <div className="px-3 py-2 bg-gray-800/50 border-t border-gray-700 text-[10px] text-gray-400 italic">
                                            💡 {example.description}
                                        </div>
                                    )}
                                </div>
                            )) : <EmptyState message="생성된 코드 예시가 없습니다." />}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // [View 3] Request Form State (Default)
    return (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full shadow-2xl z-30 font-sans ai-panel">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-purple-50 flex items-center gap-2">
                <Sparkles className="text-purple-600" size={18} />
                <h3 className="font-black text-purple-900 tracking-tight">AI Assistant</h3>
                <span className={`text-[10px] uppercase font-bold text-white px-2 py-0.5 rounded ml-auto ${currentMode === 'tech' ? 'bg-teal-500' : 'bg-purple-400'}`}>
                    {currentMode === 'tech' ? 'TECH' : 'DOCS'}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-white">
                {currentMode === 'tech' ? (
                    <div className="space-y-6 animate-fade-in">
                        <div className="text-center space-y-2 mb-6 mt-4">
                            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto text-teal-600 mb-3 shadow-inner">
                                <GitBranch size={32} />
                            </div>
                            <h4 className="font-bold text-gray-900 text-lg">기술 블로그 초안 생성</h4>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                GitHub 커밋 기록과 코드 변경사항을 분석하여<br />회고록이나 기술 포스트 초안을 작성합니다.
                            </p>
                        </div>

                        <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-100 style-preset-selector">
                            <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                                1. 분석할 저장소 선택
                            </label>
                            <select
                                value={targetRepo}
                                onChange={(e) => setTargetRepo(e.target.value)}
                                className="w-full p-3 border rounded-xl text-xs bg-white outline-none focus:ring-2 focus:ring-teal-100 transition-shadow"
                            >
                                <option value="">저장소를 선택해주세요...</option>
                                {sourceRepos.map(r => <option key={r.id} value={r.full_name}>{r.name}</option>)}
                            </select>
                        </div>

                        <button
                            onClick={() => onGenerate({ type: 'tech_blog', targetRepo })}
                            disabled={!targetRepo}
                            className="w-full py-3.5 bg-teal-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none transition-all flex items-center justify-center gap-2 transform active:scale-95 generate-button"
                        >
                            <Sparkles size={16} /> 초안 생성하기
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        <div className="text-center space-y-2 mb-4 mt-4">
                            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto text-purple-600 mb-3 shadow-inner">
                                <FileText size={32} />
                            </div>
                            <h4 className="font-bold text-gray-900 text-lg">문서 기반 초안 생성</h4>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                프로젝트 내 관련 문서를 스캔하고<br />참조하여 새로운 문서를 작성합니다.
                            </p>
                        </div>

                        {!docsSourceFiles ? (
                            <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100 style-preset-selector">
                                <label className="text-xs font-bold text-gray-700 block">작성할 문서 주제 / 제목</label>
                                <input
                                    type="text"
                                    value={docTitle}
                                    onChange={(e) => setDocTitle(e.target.value)}
                                    placeholder="예: 배포 가이드, API 명세서..."
                                    className="w-full p-3 border rounded-xl text-xs outline-none focus:border-purple-500 transition-colors bg-white"
                                />
                                <button
                                    onClick={handleDocsScan}
                                    disabled={!docTitle.trim()}
                                    className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none transition-all mt-2 generate-button"
                                >
                                    관련 문서 스캔 시작
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b pb-2">
                                    <label className="text-xs font-bold text-gray-900">참조 파일 선택 ({selectedRefs.length})</label>
                                    <button
                                        onClick={onReset}
                                        className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-red-50"
                                    >
                                        <RotateCcw size={12} /> 다시 스캔
                                    </button>
                                </div>
                                <SourceTreeSelector
                                    sourceFiles={docsSourceFiles}
                                    selectedFiles={selectedRefs}
                                    onToggle={handleSourceToggle}
                                />

                                <textarea
                                    value={userPrompt}
                                    onChange={(e) => setUserPrompt(e.target.value)}
                                    placeholder="추가 요청사항 (선택)..."
                                    className="w-full p-3 border rounded-xl text-xs outline-none focus:border-purple-500 min-h-[80px] bg-gray-50 focus:bg-white transition-colors"
                                />

                                <button
                                    onClick={handleDocsGenerate}
                                    className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-purple-700 transition-all flex items-center justify-center gap-2 active:scale-95 generate-button"
                                >
                                    <Sparkles size={16} /> 문서 생성하기
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Sub Components ---

const TabButton = ({ active, onClick, icon: Icon, label, count, activeClass, iconClass }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center py-4 rounded-xl transition-all duration-300 border relative overflow-hidden group ${active
            ? `${activeClass} scale-[1.02] ring-2 ring-offset-2 ring-transparent`
            : 'bg-white border-transparent text-gray-400 hover:bg-gray-100 hover:text-gray-600 opacity-70 hover:opacity-100'
            }`}
    >
        <div className={`relative mb-1.5 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
            <Icon size={22} className={active ? iconClass : 'text-gray-400 group-hover:text-gray-600'} strokeWidth={active ? 2.5 : 2} />
            {count > 0 && (
                <span className={`absolute -top-1.5 -right-2.5 bg-gray-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] shadow-sm z-10 border border-white ${!active && 'bg-gray-500'}`}>
                    {count}
                </span>
            )}
        </div>
        <span className="text-[10px] font-bold tracking-tight">{label}</span>
    </button>
);

const EmptyState = ({ message }) => (
    <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <Sparkles className="text-gray-400" size={20} />
        </div>
        <p className="text-xs text-gray-500 font-medium">{message}</p>
    </div>
);

const CopyButton = ({ text, className = "text-gray-400 hover:text-gray-600" }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            type="button"
            onClick={handleCopy}
            className={`transition-all active:scale-95 p-1.5 rounded-lg ${className}`}
            title="클립보드에 복사"
        >
            {copied ? <Check size={14} className="text-green-500" strokeWidth={3} /> : <Copy size={14} strokeWidth={2} />}
        </button>
    );
};

const CopyButtonWithLabel = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={handleCopy}
            className={`text-[10px] px-2.5 py-1 rounded-md font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 ${copied
                ? 'bg-green-500 text-white border border-green-600'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600'
                }`}
        >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? 'Copied!' : 'Copy'}
        </button>
    );
};
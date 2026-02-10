import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
    Bold, Italic, Code, List, ListOrdered, Heading1, Heading2, Quote, Link as LinkIcon, Image, Eye, FileCode, Save,
    User, Bot, PenTool, FileSearch
} from "lucide-react";
import useNotificationStore from "../../store/useNotificationStore";

export default function MarkdownEditor({
    visible,
    category, setCategory,
    postTitle, setPostTitle,
    markdownContent, setMarkdownContent,
    onUpload, // 서버 최종 업로드 핸들러
    isUploadLoading,
    onAddImage,
    uploadPath,
    onRestoreUser,   // 사용자 작업 데이터 복원
    onRestoreAI,     // AI 초안 데이터 복원
    onSaveUser,      // [중요] 임시 저장 핸들러 (부모의 handleSaveWorkspace 연결)
    hasUserWorkspace,
    hasAIHistory,
    sourceMode,      // [New] 부모 제어 모드 State
    onModeSwitch     // [New] 부모 제공 스위칭 핸들러
}) {
    const [viewMode, setViewMode] = useState('code'); // code | preview
    const textareaRef = useRef(null);
    const [errorMsg, setErrorMsg] = useState(""); // [New] 에러 메시지 상태

    const { notify } = useNotificationStore();

    // [Handler] 모드 변경
    const handleModeSwitch = (mode) => {
        if (mode === sourceMode) return;
        onModeSwitch(mode);
    };

    // [Handler] 임시 저장 (서버 업로드 X)
    const handleLocalSave = () => {
        if (onSaveUser) {
            onSaveUser();
            notify("현재 상태가 '내 작업'에 임시 저장되었습니다.", "success");
        }
    };

    // --- 마크다운 삽입 로직 ---
    const insertMarkdown = (before, after = '', placeholder = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = markdownContent.substring(start, end);
        const textToInsert = selectedText || placeholder;

        const newText =
            markdownContent.substring(0, start) +
            before + textToInsert + after +
            markdownContent.substring(end);

        setMarkdownContent(newText);

        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + before.length + textToInsert.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const insertLineMarkdown = (prefix) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const beforeCursor = markdownContent.substring(0, start);
        const lineStart = beforeCursor.lastIndexOf('\n') + 1;

        const newText =
            markdownContent.substring(0, lineStart) +
            prefix +
            markdownContent.substring(lineStart);

        setMarkdownContent(newText);

        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + prefix.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setErrorMsg("");

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (!file.type.startsWith('image/')) return;

            // [Fix] 이미지 용량 체크 (5MB)
            if (file.size > 5 * 1024 * 1024) {
                setErrorMsg("이미지 용량이 큽니다 (5MB 제한). 업로드 불가.");
                setTimeout(() => setErrorMsg(""), 3000); // 3초 후 자동 제거
                return;
            }

            if (onAddImage) {
                const blobUrl = onAddImage(file);
                insertMarkdown(`\n\n![${file.name}](${blobUrl})\n\n`, '', '');
            }
        }
    };

    // --- 훅(Hooks)은 조건부 리턴보다 위에 위치해야 함 ---
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea || !visible) return;

        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                const key = e.key.toLowerCase();
                if (key === 's') {
                    e.preventDefault();
                    handleLocalSave();
                    return;
                }
                if (viewMode !== 'code') return;
                switch (key) {
                    case 'b': e.preventDefault(); insertMarkdown('**', '**', 'bold text'); break;
                    case 'i': e.preventDefault(); insertMarkdown('*', '*', 'italic text'); break;
                    case 'k': e.preventDefault(); insertMarkdown('[', '](url)', 'link text'); break;
                    case 'e': e.preventDefault(); insertMarkdown('`', '`', 'code'); break;
                    case '1': e.preventDefault(); insertLineMarkdown('# '); break;
                    case '2': e.preventDefault(); insertLineMarkdown('## '); break;
                    case 'l': e.preventDefault(); insertLineMarkdown('- '); break;
                    case 'o': e.preventDefault(); insertLineMarkdown('1. '); break;
                    default: break;
                }
            }
        };
        textarea.addEventListener('keydown', handleKeyDown);
        return () => textarea.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, markdownContent, onSaveUser, visible]);

    // 💡 모든 훅 호출이 끝난 후 조건부 리턴 수행 (Rules of Hooks 준수)
    if (!visible) return null;

    const toolbarButtons = [
        { Icon: Heading1, title: "Heading 1", action: () => insertLineMarkdown('# ') },
        { Icon: Heading2, title: "Heading 2", action: () => insertLineMarkdown('## ') },
        { Icon: Bold, title: "Bold", action: () => insertMarkdown('**', '**', 'bold text') },
        { Icon: Italic, title: "Italic", action: () => insertMarkdown('*', '*', 'italic text') },
        { Icon: Code, title: "Inline Code", action: () => insertMarkdown('`', '`', 'code') },
        { Icon: Quote, title: "Quote", action: () => insertLineMarkdown('> ') },
        { Icon: List, title: "Bullet List", action: () => insertLineMarkdown('- ') },
        { Icon: ListOrdered, title: "Numbered List", action: () => insertLineMarkdown('1. ') },
        { Icon: LinkIcon, title: "Link", action: () => insertMarkdown('[', '](url)', 'link text') },
        { Icon: Image, title: "Image", action: () => insertMarkdown('\n\n![alt text](', ')\n\n', 'image.jpg') },
    ];

    return (
        <div className="flex-1 bg-gray-50 p-4 flex flex-col h-full overflow-hidden font-sans animate-fade-in markdown-editor">

            {/* Top Toolbar: Path info & Mode Tabs */}
            <div className="flex justify-between items-end mb-3 px-1">
                <div className="flex flex-col gap-1 max-w-[50%]">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-bold text-gray-600 bg-gray-200 px-2 py-0.5 rounded text-[10px]">PATH</span>
                        <span className="font-mono truncate opacity-70" title={uploadPath || "Unsaved"}>
                            {uploadPath || "Unsaved (Draft)"}
                        </span>
                    </div>
                </div>

                {/* 세련된 모드 스위처 */}
                <div className="flex bg-gray-200 p-1 rounded-xl shadow-inner border border-gray-300">
                    <button
                        onClick={() => handleModeSwitch('user')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${sourceMode === 'user'
                            ? 'bg-white text-teal-700 shadow-md transform scale-105'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <User size={14} strokeWidth={sourceMode === 'user' ? 3 : 2} />
                        내 작업
                        {hasUserWorkspace && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-sm" />}
                    </button>
                    <button
                        onClick={() => handleModeSwitch('ai')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${sourceMode === 'ai'
                            ? 'bg-white text-purple-700 shadow-md transform scale-105'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Bot size={14} strokeWidth={sourceMode === 'ai' ? 3 : 2} />
                        AI 초안
                        {hasAIHistory && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-sm" />}
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col overflow-hidden">
                {/* Header & Controls */}
                <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between z-10">
                    <div className="flex-1 mr-6">
                        <input
                            type="text"
                            name="title"
                            value={postTitle}
                            onChange={(e) => setPostTitle(e.target.value)}
                            placeholder="글 제목을 입력하세요..."
                            className="w-full text-xl font-black text-gray-900 placeholder-gray-300 outline-none bg-transparent"
                        />
                        {errorMsg && <p className="text-xs text-red-500 font-bold mt-1 animate-bounce">⚠️ {errorMsg}</p>}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleLocalSave}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 border border-gray-200 transition-all hover:border-teal-300 hover:text-teal-600 active:scale-95"
                            title="현재 편집 상태 저장 (Ctrl+S)"
                        >
                            <Save size={14} /> 임시 저장
                        </button>

                        <div className="w-px h-6 bg-gray-200 mx-1" />

                        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                            <button
                                onClick={() => setViewMode('code')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'code' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                title="편집 모드"
                            >
                                <PenTool size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('preview')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                title="미리보기"
                            >
                                <Eye size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                {viewMode === 'code' && (
                    <div className="px-4 py-2 flex items-center gap-1 border-b border-gray-50 bg-gray-50/50 flex-wrap">
                        {toolbarButtons.map(({ Icon, title, action }, idx) => (
                            <button key={idx} onClick={action} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-500 hover:text-gray-900" title={title}>
                                <Icon size={18} />
                            </button>
                        ))}
                        <div className="w-px h-6 bg-gray-300 mx-2" />
                        <button onClick={() => insertMarkdown('\n```javascript\n', '\n```\n', '코드 작성')} className="px-3 py-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-[11px] font-bold border border-gray-200 text-gray-600 bg-white/50">Code Block</button>
                    </div>
                )}

                {/* Editor Body */}
                <div className="flex-1 overflow-hidden bg-white flex flex-col relative">
                    {viewMode === 'code' ? (
                        <textarea
                            ref={textareaRef}
                            value={markdownContent}
                            onChange={(e) => setMarkdownContent(e.target.value)}
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            className="w-full h-full p-8 border-none focus:ring-0 font-mono text-[14px] resize-none leading-relaxed custom-scrollbar outline-none text-gray-800 bg-white image-dropzone"
                            placeholder="이곳에 마크다운 내용을 작성하거나 이미지를 드래그 앤 드롭 하세요..."
                            spellCheck={false}
                        />
                    ) : (
                        <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-white">
                            <article className="prose prose-slate prose-sm sm:prose lg:prose-lg max-w-none">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        code({ node, inline, className, children, ...props }) {
                                            const match = /language-(\w+)/.exec(className || '')
                                            return !inline && match ? (
                                                <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" className="rounded-xl shadow-inner" {...props}>
                                                    {String(children).replace(/\n$/, '')}
                                                </SyntaxHighlighter>
                                            ) : (
                                                <code className="bg-red-50 text-red-500 px-1.5 py-0.5 rounded-md font-mono text-[0.9em]" {...props}>
                                                    {children}
                                                </code>
                                            )
                                        },
                                        h1: ({ node, ...props }) => <h1 className="text-3xl font-black border-b border-gray-100 pb-4 mb-8 mt-10 text-gray-900" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-2xl font-bold border-b border-gray-50 pb-3 mb-6 mt-10 text-gray-800" {...props} />,
                                        blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-teal-500 pl-6 py-2 italic my-8 text-gray-600 bg-teal-50/30 rounded-r-xl" {...props} />,
                                        img: ({ node, ...props }) => <img className="max-w-full h-auto rounded-2xl shadow-2xl my-10 mx-auto border border-gray-100" {...props} />,
                                        p: ({ node, ...props }) => <p className="mb-6 leading-8 text-gray-700 text-[16px]" {...props} />,
                                    }}
                                >
                                    {markdownContent || '*내용이 비어있습니다.*'}
                                </ReactMarkdown>
                            </article>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-400 flex justify-between items-center font-medium">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1.5"><List size={12} /> {markdownContent ? markdownContent.split('\n').length : 0} Lines</span>
                        <span className="flex items-center gap-1.5"><FileSearch size={12} /> {markdownContent ? markdownContent.length : 0} Chars</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={sourceMode === 'user' ? "text-teal-600 font-bold" : "text-gray-400"}>편집: 내 작업</span>
                        <span className="text-gray-200">|</span>
                        <span className={sourceMode === 'ai' ? "text-purple-600 font-bold" : "text-gray-400"}>미리보기: AI 초안</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
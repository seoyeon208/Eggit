import {
    GitBranch, Book, RefreshCw, PenTool, FileText, Sparkles, UploadCloud,
    Tag, Search, ArrowUp, ArrowDown, Save, X, List,
    ChevronRight, ChevronDown, Plus, Folder, Check,
    Image as ImageIcon, Hash, Pin, Loader2, RotateCcw, Rocket, MonitorUp,
    FolderPlus, FolderOpen, Home, Github, Globe, Layout, RefreshCcw, Settings, Upload, Layers
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useNotificationStore from "../../store/useNotificationStore";

// ============================================================================
// [Sub-Component] Source Tree Selector (Docs 모드용 - 기능 복원됨)
// AI가 추천한 파일 목록을 트리 구조로 보여주고 체크박스로 선택하는 핵심 컴포넌트
// ============================================================================
const SourceTreeSelector = ({ sourceFiles, selectedFiles, onToggle }) => {
    const tree = useMemo(() => {
        if (!sourceFiles) return {};
        const root = {};
        sourceFiles.forEach(file => {
            // 파일 경로 문자열을 '/' 기준으로 쪼개서 트리 객체 생성
            const parts = file.path.split('/');
            let current = root;
            parts.forEach((part, idx) => {
                if (!current[part]) {
                    current[part] = {
                        name: part,
                        path: parts.slice(0, idx + 1).join('/'),
                        children: {},
                        isFile: idx === parts.length - 1,
                        recommended: file.recommended,
                        score: file.score
                    };
                }
                current = current[part].children;
            });
        });
        return root;
    }, [sourceFiles]);

    const renderNode = (nodes, depth = 0) => {
        return Object.values(nodes).map(node => {
            const isSelected = selectedFiles.includes(node.path);
            return (
                <div key={node.path} className="select-none">
                    <div className={`flex items-center gap-2 py-1 px-2 rounded transition-colors ${depth > 0 ? 'ml-3' : ''} ${isSelected ? 'bg-purple-100/70' : 'hover:bg-purple-50'}`}>
                        {node.isFile ? (
                            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => onToggle(node.path)}
                                    className="w-3 h-3 accent-purple-600 rounded cursor-pointer"
                                />
                                <FileText size={12} className={node.recommended ? "text-purple-600" : "text-gray-400"} />
                                <span className={`text-[11px] truncate ${node.recommended ? 'font-bold text-purple-700' : 'text-gray-600'}`}>
                                    {node.name}
                                </span>
                                {node.recommended && ( // AI 추천 배지
                                    <span className="text-[8px] bg-purple-600 text-white px-1.5 rounded-full flex items-center gap-0.5 ml-auto flex-shrink-0 shadow-sm">
                                        <Check size={8} strokeWidth={4} /> AI Pick
                                    </span>
                                )}
                            </label>
                        ) : (
                            <div className="flex items-center gap-1 text-gray-400">
                                <Folder size={12} className="fill-gray-100" />
                                <span className="text-[11px] font-bold text-gray-500">{node.name}</span>
                            </div>
                        )}
                    </div>
                    {!node.isFile && <div className="border-l border-gray-100 ml-2">{renderNode(node.children, depth + 1)}</div>}
                </div>
            );
        });
    };

    return (
        <div className="border-2 border-purple-100 rounded-lg max-h-64 overflow-y-auto bg-white p-2 custom-scrollbar shadow-inner mt-2">
            {sourceFiles && sourceFiles.length > 0 ? renderNode(tree) : (
                <div className="text-center py-6 text-gray-400 text-xs italic">
                    AI 분석 결과가 여기에 표시됩니다.
                </div>
            )}
        </div>
    );
};

// ============================================================================
// [Utility] Tree Builder (게시글 목록용)
// ============================================================================
const buildTreeWithDraft = (posts, draftInfo = null) => {
    if (!posts) return { home: null, folders: [], files: [] };

    const root = { home: null, folders: [], files: [] };
    const folderMap = {};
    const normalize = (name) => name ? String(name).trim() : "";

    const getOrCreateFolder = (pathStr) => {
        const parts = pathStr.split('/').map(normalize).filter(Boolean);
        let currentLevel = root.folders;
        let currentPath = "";
        let folderNode = null;

        parts.forEach((part) => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            if (!folderMap[currentPath]) {
                const newFolder = {
                    title: part,
                    path: `__virtual__/${currentPath}`,
                    category: currentPath,
                    type: 'folder',
                    children: [],
                    is_virtual: true,
                    nav_order: 999
                };
                folderMap[currentPath] = newFolder;
                currentLevel.push(newFolder);
            }
            folderNode = folderMap[currentPath];
            currentLevel = folderNode.children;
        });
        return folderNode;
    };

    posts.forEach(p => {
        if (p.path === 'index.md' || p.path === 'README.md') { root.home = p; return; }

        const isFolderIndex = p.is_index || p.path.endsWith('/index.md');
        if (isFolderIndex && p.category && p.category !== 'Home') {
            const folderNode = getOrCreateFolder(p.category);
            if (folderNode) {
                folderNode.is_virtual = false;
                Object.assign(folderNode, p);
                folderNode.path = p.path;
                folderNode.type = 'folder';
            }
        }
    });

    posts.forEach(p => {
        if (p.path === 'index.md' || p.path === 'README.md' || (p.is_index && p.category !== 'Home')) return;

        const node = { ...p, type: 'file' };
        if (!p.category || p.category === 'Home' || p.category === 'Uncategorized') {
            root.files.push(node);
        } else {
            const targetFolder = getOrCreateFolder(p.category);
            targetFolder.children.push(node);
        }
    });

    if (draftInfo && draftInfo.mode === 'create' && draftInfo.title) {
        const draftPath = draftInfo.category
            ? `${draftInfo.category}/${draftInfo.title}.md`
            : `${draftInfo.title}.md`;

        const draftNode = {
            title: draftInfo.title,
            path: draftPath,
            category: draftInfo.category,
            type: 'file',
            isDraft: true,
            nav_order: -1
        };

        if (!draftInfo.category || draftInfo.category === 'Home' || draftInfo.category === 'Uncategorized') {
            root.files.push(draftNode);
        } else {
            const targetFolder = getOrCreateFolder(draftInfo.category);
            targetFolder.children.push(draftNode);
        }
    }

    const sortNodes = (nodes) => {
        nodes.sort((a, b) => (a.nav_order ?? 999) - (b.nav_order ?? 999) || (a.title || "").localeCompare(b.title || ""));
        nodes.forEach(node => { if (node.children?.length) sortNodes(node.children); });
    };
    sortNodes(root.folders);
    sortNodes(root.files);

    return root;
};

// ============================================================================
// [Shared] Docs Tree Node Component (기존 포스트 목록 표시용)
// ============================================================================
const DocsTreeNode = ({ node, isReordering, onSelect, onMove, activePath, level = 0 }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isFolder = node.type === 'folder';
    const paddingLeft = `${level * 12 + 8}px`;
    const isSelected = activePath === node.path;
    const isDraft = node.isDraft;

    const handleToggle = (e) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const handleSelect = (e) => {
        e.stopPropagation();
        if (node.path.startsWith('__virtual__')) {
            if (isFolder) setIsOpen(!isOpen);
            return;
        }
        onSelect(node);
        if (isFolder && !isOpen) setIsOpen(true);
    };

    return (
        <div>
            <div
                onClick={handleSelect}
                className={`flex items-center gap-2 py-2 px-3 my-0.5 rounded-lg cursor-pointer transition-all border
                    ${isSelected
                        ? 'bg-purple-600 border-purple-700 text-white shadow-md z-10 scale-[1.02] font-bold'
                        : isDraft ? 'bg-purple-50 border-purple-200 text-purple-600 border-dashed' : 'border-transparent hover:bg-gray-100 text-gray-700'}
                    ${isReordering ? 'opacity-80 cursor-move' : ''}
                `}
                style={{ paddingLeft }}
            >
                <div className="flex-shrink-0 w-4 flex justify-center">
                    {isReordering ? (
                        <div className="flex flex-col -space-y-1 text-gray-400">
                            <button onClick={(e) => { e.stopPropagation(); onMove(node, -1); }} className="hover:text-purple-600 p-0.5"><ArrowUp size={8} /></button>
                            <button onClick={(e) => { e.stopPropagation(); onMove(node, 1); }} className="hover:text-purple-600 p-0.5"><ArrowDown size={8} /></button>
                        </div>
                    ) : (
                        <div
                            className={isSelected ? 'text-white' : (isDraft ? 'text-purple-400' : 'text-gray-400')}
                            onClick={isFolder ? handleToggle : undefined}
                        >
                            {isFolder ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <FileText size={14} />}
                        </div>
                    )}
                </div>
                <span className="text-sm truncate flex-1 flex items-center gap-2">
                    {node.title}
                    {isDraft && <span className="text-[9px] bg-purple-100 text-purple-600 px-1 rounded">New</span>}
                </span>
            </div>
            {isFolder && isOpen && (
                <div className="border-l-2 border-gray-100 ml-4 animate-fade-in">
                    {node.children.map(child => <DocsTreeNode key={child.path} node={child} isReordering={isReordering} onSelect={onSelect} onMove={onMove} activePath={activePath} level={level + 1} />)}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// [Loading Overlay]
// ============================================================================
const TabLoadingOverlay = ({ message, onMinimize }) => (
    <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in p-6">
        <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-tr from-teal-200 to-purple-200 rounded-full animate-ping opacity-20"></div>
            <div className="relative bg-white p-5 rounded-full shadow-xl border border-gray-100">
                <Loader2 className="w-10 h-10 text-gray-800 animate-spin" />
            </div>
        </div>
        <h3 className="text-xl font-black text-gray-800 mb-2 tracking-tight">AI 작업 진행 중</h3>
        <p className="text-gray-500 text-sm mb-8 text-center leading-relaxed whitespace-pre-wrap max-w-[260px]">{message}</p>

        <button
            onClick={onMinimize}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 hover:scale-105 active:scale-95"
        >
            <span>백그라운드에서 계속하기</span>
        </button>
    </div>
);

// ============================================================================
// [Docs Settings]
// ============================================================================
const DocsSettings = ({
    data, setData,
    blogList, posts, categories, onGenerate, onUpload, isLoading, onSelectPost, onAddImage,
    isProcessing, currentTaskType, onClose, docsSourceFiles, onRestoreAI, hasDocsScanHistory,
    onSaveWorkspace, onRestoreUserWorkspace, hasUserWorkspace
}) => {
    const { notify } = useNotificationStore();
    const [panelState, setPanelState] = useState('idle');
    const [docsTree, setDocsTree] = useState({ home: null, folders: [], files: [] });
    const [isReordering, setIsReordering] = useState(false);
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [newCategory, setNewCategory] = useState("");

    const currentActivePath = data.mode === 'update'
        ? data.activeDocPath
        : (data.postTitle ? `${data.category ? data.category + '/' : ''}${data.postTitle}.md` : null);

    useEffect(() => {
        if (posts) {
            const tree = buildTreeWithDraft(posts, {
                mode: data.mode, title: data.postTitle, category: data.category
            });
            setDocsTree(tree);
        }
    }, [posts, data.mode, data.postTitle, data.category]);

    useEffect(() => {
        if (docsSourceFiles && docsSourceFiles.length > 0) {
            if (!data.selectedRefs || data.selectedRefs.length === 0) {
                const aiPicks = docsSourceFiles.filter(f => f.recommended).map(f => f.path);
                setData({ selectedRefs: aiPicks });
            }
        }
    }, [docsSourceFiles]);

    const handleBlogChange = (e) => {
        const blog = blogList.find(b => b.repo_name === e.target.value);
        setData({ selectedBlog: blog });
    };

    const handleSelectDoc = (node) => {
        if (!node.isDraft) {
            onSelectPost(node);
            setData({ selectedRefs: [] });
        }
    };

    const handleCategoryChange = (e) => {
        if (e.target.value === '__new__') {
            setIsCustomCategory(true); setNewCategory("");
            setData({ category: "" });
        } else {
            setIsCustomCategory(false);
            setData({ category: e.target.value });
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 relative font-sans">
            <div className="px-5 py-4 bg-white border-b border-gray-200 shadow-sm z-10">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black tracking-widest text-purple-600 flex items-center gap-1.5 bg-purple-50 px-2 py-1 rounded">
                        <Book size={10} strokeWidth={3} /> DOCS SITE
                    </span>
                    <div className="flex items-center gap-1">
                        <HomeButton />
                        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600"><X size={14} /></button>
                    </div>
                </div>

                <div className="space-y-2">
                    <select
                        value={data.selectedBlog?.repo_name || ""}
                        onChange={handleBlogChange}
                        className="w-full text-xs font-bold text-gray-700 bg-gray-50 border-0 rounded-lg p-2.5 outline-none ring-1 ring-gray-200 focus:ring-purple-500 transition-all cursor-pointer hover:bg-gray-100"
                    >
                        <option value="">문서 저장소 선택...</option>
                        {blogList.filter(b => b.theme_type === 'docs').map(b => <option key={b.repo_name} value={b.repo_name}>{b.blog_title}</option>)}
                    </select>

                    {data.selectedBlog && (
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setData(prev => ({ ...prev, mode: 'create', postTitle: "", activeDocPath: null }))}
                                className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition-all flex items-center justify-center gap-1 ${data.mode === 'create' ? 'bg-white shadow text-purple-700' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <Plus size={12} /> New Doc
                            </button>
                            {/* Docs는 Update 모드가 트리 선택으로 진입하므로 버튼은 비활성/정보용 */}
                            <button
                                disabled
                                className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition-all flex items-center justify-center gap-1 ${data.mode === 'update' ? 'bg-white shadow text-blue-700' : 'text-gray-300'}`}
                            >
                                <FileText size={12} /> Existing
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {data.selectedBlog && (
                    <>
                        {data.mode === 'create' && (
                            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-4 space-y-4 animate-fade-in-up">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Location</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <select value={isCustomCategory ? '__new__' : data.category} onChange={handleCategoryChange} className="w-full text-xs bg-gray-50 border-0 rounded-lg p-2.5 pr-8 appearance-none focus:ring-1 focus:ring-purple-500 font-medium">
                                                <option value="">(Root)</option>
                                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                                <option value="__new__">+ New Folder</option>
                                            </select>
                                            <div className="absolute right-2.5 top-2.5 pointer-events-none text-gray-400"><FolderOpen size={12} /></div>
                                        </div>
                                        {isCustomCategory && (
                                            <input type="text" placeholder="Folder Name" className="flex-1 text-xs bg-gray-50 border-0 rounded-lg p-2.5 focus:ring-1 focus:ring-purple-500 font-medium" onChange={(e) => setNewCategory(e.target.value)} onBlur={() => setData(prev => ({ ...prev, category: newCategory }))} />
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Document Title</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={data.postTitle}
                                            onChange={(e) => setData(prev => ({ ...prev, postTitle: e.target.value }))}
                                            placeholder="ex) Installation Guide"
                                            className="w-full text-sm font-bold bg-gray-50 border-0 rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all placeholder-gray-300"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* [Restored] AI Source Selector */}
                        {docsSourceFiles && docsSourceFiles.length > 0 && (
                            <div className="space-y-2 mb-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                    <Sparkles size={10} className="text-purple-500" /> AI Source Analysis
                                </h4>
                                <SourceTreeSelector
                                    sourceFiles={docsSourceFiles}
                                    selectedFiles={data.selectedRefs || []}
                                    onToggle={(path) => {
                                        const current = data.selectedRefs || [];
                                        const next = current.includes(path)
                                            ? current.filter(p => p !== path)
                                            : [...current, path];
                                        setData(prev => ({ ...prev, selectedRefs: next }));
                                    }}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Layers size={10} /> Document Tree
                                </h4>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                <div className="p-2">
                                    {docsTree.home && <DocsTreeNode node={docsTree.home} onSelect={handleSelectDoc} activePath={currentActivePath} />}
                                    {docsTree.folders.map(f => <DocsTreeNode key={f.path} node={f} isReordering={isReordering} onSelect={handleSelectDoc} onMove={() => { }} activePath={currentActivePath} />)}
                                    {docsTree.files.map(f => <DocsTreeNode key={f.path} node={f} isReordering={isReordering} onSelect={handleSelectDoc} onMove={() => { }} activePath={currentActivePath} />)}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="mb-2 p-2 bg-yellow-50 border border-yellow-100 rounded-lg flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5 text-[10px]">ℹ️</span>
                    <p className="text-[9px] text-gray-600 font-medium leading-tight">
                        GitHub Pages 배포까지 최대 5분 소요될 수 있습니다.
                    </p>
                </div>
                <button
                    onClick={onUpload}
                    disabled={isLoading || !data.selectedBlog}
                    className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-xs shadow-lg hover:shadow-xl transform active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed save-post-button"
                >
                    {data.mode === 'create' ? <MonitorUp size={14} /> : <Save size={14} />}
                    {data.mode === 'create' ? 'Publish Document' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};

// ============================================================================
// [Tech Settings] Tech 모드 전용 설정 패널
// ============================================================================
const TechSettings = ({
    data, setData,
    blogList, sourceRepos, categories, posts, onGenerate, onUpload, isLoading, onSelectPost, onAddImage, isProcessing, currentTaskType, onClose,
    onSaveWorkspace, onRestoreUserWorkspace, hasUserWorkspace
}) => {
    const [techTree, setTechTree] = useState({ home: null, folders: [], files: [] });

    // [Category Tree Generation]
    const categoryTree = useMemo(() => {
        const tree = {};
        if (categories && Array.isArray(categories)) {
            categories.forEach(cat => {
                if (!cat) return;
                const parts = cat.split('/');
                const main = parts[0];
                const sub = parts[1] || null;
                if (!tree[main]) tree[main] = [];
                if (sub && !tree[main].includes(sub)) tree[main].push(sub);
            });
        }
        return tree;
    }, [categories]);

    const [mainInput, setMainInput] = useState("");
    const [subInput, setSubInput] = useState("");
    const [imgError, setImgError] = useState("");

    // [Sync Local Inputs when Parent changes]
    useEffect(() => {
        const currentCombined = mainInput + (subInput ? `/${subInput}` : "");
        if (data.category && data.category !== currentCombined) {
            const parts = data.category.split('/');
            setMainInput(parts[0] || "");
            setSubInput(parts[1] || "");
        } else if (!data.category && !mainInput) {
            setMainInput("");
            setSubInput("");
        }
    }, [data.category]);

    useEffect(() => {
        if (posts) {
            const tree = buildTreeWithDraft(posts, null);
            setTechTree(tree);
        }
    }, [posts]);

    // [Handlers]
    const handleMainChange = (e) => {
        const val = e.target.value;
        setMainInput(val); setSubInput("");
        setData(prev => ({ ...prev, category: val }));
    };

    const handleSubChange = (e) => {
        const val = e.target.value;
        setSubInput(val);
        const full = mainInput ? (val ? `${mainInput}/${val}` : mainInput) : val;
        setData(prev => ({ ...prev, category: full }));
    };

    const handleBlogChange = (e) => {
        const repoName = e.target.value;
        const blog = blogList.find(b => b.repo_name === repoName);
        setData(prev => ({ ...prev, selectedBlog: blog }));
    };

    const toggleOption = (key) => {
        setData(prev => ({
            ...prev,
            options: { ...(prev.options || {}), [key]: !(prev.options?.[key]) }
        }));
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        setImgError("");

        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB Limit
                setImgError("이미지 용량이 큽니다 (5MB 이하 권장)");
                e.target.value = null;
                return;
            }
            if (onAddImage) {
                const blobUrl = onAddImage(file);
                setData(prev => ({ ...prev, imageInfo: { path: blobUrl, alt: file.name } }));
            }
        }
    };

    const handleSelectDoc = (node) => {
        onSelectPost(node);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 relative font-sans">
            {/* Header */}
            <div className="px-5 py-4 bg-white border-b border-gray-200 z-10 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black tracking-widest text-teal-600 flex items-center gap-1.5 bg-teal-50 px-2 py-1 rounded">
                        <GitBranch size={10} strokeWidth={3} /> TECH LOG
                    </span>
                    <div className="flex items-center gap-1">
                        <HomeButton />
                        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600"><X size={14} /></button>
                    </div>
                </div>

                <div className="space-y-2">
                    <select
                        value={data.selectedBlog?.repo_name || ""}
                        onChange={handleBlogChange}
                        className="w-full text-xs font-bold text-gray-700 bg-gray-50 border-0 rounded-lg p-2.5 outline-none ring-1 ring-gray-200 focus:ring-teal-500 transition-all cursor-pointer hover:bg-gray-100"
                    >
                        <option value="">블로그 저장소 선택...</option>
                        {blogList.filter(b => b.theme_type !== 'docs').map((blog) => (<option key={blog.repo_name} value={blog.repo_name}>{blog.blog_title}</option>))}
                    </select>

                    {data.selectedBlog && (
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setData(prev => ({ ...prev, mode: 'create', postTitle: "" }))}
                                className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition-all flex items-center justify-center gap-2 ${data.mode === 'create' ? 'bg-white shadow text-teal-700' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <PenTool size={11} /> New Post
                            </button>
                            <button
                                onClick={() => setData(prev => ({ ...prev, mode: 'update' }))}
                                className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition-all flex items-center justify-center gap-2 ${data.mode === 'update' ? 'bg-white shadow text-purple-700' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <RefreshCw size={11} /> Edit Post
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {data.mode === 'create' ? (
                    <div className="space-y-5 animate-fade-in-up">
                        {/* Title */}
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Title</label>
                            <input
                                type="text"
                                value={data.postTitle}
                                onChange={(e) => setData(prev => ({ ...prev, postTitle: e.target.value }))}
                                placeholder="Post Title"
                                className="w-full text-sm font-bold bg-white border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-50/50 transition-all placeholder-gray-300"
                            />
                        </div>

                        {/* Category */}
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Category</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="relative group">
                                    <input type="text" list="main-cat-options" value={mainInput} onChange={handleMainChange} placeholder="Main" className="w-full text-xs font-bold bg-white border border-gray-200 rounded-lg p-2.5 focus:border-teal-500 focus:ring-2 focus:ring-teal-50 transition-all outline-none" />
                                    <datalist id="main-cat-options">{Object.keys(categoryTree).map(cat => <option key={cat} value={cat} />)}</datalist>
                                    <FolderOpen size={12} className="absolute right-2.5 top-2.5 text-gray-300" />
                                </div>
                                <div className="relative group">
                                    <input type="text" list="sub-cat-options" value={subInput} onChange={handleSubChange} placeholder="Sub" className="w-full text-xs font-bold bg-white border border-gray-200 rounded-lg p-2.5 focus:border-teal-500 focus:ring-2 focus:ring-teal-50 transition-all outline-none" disabled={!mainInput} />
                                    <datalist id="sub-cat-options">{categoryTree[mainInput]?.map(sub => <option key={sub} value={sub} />)}</datalist>
                                    <FolderPlus size={12} className="absolute right-2.5 top-2.5 text-gray-300" />
                                </div>
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Tags</label>
                            <div className="relative">
                                <input type="text" value={data.tags} onChange={(e) => setData(prev => ({ ...prev, tags: e.target.value }))} placeholder="Tags (comma separated)" className="w-full text-xs font-bold bg-white border border-gray-200 rounded-lg p-2.5 pl-8 focus:border-teal-500 focus:ring-2 focus:ring-teal-50 transition-all outline-none" />
                                <Hash size={12} className="absolute left-2.5 top-3 text-gray-300" />
                            </div>
                        </div>

                        {/* Options */}
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Options</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[{ key: 'math', label: 'Math' }, { key: 'mermaid', label: 'Chart' }, { key: 'pin', label: 'Pin', icon: Pin }].map((opt) => {
                                    const isActive = data.options?.[opt.key];
                                    return (
                                        <button key={opt.key} onClick={() => toggleOption(opt.key)} className={`py-2 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-center gap-1.5 ${isActive ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
                                            {opt.icon ? <opt.icon size={10} /> : <Settings size={10} />} {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Thumbnail */}
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Thumbnail</label>
                            {data.imageInfo?.path ? (
                                <div className="relative group rounded-xl overflow-hidden shadow-sm border border-gray-200 aspect-[2/1] bg-gray-100">
                                    <img src={data.imageInfo.path} alt="Thumbnail" className="w-full h-full object-cover" />
                                    <button onClick={() => setData(prev => ({ ...prev, imageInfo: { path: "", alt: "" } }))} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-lg text-gray-500 hover:text-red-500 shadow-sm backdrop-blur transition-all"><X size={14} /></button>
                                </div>
                            ) : (
                                <label className="block w-full border border-dashed border-gray-300 rounded-xl aspect-[3/1] flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:border-teal-400 hover:text-teal-500 transition-all group bg-gray-50">
                                    <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                                    <ImageIcon size={20} className="text-gray-300 group-hover:scale-110 transition-transform mb-1.5" />
                                    <span className="text-[10px] font-bold text-gray-400 group-hover:text-teal-500">Upload Cover Image</span>
                                </label>
                            )}
                            {imgError && <p className="text-[10px] text-red-500 font-bold mt-1 text-center animate-pulse flex items-center justify-center gap-1"><span className="w-1 h-1 bg-red-500 rounded-full"></span>{imgError}</p>}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Layers size={10} /> Post History
                            </h4>
                            {/* Add Search Button later if needed */}
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            {/* Tree View */}
                            <div className="p-2">
                                {techTree.folders.map(f => <DocsTreeNode key={f.path} node={f} onSelect={handleSelectDoc} isSelected={false} />)}
                                {techTree.files.map(f => <DocsTreeNode key={f.path} node={f} onSelect={handleSelectDoc} isSelected={false} />)}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="mb-2 p-2 bg-yellow-50 border border-yellow-100 rounded-lg flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5 text-[10px]">ℹ️</span>
                    <p className="text-[9px] text-gray-600 font-medium leading-tight">
                        GitHub Pages 배포까지 최대 5분 소요될 수 있습니다.
                    </p>
                </div>
                <button
                    onClick={onUpload}
                    disabled={isLoading || !data.selectedBlog}
                    className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-xs shadow-lg hover:shadow-xl transform active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed save-post-button"
                >
                    {data.mode === 'create' ? <Rocket size={14} /> : <Save size={14} />}
                    {data.mode === 'create' ? 'Publish Post' : 'Safety Update'}
                </button>
            </div>
        </div>
    );
};

// ============================================================================
// [Main] PostingSettings
// ============================================================================
export default function PostingSettings(props) {
    const { activeTab, setActiveTab, isProcessing, currentTaskType, docsSourceFiles } = props;

    if (!activeTab) {
        return (
            <div className="w-80 bg-white border-r flex flex-col h-full font-sans animate-fade-in">
                <div className="p-8 space-y-8 flex-1 flex flex-col justify-center">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-black text-gray-900">블로그 타입 선택</h2>
                        <p className="text-xs text-gray-400">작성할 문서의 종류를 선택해주세요</p>
                    </div>
                    <div className="space-y-4">
                        <button onClick={() => setActiveTab('tech')} className="w-full p-6 border-2 rounded-2xl hover:border-teal-500 hover:bg-teal-50 transition-all text-left group relative">
                            {isProcessing && currentTaskType === 'tech_blog' && (
                                <span className="absolute top-4 right-4 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                                </span>
                            )}
                            <div className="flex items-center gap-3 mb-2"><GitBranch className="text-teal-600 group-hover:scale-110 transition-transform" /><span className="font-bold text-gray-700">기술 블로그 (Tech)</span></div>
                            <p className="text-[11px] text-gray-500 leading-relaxed">GitHub 커밋 로그와 개발 일지를 기록하는 Chirpy 테마 블로그입니다.</p>
                        </button>
                        <button onClick={() => setActiveTab('docs')} className="w-full p-6 border-2 rounded-2xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left group relative">
                            {isProcessing && (currentTaskType === 'docs_recommend' || currentTaskType === 'docs_copilot') && (
                                <span className="absolute top-4 right-4 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                                </span>
                            )}
                            <div className="flex items-center gap-3 mb-2"><Book className="text-purple-600 group-hover:scale-110 transition-transform" /><span className="font-bold text-gray-700">문서 사이트 (Docs)</span></div>
                            <p className="text-[11px] text-gray-500 leading-relaxed">체계적인 기술 문서, API 가이드, 위키를 위한 Just-the-Docs 사이트입니다.</p>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full font-sans shadow-2xl">
            {activeTab === 'tech' ? (
                <TechSettings
                    data={props.techData}
                    setData={props.setTechData}
                    blogList={props.blogList}
                    sourceRepos={props.sourceRepos}
                    categories={props.categories}
                    posts={props.posts}
                    onGenerate={props.onGenerate}
                    onUpload={props.onUpload}
                    isLoading={props.isLoading}
                    onSelectPost={props.onSelectPost}
                    onAddImage={props.onAddImage}
                    isProcessing={props.isProcessing}
                    currentTaskType={props.currentTaskType}
                    onClose={() => setActiveTab(null)}
                    onSaveWorkspace={props.onSaveWorkspace}
                    onRestoreUserWorkspace={props.onRestoreUserWorkspace}
                    hasUserWorkspace={props.hasUserWorkspace}
                />
            ) : (
                <DocsSettings
                    data={props.docsData}
                    setData={props.setDocsData}
                    docsSourceFiles={docsSourceFiles}
                    blogList={props.blogList}
                    posts={props.posts}
                    categories={props.categories}
                    onGenerate={props.onGenerate}
                    onUpload={props.onUpload}
                    isLoading={props.isLoading}
                    onSelectPost={props.onSelectPost}
                    onAddImage={props.onAddImage}
                    isProcessing={props.isProcessing}
                    currentTaskType={props.currentTaskType}
                    onClose={() => setActiveTab(null)}
                    onRestoreAI={props.onRestoreAI}
                    hasDocsScanHistory={props.hasDocsScanHistory}
                    onSaveWorkspace={props.onSaveWorkspace}
                    onRestoreUserWorkspace={props.onRestoreUserWorkspace}
                    hasUserWorkspace={props.hasUserWorkspace}
                />
            )}
        </div>
    );
}

const Section = ({ title, icon: Icon, color, children }) => (
    <div className="mb-4">
        <h4 className={`text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5 ${color} opacity-80`}>
            <Icon size={12} strokeWidth={3} /> {title}
        </h4>
        {children}
    </div>
);

// ============================================================================
// [Shared Component] Home Button
// ============================================================================
const HomeButton = () => {
    const navigate = useNavigate();
    return (
        <button
            onClick={() => navigate('/')}
            className="p-1 hover:bg-gray-100 rounded transition-colors group"
            title="메인으로 돌아가기"
        >
            <Home size={16} className="text-gray-600 group-hover:text-blue-600" />
        </button>
    );
};
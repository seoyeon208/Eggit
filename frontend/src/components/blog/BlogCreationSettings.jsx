import { useEffect, useState, useRef } from 'react';
import useRepoStore from '../../store/useRepoStore';
import { RefreshCw, Palette, Image as ImageIcon, UploadCloud, X, Loader2, GitBranch, Book, PenTool, Hash, Layout, UserCircle } from 'lucide-react';
import FloatingBackButton from '../../components/common/FloatingBackButton';
import useNotificationStore from '../../store/useNotificationStore';

export default function BlogCreationSettings({
    repositoryName,
    setRepositoryName,
    blogTemplate,
    setBlogTemplate,
    nickname,
    setNickname,
    blogTitle,
    setBlogTitle,
    blogDescription,
    setBlogDescription,
    blogTagline,
    setBlogTagline,
    email,
    setEmail,
    username,
    customTheme,
    setCustomTheme,
    onDeploy,
    isLoading,
    avatarUrl,
    setAvatarUrl
}) {
    const { repos, fetchRepos, isLoading: isRepoLoading } = useRepoStore();
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // [New] 단일 컬러 피커 제어 (팝업 위치 고정을 위해)
    const [pickingColorKey, setPickingColorKey] = useState(null);
    const hiddenColorInputRef = useRef(null);

    // Theme Helpers
    const isTech = blogTemplate === 'tech';
    const themeColor = isTech ? 'text-teal-600' : 'text-purple-600';
    const themeBg = isTech ? 'bg-teal-50' : 'bg-purple-50';
    const themeBorder = isTech ? 'focus:border-teal-500' : 'focus:border-purple-500';
    const themeRing = isTech ? 'focus:ring-teal-100' : 'focus:ring-purple-100';

    useEffect(() => {
        if (blogTemplate === 'docs') {
            fetchRepos();
        }
    }, [blogTemplate, fetchRepos]);

    const handleRepoSelect = (e) => {
        const selectedFullName = e.target.value;
        if (!selectedFullName) return;
        setRepositoryName(selectedFullName);
        const selectedRepo = repos.find(r => r.full_name === selectedFullName);
        if (selectedRepo) {
            if (!blogTitle) setBlogTitle(selectedRepo.name);
            if (!blogDescription && selectedRepo.description) {
                setBlogDescription(selectedRepo.description);
            }
        }
    };

    const handleThemeChange = (key, value) => {
        setCustomTheme(prev => ({ ...prev, [key]: value }));
    };

    const handleColorClick = (key) => {
        setPickingColorKey(key);
        hiddenColorInputRef.current?.click();
    };

    const handleHiddenColorChange = (e) => {
        if (pickingColorKey) {
            handleThemeChange(pickingColorKey, e.target.value);
        }
    };

    const fontOptions = [
        { label: "Noto Sans KR (Standard)", family: "'Noto Sans KR', sans-serif", url: "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap" },
        { label: "Nanum Gothic (Friendly)", family: "'Nanum Gothic', sans-serif", url: "https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap" },
        { label: "Nanum Myeongjo (Classic)", family: "'Nanum Myeongjo', serif", url: "https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700&display=swap" },
    ];

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        processFile(file);
    };

    const handleFileInput = (e) => {
        const file = e.target.files[0];
        processFile(file);
    };

    const { notify } = useNotificationStore();

    const processFile = (file) => {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            notify("이미지 파일만 업로드 가능합니다.", "error");
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB Limit
            notify("이미지 용량이 큽니다 (5MB 이하 권장)", "error");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarUrl(reader.result);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="relative w-96 bg-white border-r border-gray-200 h-full flex flex-col font-sans shadow-xl z-20 overflow-y-auto scrollbar-hide blog-settings-container">
            {/* Header */}
            <div className="px-5 py-6 border-b border-gray-100 bg-white relative">
                <FloatingBackButton className="!absolute !top-5 !right-5 !left-auto !p-2 !h-auto !w-auto border-none shadow-none bg-transparent hover:bg-gray-100 text-gray-400 hover:text-gray-900" />
                <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                    {isTech ? <GitBranch className="text-teal-600" /> : <Book className="text-purple-600" />}
                    블로그 생성
                </h2>
                <p className="text-xs text-gray-400 mt-2 font-medium leading-relaxed">
                    {isTech ? "GitHub 기반의 기술 블로그를 생성합니다." : "체계적인 기술 문서를 위한 사이트입니다."}
                </p>
            </div>

            {/* Content Wrapper */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">

                {/* 1. Template Selection */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5 ml-1">
                        <Layout size={12} strokeWidth={3} /> 블로그 템플릿 (Template)
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                        <div
                            onClick={() => setBlogTemplate('tech')}
                            className={`cursor-pointer p-4 border-2 rounded-2xl transition-all group relative ${isTech ? 'bg-teal-50 border-teal-500 shadow-md' : 'bg-white border-gray-100 hover:border-teal-200'}`}
                        >
                            <div className="flex items-center gap-3 mb-1">
                                <GitBranch size={18} className={isTech ? "text-teal-600" : "text-gray-400"} />
                                <span className={`text-sm font-bold ${isTech ? 'text-teal-700' : 'text-gray-600'}`}>Tech Blog</span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium pl-0.5">Chirpy 테마 • GitHub Pages</p>
                            {isTech && <div className="absolute right-3 top-3 w-2 h-2 rounded-full bg-teal-500 shadow-sm" />}
                        </div>

                        <div
                            onClick={() => { setBlogTemplate('docs'); setRepositoryName(""); }}
                            className={`cursor-pointer p-4 border-2 rounded-2xl transition-all group relative ${!isTech ? 'bg-purple-50 border-purple-500 shadow-md' : 'bg-white border-gray-100 hover:border-purple-200'}`}
                        >
                            <div className="flex items-center gap-3 mb-1">
                                <Book size={18} className={!isTech ? "text-purple-600" : "text-gray-400"} />
                                <span className={`text-sm font-bold ${!isTech ? 'text-purple-700' : 'text-gray-600'}`}>Docs Site</span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium pl-0.5">Just-the-Docs • Knowledge Base</p>
                            {!isTech && <div className="absolute right-3 top-3 w-2 h-2 rounded-full bg-purple-500 shadow-sm" />}
                        </div>
                    </div>
                </div>

                <div className="border-t border-dashed border-gray-200"></div>

                {/* 2. Basic Info */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5 ml-1">
                        <PenTool size={12} strokeWidth={3} /> 기본 정보 (Basic Info)
                    </h4>

                    {/* Repository Selection for Docs */}
                    {!isTech ? (
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Repository</label>
                            <div className="relative">
                                <select
                                    onChange={handleRepoSelect}
                                    value={repositoryName}
                                    className="w-full text-xs font-bold bg-gray-50 border-0 rounded-lg p-2.5 outline-none ring-1 ring-gray-200 focus:ring-purple-500 appearance-none"
                                >
                                    <option value="" disabled>{isRepoLoading ? "로딩 중..." : "저장소 선택..."}</option>
                                    {!isRepoLoading && repos.map((repo) => (<option key={repo.id} value={repo.full_name}>{repo.name}</option>))}
                                </select>
                                <button onClick={() => fetchRepos()} className="absolute right-2 top-2 text-gray-400 hover:text-purple-500 p-0.5" disabled={isRepoLoading}>
                                    <RefreshCw size={12} className={isRepoLoading ? "animate-spin" : ""} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-gray-500 text-[11px] font-medium flex items-center gap-2">
                            <GitBranch size={12} /> {username}.github.io
                            <span className="text-[9px] text-teal-500 bg-teal-50 px-1.5 py-0.5 rounded ml-auto font-bold">Auto</span>
                        </div>
                    )}

                    {/* Project Name */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Project Name <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            name="blog_title"
                            value={blogTitle}
                            maxLength={20}
                            onChange={(e) => setBlogTitle(e.target.value)}
                            placeholder="블로그 이름"
                            className={`w-full text-sm font-bold bg-white border border-gray-200 rounded-xl p-3 outline-none ${themeBorder} ring-4 ring-transparent ${themeRing} transition-all placeholder-gray-300`}
                        />
                    </div>

                    {/* Tagline (Tech Only) */}
                    {isTech && (
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Tagline</label>
                            <input
                                type="text"
                                value={blogTagline}
                                maxLength={50}
                                onChange={(e) => setBlogTagline(e.target.value)}
                                placeholder="블로그를 한마디로 표현해보세요"
                                className={`w-full text-xs font-medium bg-white border border-gray-200 rounded-xl p-3 outline-none ${themeBorder} ring-4 ring-transparent ${themeRing} transition-all placeholder-gray-300`}
                            />
                        </div>
                    )}

                    {/* Description */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Description</label>
                        <textarea
                            value={blogDescription}
                            maxLength={100}
                            onChange={(e) => setBlogDescription(e.target.value)}
                            rows={2}
                            placeholder="블로그에 대한 설명을 입력하세요"
                            className={`w-full text-xs font-medium bg-white border border-gray-200 rounded-xl p-3 resize-none outline-none ${themeBorder} ring-4 ring-transparent ${themeRing} transition-all placeholder-gray-300`}
                        />
                    </div>
                </div>

                <div className="border-t border-dashed border-gray-200"></div>

                {/* 3. Theme Customization */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5 ml-1">
                        <Palette size={12} strokeWidth={3} /> 테마 설정 (Theme)
                    </h4>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Font Style</label>
                        <div className="relative">
                            <select
                                className="w-full text-xs font-medium bg-gray-50 border-0 rounded-lg p-2.5 outline-none appearance-none cursor-pointer"
                                value={customTheme.font_family_base}
                                onChange={(e) => {
                                    const selected = fontOptions.find(f => f.family === e.target.value);
                                    if (selected) { handleThemeChange('font_family_base', selected.family); handleThemeChange('font_import_url', selected.url); }
                                }}
                            >
                                {fontOptions.map((f, i) => (<option key={i} value={f.family}>{f.label}</option>))}
                            </select>
                            <div className="absolute right-2.5 top-2.5 pointer-events-none text-gray-400"><Palette size={12} /></div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Color Palette</label>
                        <div className="bg-white rounded-xl border border-gray-200 p-2 space-y-1">
                            {isTech ? (
                                <>
                                    <ColorRow label="메인 배경" value={customTheme.main_bg} onClick={() => handleColorClick('main_bg')} />
                                    <ColorRow label="사이드바" value={customTheme.sidebar_bg} onClick={() => handleColorClick('sidebar_bg')} />
                                    <ColorRow label="텍스트" value={customTheme.sidebar_text} onClick={() => handleColorClick('sidebar_text')} />
                                    <ColorRow label="강조 색상" value={customTheme.active_color} onClick={() => handleColorClick('active_color')} />
                                </>
                            ) : (
                                <>
                                    <ColorRow label="사이드바" value={customTheme.sidebar_bg} onClick={() => handleColorClick('sidebar_bg')} />
                                    <ColorRow label="메인 배경" value={customTheme.main_bg} onClick={() => handleColorClick('main_bg')} />
                                    <ColorRow label="강조 색상" value={customTheme.active_color} onClick={() => handleColorClick('active_color')} />
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. Author Profile (Tech Only) */}
                {isTech && (
                    <>
                        <div className="border-t border-dashed border-gray-200"></div>
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5 ml-1">
                                <UserCircle size={12} strokeWidth={3} /> 작성자 프로필 (Profile)
                            </h4>

                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    value={nickname}
                                    maxLength={10}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder="닉네임"
                                    className="w-full text-xs font-bold bg-gray-50 border-0 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-teal-500"
                                />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="이메일"
                                    className="w-full text-xs font-bold bg-gray-50 border-0 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`
                                    relative w-full h-20 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all gap-2 overflow-hidden group
                                    ${isDragging ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300 hover:bg-slate-50'}
                                    ${avatarUrl ? 'bg-white' : ''}
                                `}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileInput} accept="image/*" className="hidden" />
                                {avatarUrl ? (
                                    <>
                                        <img src={avatarUrl} alt="Preview" className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white text-[10px] font-bold drop-shadow-md">이미지 변경</span>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setAvatarUrl(""); }}
                                            className="absolute top-1.5 right-1.5 p-1 bg-white/90 rounded-md text-gray-500 hover:text-red-500 shadow-sm"
                                        >
                                            <X size={10} strokeWidth={3} />
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <UploadCloud className={`w-5 h-5 mb-1 ${isDragging ? 'text-teal-500' : 'text-gray-300'}`} />
                                        <span className="text-[9px] font-bold text-gray-400">프로필 이미지 업로드</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Footer Action */}
            <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                {/* Validation and Create Button */}
                {(() => {
                    // Validation Constants
                    const MAX_TITLE = 20;
                    const MAX_TAGLINE = 50;
                    const MAX_DESC = 100;
                    const MAX_NICKNAME = 10;

                    // Validation Check Functions
                    const getError = (val, max, name) => {
                        if (!val) return null; // 빈 값은 required 체크에서 처리
                        if (val.length > max) return `${name} ${max}자 초과`;
                        return null;
                    };

                    const titleError = !blogTitle.trim() ? "프로젝트 이름 필수" : getError(blogTitle, MAX_TITLE, "이름");
                    const taglineError = getError(blogTagline, MAX_TAGLINE, "슬로건");
                    const descError = getError(blogDescription, MAX_DESC, "설명");
                    const nicknameError = isTech ? getError(nickname, MAX_NICKNAME, "닉네임") : null;
                    const repoError = (!isTech && !repositoryName) ? "저장소 선택 필요" : null;

                    const hasError = titleError || taglineError || descError || nicknameError || repoError;
                    const isValid = !hasError;

                    return (
                        <div className="space-y-3">
                            {hasError && (blogTitle || repositoryName) && (
                                <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-[10px] text-red-600 font-medium animate-fade-in-up">
                                    <ul className="list-disc pl-4 space-y-0.5">
                                        {titleError && <li>{titleError}</li>}
                                        {repoError && <li>{repoError}</li>}
                                        {taglineError && <li>{taglineError}</li>}
                                        {descError && <li>{descError}</li>}
                                        {nicknameError && <li>{nicknameError}</li>}
                                    </ul>
                                </div>
                            )}

                            <button
                                onClick={onDeploy}
                                disabled={isLoading || !isValid}
                                className={`w-full py-3.5 px-4 rounded-xl font-bold text-white text-xs shadow-lg transition-all create-blog-button 
                                ${isLoading || !isValid
                                        ? 'bg-gray-300 cursor-not-allowed text-gray-500 shadow-none'
                                        : 'bg-gray-900 hover:bg-black hover:scale-[1.02] active:scale-[0.98]'}`}
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> 생성 중...</span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">🚀 블로그 생성하기</span>
                                )}
                            </button>
                        </div>
                    );
                })()}
            </div>

            {/* Hidden Color Input */}
            <input
                type="color"
                ref={hiddenColorInputRef}
                className="fixed bottom-10 left-10 w-0 h-0 opacity-0 pointer-events-none"
                value={pickingColorKey ? customTheme[pickingColorKey] : "#000000"}
                onChange={handleHiddenColorChange}
            />
        </div>
    );
}

// Helper Component for Color Row
const ColorRow = ({ label, value, onClick }) => (
    <div className="flex items-center justify-between group cursor-pointer hover:bg-gray-50 p-1.5 rounded-lg transition-colors" onClick={onClick}>
        <span className="text-[10px] font-bold text-gray-500 group-hover:text-gray-800 transition-colors">{label}</span>
        <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-gray-400 uppercase hidden group-hover:inline-block transition-opacity opacity-0 group-hover:opacity-100">{value}</span>
            <div className="relative w-7 h-4 rounded overflow-hidden ring-1 ring-gray-200 shadow-sm hover:ring-2 hover:ring-black/10 transition-all">
                <div className="w-full h-full" style={{ backgroundColor: value }}></div>
            </div>
        </div>
    </div>
);
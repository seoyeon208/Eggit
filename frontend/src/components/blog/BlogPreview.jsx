import { Minus, Square, X } from 'lucide-react';

export default function BlogPreview({
    blogTitle,
    blogDescription,
    customTheme,
    isLoading,
    blogTemplate,
    nickname,
    avatarUrl,
    username  // [New] 로그인 유저 아이디 (아바타용)
}) {
    // 테마에 따른 스타일 변수 설정
    const bgStyle = { backgroundColor: customTheme.main_bg };
    const sidebarStyle = { backgroundColor: customTheme.sidebar_bg, color: customTheme.sidebar_text };
    const fontStyle = { fontFamily: customTheme.font_family_base || 'sans-serif' };
    const activeStyle = { color: customTheme.active_color };

    // Google Font 로드 (미리보기용)
    if (customTheme.font_import_url) {
        const link = document.createElement("link");
        link.href = customTheme.font_import_url;
        link.rel = "stylesheet";
        document.head.appendChild(link);
    }

    return (
        <div className="flex-1 p-8 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                backgroundSize: '24px 24px'
            }}></div>

            <div className="w-full max-w-5xl h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col z-10 transition-all duration-500 ease-in-out blog-preview">

                {/* [Modified] Windows Style Browser Header (Chrome-like) */}
                <div className="bg-[#dee1e6] h-10 flex items-center justify-between px-2 sm:px-4 border-b border-[#8b8b8b] select-none rounded-t-xl gap-4">
                    {/* Left: Tabs shape (Visual only) */}
                    <div className="flex items-end h-full w-48">
                        <div className="w-full h-8 bg-white rounded-t-lg px-3 flex items-center gap-2 text-xs text-gray-700 shadow-sm relative top-[1px]">
                            <img src="/favicon.ico" alt="" className="w-3 h-3 opacity-50" onError={(e) => e.target.style.display = 'none'} />
                            <span className="truncate flex-1 font-medium">{blogTitle || 'New Tab'}</span>
                            <X size={12} className="text-gray-400 hover:bg-gray-200 rounded-full p-0.5" />
                        </div>
                    </div>

                    {/* Right: Window Controls */}
                    <div className="flex items-center">
                        <button className="hover:bg-gray-300 w-10 h-8 flex items-center justify-center transition-colors"><Minus size={14} /></button>
                        <button className="hover:bg-gray-300 w-10 h-8 flex items-center justify-center transition-colors"><Square size={12} /></button>
                        <button className="hover:bg-[#e81123] hover:text-white w-10 h-8 flex items-center justify-center transition-colors"><X size={14} /></button>
                    </div>
                </div>

                {/* URL Bar Area */}
                <div className="bg-white border-b border-gray-200 p-2 flex items-center gap-2">
                    <div className="flex-1 bg-[#f1f3f4] rounded-full px-4 py-1.5 text-xs text-gray-600 flex items-center gap-2 hover:bg-[#e8eaed] transition-colors border border-transparent focus-within:bg-white focus-within:border-blue-500 focus-within:shadow-sm">
                        <span className="text-green-600">🔒</span>
                        <span className="text-gray-500">https://</span>
                        <span className="text-gray-900">{username || 'user'}.github.io</span>
                    </div>
                </div>

                {/* Preview Content Area */}
                <div className="flex-1 flex overflow-hidden relative" style={fontStyle}>

                    {isLoading && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                            <p className="mt-4 text-gray-600 font-medium animate-pulse">Building your blog...</p>
                        </div>
                    )}

                    {blogTemplate === 'tech' ? (
                        /* Tech Blog Preview (Chirpy Style) */
                        <>
                            {/* Sidebar */}
                            <div className="w-64 flex flex-col p-6 shrink-0 transition-colors duration-300" style={sidebarStyle}>
                                <div className="mb-8">
                                    <div className="w-24 h-24 rounded-full bg-gray-200 mb-4 overflow-hidden border-4 border-white/10 shadow-sm mx-auto">
                                        {/* Avatar Preview: Only User's GitHub or Uploaded Image */}
                                        <img
                                            src={avatarUrl || `https://github.com/${username}.png`}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = "https://via.placeholder.com/150?text=Eggit";
                                            }}
                                        />
                                    </div>
                                    <h2 className="text-xl font-bold text-center mb-1">{blogTitle || 'My Tech Blog'}</h2>
                                    <p className="text-xs text-center opacity-70">{blogDescription || 'Tech enthusiast & Developer'}</p>
                                </div>

                                <nav className="space-y-1 flex-1">
                                    {['Home', 'Categories', 'Tags', 'Archives', 'About'].map((item, idx) => (
                                        <div key={item} className={`px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer flex items-center gap-3 transition-all ${idx === 0 ? 'bg-black/10' : 'hover:bg-black/5'}`}>
                                            <span style={idx === 0 ? activeStyle : {}}>{item}</span>
                                        </div>
                                    ))}
                                </nav>

                                <div className="text-[10px] opacity-40 text-center mt-4">
                                    © 2026 {nickname || 'User'}. Powered by Eggit.
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 p-10 overflow-y-auto" style={bgStyle}>
                                <div className="max-w-3xl mx-auto">
                                    <div className="mb-12 text-center">
                                        {/* [Removed] Duplicate Title */}
                                        {/* <h1 className="text-4xl font-extrabold text-gray-800 mb-4 tracking-tight">{blogTitle || 'Welcome to My Blog'}</h1> */}
                                        <p className="text-gray-500 text-lg mt-8">{blogDescription}</p>
                                    </div>

                                    <div className="space-y-6">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100/50" style={{ backgroundColor: customTheme.card_bg }}>
                                                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                                                    <span>Jan {10 + i}, {new Date().getFullYear()}</span>
                                                    <span>•</span>
                                                    <span>Tech</span>
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-800 mb-2">How to build a great blog with Eggit - Part {i}</h3>
                                                <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                                                    This is a preview of your post content. The theme colors you selected are applied here.
                                                    Experience the modern and clean design of the Chirpy theme.
                                                </p>
                                                <div className="mt-4 flex gap-2">
                                                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-md">#development</span>
                                                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-md">#tutorial</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Docs Preview (Just-the-docs Style) */
                        <>
                            {/* Docs Sidebar */}
                            <div className="w-64 border-r border-gray-200 flex flex-col" style={{ backgroundColor: customTheme.sidebar_bg }}>
                                <div className="p-6 border-b border-gray-200/50">
                                    <h2 className="font-bold text-lg text-gray-800">{blogTitle || 'Project Docs'}</h2>
                                </div>
                                <div className="p-4 space-y-1">
                                    {['Introduction', 'Getting Started', 'Configuration', 'API Reference', 'Advanced Usage'].map((item, idx) => (
                                        <div key={item} className={`px-3 py-2 rounded-md text-sm cursor-pointer ${idx === 0 ? 'bg-white shadow-sm font-semibold' : 'text-gray-600 hover:bg-black/5'}`} style={idx === 0 ? { color: customTheme.active_color } : {}}>
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Docs Content */}
                            <div className="flex-1 p-10 overflow-y-auto" style={{ backgroundColor: customTheme.main_bg }}>
                                <div className="max-w-4xl mx-auto">
                                    <h1 className="text-4xl font-bold text-gray-900 mb-6 border-b pb-4">{blogTitle || 'Documentation'}</h1>
                                    <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                                        {blogDescription || 'Welcome to the documentation site. This layout is optimized for technical docs.'}
                                    </p>

                                    <div className="prose max-w-none">
                                        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Installation</h3>
                                        <div className="bg-gray-800 rounded-lg p-4 mb-6 font-mono text-sm text-gray-300">
                                            <span className="text-green-400">$</span> npm install my-awesome-project
                                        </div>

                                        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Features</h3>
                                        <ul className="list-disc pl-5 space-y-2 text-gray-600">
                                            <li>Easy to use and configure</li>
                                            <li><span style={{ color: customTheme.active_color, fontWeight: 'bold' }}>Customizable theme colors</span></li>
                                            <li>Responsive design for all devices</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
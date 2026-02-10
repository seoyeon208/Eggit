import React from 'react';
import { PlusSquare, PenTool, ExternalLink, Home } from 'lucide-react';
import { ActionButton } from '../common/CommonUI';

const BlogActionsSection = ({ isMe, needsHome, onHomeClick, onNavigate, onVisitBlog, hasBlog }) => {
    return (
        <div className="space-y-2">
            {needsHome && (
                <div className="mb-2">
                    <button
                        onClick={onHomeClick}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2.5 group"
                    >
                        <Home size={20} className="group-hover:scale-110 transition-transform" />
                        <span className="text-sm uppercase tracking-wider">My Home</span>
                    </button>
                </div>
            )}

            {isMe && (
                <div className="grid grid-cols-2 gap-2 mb-1.5">
                    <ActionButton icon={PlusSquare} label="생성" onClick={() => onNavigate('/blog/create')} className="blog-create-button !py-4 text-base" />
                    <ActionButton icon={PenTool} label="글쓰기" primary onClick={() => onNavigate('/blog/post')} className="blog-post-button !py-4 text-base" />
                </div>
            )}

            <div className="input-panel-icon">
                <button
                    onClick={onVisitBlog}
                    disabled={!hasBlog}
                    className={`w-full py-4 rounded-lg border-2 text-sm font-bold transition-all flex items-center justify-center gap-2
                    ${hasBlog
                            ? 'bg-white/50 hover:bg-white border-gray-300 text-gray-700 hover:border-indigo-400 cursor-pointer shadow-sm'
                            : 'bg-black/5 border-gray-200 text-gray-400 cursor-not-allowed opacity-70'
                        }`}
                >
                    <span>{isMe ? '내 블로그' : '친구 블로그'}</span>
                    <ExternalLink size={20} />
                </button>
            </div>
        </div>
    );
};

export default BlogActionsSection;

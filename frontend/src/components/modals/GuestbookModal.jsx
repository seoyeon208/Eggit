import { useState, useEffect, useRef } from 'react';

import { useNavigate } from 'react-router-dom';
import { Send, User, Clock, Trash2, X, Home, ExternalLink, Pin } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import useUserStore from '../../store/useUserStore';
import useGuestbookStore from '../../store/useGuestbookStore';
import useNotificationStore from '../../store/useNotificationStore';
import useRefreshStore from '../../store/useRefreshStore';

/**
 * GuestbookModal Component
 * Modern, draggable, and minimizable modal version of the guestbook.
 */
const GuestbookModal = ({ targetUserId = null }) => {
    const navigate = useNavigate();
    const { isOpen, isMinimized, close, toggleMinimized } = useGuestbookStore();
    const { user: currentUser } = useUserStore();
    const { notify, confirm } = useNotificationStore();
    const { refreshQuest } = useRefreshStore();

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [openMenuId, setOpenMenuId] = useState(null);
    const menuRef = useRef(null);


    const effectiveUserId = targetUserId || currentUser?.id;

    const fetchMessages = async () => {
        if (!effectiveUserId) return;
        setLoading(true);
        try {
            const res = await apiClient.get(`/guestbook/${effectiveUserId}`);
            if (res.data && Array.isArray(res.data)) {
                setMessages(res.data);
            } else {
                setMessages([]);
            }
        } catch (err) {
            console.error("방명록 로딩 실패:", err);
            notify("방명록을 불러오는데 실패했습니다.", "error");
            setMessages([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && effectiveUserId) {
            fetchMessages();
        }
    }, [isOpen, effectiveUserId]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const msgText = newMessage.trim();
        if (!msgText || !currentUser || !effectiveUserId) return;

        try {
            await apiClient.post(`/guestbook`, {
                owner_id: effectiveUserId,
                content: msgText
            });
            setNewMessage("");
            // Immediate partial update or full refresh
            const res = await apiClient.get(`/guestbook/${effectiveUserId}`);
            if (res.data && Array.isArray(res.data)) {
                setMessages(res.data);
            }
            notify("메시지를 남겼습니다! ✨", "success");
            // Zustand 스토어를 통한 퀘스트 갱신
            refreshQuest();
        } catch (err) {
            console.error("방명록 작성 실패:", err);
            notify("방명록 작성에 실패했습니다.", "error");
        }
    };

    const handleDeleteMessage = async (id) => {
        confirm("이 메시지를 삭제하시겠습니까?", async () => {
            try {
                await apiClient.delete(`/guestbook/${id}`);
                await fetchMessages();
                notify("메시지가 삭제되었습니다.", "success");
            } catch (err) {
                console.error("방명록 삭제 실패:", err);
                notify("삭제 실패했습니다.", "error");
            }
        }, "삭제", "delete");
    };

    const handleTogglePin = async (id) => {
        try {
            await apiClient.put(`/guestbook/${id}/pin`);
            await fetchMessages();
            notify("고정 상태가 변경되었습니다.", "success");
        } catch (err) {
            console.error("방명록 고정 실패:", err);
            notify("고정 처리에 실패했습니다.", "error");
        }
    };

    const formatKST = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    // Dragging Logic
    const handleMouseDown = (e) => {
        if (e.target.closest('.modal-header')) {
            setIsDragging(true);
            setDragStart({
                x: e.clientX - position.x,
                y: e.clientY - position.y
            });
        }
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart]);

    // Close profile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenuId(null);
            }
        };
        if (openMenuId) {
            window.addEventListener('mousedown', handleClickOutside);
            return () => window.removeEventListener('mousedown', handleClickOutside);
        }
    }, [openMenuId]);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 pointer-events-none">
            {/* Dark Overlay (No Blur) */}
            <div
                className="absolute inset-0 bg-black/40 pointer-events-auto transition-opacity duration-300"
                onClick={close}
            ></div>

            {/* Modal Window */}
            <div
                className="relative w-full max-w-2xl max-h-[85vh] flex flex-col pointer-events-auto transition-all duration-75 panel-border-alt"
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`
                }}
            >
                <div className="flex flex-col h-[calc(85vh-168px)] relative">
                    {/* Header Area (Draggable - Positioned on Top Border) */}
                    <div
                        onMouseDown={handleMouseDown}
                        className="modal-header absolute top-[-127px] left-[-40px] right-[-48px] h-[120px] px-8 flex items-center justify-between cursor-move select-none z-10"
                    >
                        <div className="flex items-center gap-4">
                            <span className="text-3xl drop-shadow-lg">📝</span>
                            <h2 className="text-2xl font-black text-[#7B7B7B] tracking-tight uppercase drop-shadow-sm">방명록</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); close(); }}
                                className="p-2 hover:bg-black/5 rounded-xl transition-all"
                                title="닫기"
                            >
                                <X size={24} className="text-[#7B7B7B]" />
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2 space-y-4 bg-transparent">

                        {/* Slim Write Form */}
                        <div className="bg-white/80 p-3 px-4 rounded-2xl border border-indigo-100 shadow-sm sticky top-0 z-20 backdrop-blur-sm">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="한마디 남겨보세요! ✨"
                                    className="flex-1 px-4 py-2 bg-gray-50/50 border-2 border-gray-100 rounded-xl outline-none focus:border-indigo-400 focus:bg-white transition-all resize-none h-[42px] font-bold text-gray-700 text-sm leading-[24px] overflow-hidden"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(e);
                                        }
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-30 flex-shrink-0"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>

                        {/* Messages List Area */}
                        <div className="space-y-3">
                            {loading ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-20">
                                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="font-black text-xs uppercase tracking-widest">Fetching data</p>
                                </div>
                            ) : (!messages || messages.length === 0) ? (
                                <div className="py-20 text-center opacity-30">
                                    <div className="text-5xl mb-4">💬</div>
                                    <p className="font-bold text-gray-500 uppercase tracking-widest text-sm">아직 도착한 메시지가 없습니다</p>
                                </div>
                            ) : (
                                <div className="space-y-3 pb-4">
                                    {Array.isArray(messages) && messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`panel-border-guestbook p-3 group transition-all ${msg.is_pinned ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : ''}`}
                                        >
                                            {msg.is_pinned === 1 && (
                                                <div className="flex items-center gap-1.5 mb-2 px-1">
                                                    <Pin size={12} className="text-indigo-600 fill-indigo-600" />
                                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Pinned Notice</span>
                                                </div>
                                            )}
                                            <div className="flex items-start gap-3">
                                                {/* Profile Section with Popup Menu */}
                                                <div className="relative flex-shrink-0">
                                                    <div
                                                        className="w-10 h-10 bg-white border-2 border-gray-100 rounded-xl overflow-hidden cursor-pointer shadow-sm hover:border-indigo-400 transition-all"
                                                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === msg.id ? null : msg.id); }}
                                                    >
                                                        <img
                                                            src={`https://github.com/${msg.author_username || msg.author_name}.png`}
                                                            alt={msg.author_name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${msg.author_name}&background=random` }}
                                                        />
                                                    </div>

                                                    {/* Profile Action Menu */}
                                                    {openMenuId === msg.id && (
                                                        <div
                                                            ref={menuRef}
                                                            className="absolute left-0 top-full mt-2 bg-white border-2 border-gray-100 rounded-xl shadow-2xl p-1.5 z-[100] min-w-[170px] animate-fade-in pointer-events-auto"
                                                        >
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenMenuId(null);
                                                                    close();
                                                                    // 🛠️ 약간의 지연을 주어 모달이 닫히는 애니메이션과 충돌하지 않게 함
                                                                    setTimeout(() => {
                                                                        navigate(`/friend/${msg.author_username || msg.author_name}`);
                                                                    }, 100);
                                                                }}
                                                                className="w-full px-3 py-2 text-left text-xs font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-all flex items-center gap-2 group/btn"
                                                            >
                                                                <Home size={14} className="text-gray-400 group-hover/btn:text-indigo-500" />
                                                                <span className="whitespace-nowrap">친구 홈 가기</span>
                                                            </button>
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    const username = msg.author_username || msg.author_name;
                                                                    const authorId = msg.author_id;

                                                                    try {
                                                                        // 🛠️ 블로그 존재 여부 체크 보강
                                                                        const res = await apiClient.get(`/blog/check?user_id=${authorId}`);
                                                                        if (res.data.exists) {
                                                                            setOpenMenuId(null);
                                                                            window.open(`https://${username}.github.io`, '_blank');
                                                                        } else {
                                                                            notify(`${username}님은 아직 생성된 블로그가 없습니다.`, "info");
                                                                            setOpenMenuId(null);
                                                                        }
                                                                    } catch (err) {
                                                                        console.error("Blog check failed:", err);
                                                                        // 에러 시에도 기본적으로 시도는 해봄
                                                                        window.open(`https://${username}.github.io`, '_blank');
                                                                        setOpenMenuId(null);
                                                                    }
                                                                }}
                                                                className="w-full px-3 py-2 text-left text-xs font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-all flex items-center gap-2 group/btn"
                                                            >
                                                                <ExternalLink size={14} className="text-gray-400 group-hover/btn:text-indigo-500" />
                                                                <span className="whitespace-nowrap">친구 블로그 가기</span>
                                                            </button>
                                                        </div>
                                                    )}

                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-black text-gray-800 text-sm">
                                                                {msg.author_name}
                                                            </span>
                                                            <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400">
                                                                <Clock size={8} />
                                                                {formatKST(msg.created_at)}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {currentUser?.id === effectiveUserId && (
                                                                <button
                                                                    onClick={() => handleTogglePin(msg.id)}
                                                                    className={`${msg.is_pinned ? 'opacity-100 text-indigo-600' : 'opacity-0 group-hover:opacity-100 text-gray-300 hover:text-indigo-400'} p-1 transition-all flex-shrink-0`}
                                                                    title={msg.is_pinned ? "고정 해제" : "상단 고정"}
                                                                >
                                                                    <Pin size={14} className={msg.is_pinned ? "fill-indigo-600" : ""} />
                                                                </button>
                                                            )}
                                                            {(currentUser?.id === effectiveUserId || currentUser?.id === msg.author_id) && (
                                                                <button
                                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                                    className="opacity-0 group-hover:opacity-100 p-1 text-red-300 hover:text-red-500 transition-all flex-shrink-0"
                                                                    title="삭제"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-600 font-bold leading-relaxed break-words text-xs py-0.5">
                                                        {msg.content}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GuestbookModal;

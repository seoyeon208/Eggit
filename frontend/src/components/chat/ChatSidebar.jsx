import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, MessageSquare, ArrowLeft, Home, ExternalLink, Send } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import useMessageStore from '../../store/useMessageStore';
import useNotificationStore from '../../store/useNotificationStore';

const ChatSidebar = ({ isOpen, onClose, pendingFriendId, onClearPending }) => {
    const navigate = useNavigate();
    const { notify, confirm } = useNotificationStore();
    const { setChatSidebarOpen } = useMessageStore();
    const [activeChat, setActiveChat] = useState(null);
    const [friendsList, setFriendsList] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [messages, setMessages] = useState([]);
    const [selectedFriendId, setSelectedFriendId] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [ws, setWs] = useState(null);
    const [presenceWs, setPresenceWs] = useState(null);
    const [hoveredFriend, setHoveredFriend] = useState(null);
    const messagesEndRef = useRef(null);
    const modalRef = useRef(null);
    const [isNavigating, setIsNavigating] = useState(false);


    const { unreadCounts, clearUnreadCount } = useMessageStore();

    const loadFriendData = () => {
        apiClient.get('/friends')
            .then(res => setFriendsList(res.data))
            .catch(e => console.error(e));

        apiClient.get('/friends/pending')
            .then(res => setPendingRequests(res.data))
            .catch(e => console.error(e));

        apiClient.get('/friends/sent')
            .then(res => setSentRequests(res.data))
            .catch(e => console.error(e));
    };

    useEffect(() => {
        if (isOpen) {
            loadFriendData();
            setChatSidebarOpen(true);
        } else {
            setChatSidebarOpen(false);
        }
    }, [isOpen, setChatSidebarOpen]);

    // pendingFriendId prop이 변경되면 해당 친구와의 채팅 열기
    useEffect(() => {
        if (pendingFriendId && friendsList.length > 0) {
            const friend = friendsList.find(f => f.user_id === pendingFriendId);
            if (friend) {
                setActiveChat(friend);
                clearUnreadCount(pendingFriendId);
                onClearPending();
                // Scroll to bottom after messages load
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 300);
            }
        }
    }, [pendingFriendId, friendsList, clearUnreadCount, onClearPending]);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setHoveredFriend(null);
            }
        };

        if (hoveredFriend) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [hoveredFriend]);

    // Presence WebSocket - Always connected when component mounts (tracks site presence, not sidebar state)
    useEffect(() => {
        // Convert HTTP API URL to WebSocket URL
        const wsProtocol = import.meta.env.VITE_API_URL.startsWith('https') ? 'wss' : 'ws';
        const wsHost = import.meta.env.VITE_API_URL.replace(/^https?:\/\//, '');
        // 쿠키 인증 사용으로 토큰 파라미터 제거
        const presenceWsUrl = `${wsProtocol}://${wsHost}/presence/ws`;
        const presenceWebsocket = new WebSocket(presenceWsUrl);

        presenceWebsocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'initial_status') {
                    setFriendsList(prev => prev.map(friend => ({
                        ...friend,
                        is_online: data.online_friends.includes(friend.user_id)
                    })));
                } else if (data.type === 'user_online') {
                    setFriendsList(prev => prev.map(friend =>
                        friend.user_id === data.user_id ? { ...friend, is_online: true } : friend
                    ));
                } else if (data.type === 'user_offline') {
                    setFriendsList(prev => prev.map(friend =>
                        friend.user_id === data.user_id ? { ...friend, is_online: false } : friend
                    ));
                }
            } catch (e) {
                console.error('[Presence] 파싱 에러:', e);
            }
        };

        setPresenceWs(presenceWebsocket);
        return () => presenceWebsocket.close();
    }, []); // Empty dependency - connect once on mount

    // Chat WebSocket
    useEffect(() => {
        if (!activeChat) {
            if (ws) {
                ws.close();
                setWs(null);
            }
            return;
        }

        // axios -> apiClient (쿠키 자동 처리)
        apiClient.get(`/chat/${activeChat.user_id}/messages`)
            .then(res => setMessages(res.data))
            .catch(e => {
                console.error('채팅 히스토리 로드 실패:', e);
                setMessages([]);
            });

        // Convert HTTP API URL to WebSocket URL
        const wsProtocol = import.meta.env.VITE_API_URL.startsWith('https') ? 'wss' : 'ws';
        const wsHost = import.meta.env.VITE_API_URL.replace(/^https?:\/\//, '');
        // 쿠키 인증 사용으로 토큰 파라미터 제거
        const wsUrl = `${wsProtocol}://${wsHost}/chat/ws/${activeChat.user_id}`;
        const websocket = new WebSocket(wsUrl);

        websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Validate and parse timestamp
                let timestamp = null;
                if (data.timestamp) {
                    const parsedDate = new Date(data.timestamp);
                    timestamp = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
                } else {
                    timestamp = new Date();
                }

                // Parse backend response (backend sends: text, timestamp)
                const newMessage = {
                    id: data.id || `msg-${Date.now()}-${Math.random()}`, // Unique ID
                    text: data.text || data.message || '',
                    sender: data.sender || (data.sender_id === activeChat.user_id ? 'friend' : 'me'),
                    timestamp: timestamp
                };

                // Only add message if it has content
                if (newMessage.text.trim()) {
                    setMessages(prev => [...prev, newMessage]);
                }
                // Clear unread count while chatting
                clearUnreadCount(activeChat.user_id);
            } catch (e) {
                console.error('메시지 파싱 에러:', e);
            }
        };

        setWs(websocket);
        return () => websocket.close();
    }, [activeChat]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleStartChat = (friend) => {
        setActiveChat(friend);
        clearUnreadCount(friend.user_id);
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        const input = e.target.elements.msgInput;
        const text = input.value.trim();

        if (text && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(text);
            input.value = "";
        }
    };

    const handleAcceptRequest = (friendshipId) => {
        apiClient.put(`/friends/${friendshipId}/accept`)
            .then(() => {
                notify('친구 요청을 수락했습니다! 🎉', 'success');
                loadFriendData();
            }).catch(err => console.error(err));
    };

    const handleRejectRequest = (friendshipId) => {
        apiClient.delete(`/friends/${friendshipId}/reject`)
            .then(() => loadFriendData())
            .catch(err => console.error(err));
    };

    const handleDeleteFriend = (friend) => {
        confirm(`정말 ${friend.username}님을 친구 목록에서 삭제하시겠습니까?`, async () => {
            try {
                await apiClient.delete(`/friends/${friend.user_id}`);
                notify(`${friend.username}님을 삭제했습니다.`, 'info');
                loadFriendData();
                if (activeChat && activeChat.user_id === friend.user_id) {
                    setActiveChat(null);
                }
            } catch (err) {
                console.error(err);
                notify('삭제 실패!', 'error');
            }
        }, '삭제하기', 'delete');
    };

    return (
        <>
            <div className="flex flex-col h-full bg-white animate-fade-in font-sans">
                {/* Header */}
                <div className="px-6 py-5 border-b-2 border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{activeChat ? '💬' : '👥'}</span>
                        <h3 className="font-black text-gray-800 text-lg uppercase tracking-tight">
                            {activeChat ? activeChat.username : "Friends"}
                        </h3>
                    </div>
                    <div className="flex items-center gap-1">
                        {activeChat && (
                            <>
                                <button
                                    onClick={() => {
                                        onClose();
                                        setIsNavigating(true);
                                        setTimeout(() => {
                                            navigate(`/friend/${activeChat.username}`);
                                        }, 300);
                                    }}
                                    className="p-2 text-blue-500 hover:bg-white rounded-xl transition-all"
                                    title="친구 홈 가기"
                                >
                                    <Home size={20} />
                                </button>
                                <button onClick={() => setActiveChat(null)} className="p-2 text-gray-500 hover:bg-white rounded-xl transition-all">
                                    <ArrowLeft size={20} />
                                </button>
                            </>
                        )}
                        <button onClick={onClose} className="p-2 text-gray-500 hover:bg-white rounded-xl transition-all"><X size={20} /></button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {!activeChat ? (
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Manage Friends</h4>
                                <button
                                    onClick={() => setEditMode(!editMode)}
                                    className={`px-3 py-1 text-[10px] font-black rounded-full transition-all border-2 friend-manage-button ${editMode ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'border-gray-100 text-gray-400 hover:text-gray-900'}`}
                                >
                                    {editMode ? 'DONE' : 'EDIT'}
                                </button>
                            </div>

                            {editMode && (
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const username = e.target.username.value.trim();
                                    if (username) {
                                        apiClient.post('/friends/request', { target_username: username })
                                            .then(() => { notify('친구 요청을 보냈습니다!', 'success'); e.target.reset(); loadFriendData(); })
                                            .catch(err => notify('친구 요청 실패! 사용자를 찾을 수 없습니다.', 'error'));
                                    }
                                }} className="space-y-2 animate-slide-up">
                                    <input name="username" placeholder="Search username..." className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-black outline-none focus:border-blue-500 transition-all font-sans friend-search-input" />
                                    <button type="submit" className="w-full py-3 bg-blue-500 text-white text-[10px] font-black rounded-xl uppercase tracking-widest">Send Request</button>
                                </form>
                            )}

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact List</h4>
                                {friendsList.map((friend) => (
                                    <div key={friend.user_id} className="group relative">
                                        <div
                                            className="flex items-center gap-3 p-3 rounded-2xl border-2 border-transparent hover:border-blue-100 hover:bg-blue-50/30 transition-all cursor-pointer group relative"
                                            onClick={() => handleStartChat(friend)}
                                        >
                                            {/* Avatar */}
                                            <div
                                                className="relative flex-shrink-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setHoveredFriend(hoveredFriend === friend.user_id ? null : friend.user_id);
                                                }}
                                            >
                                                <div className={`w-12 h-12 bg-gray-50 border-2 rounded-2xl overflow-hidden shadow-sm transition-all ${hoveredFriend === friend.user_id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-white'
                                                    }`}>
                                                    <img src={`https://github.com/${friend.username}.png`} alt={friend.username} className="w-full h-full object-cover" onError={(e) => { e.target.src = "https://ui-avatars.com/api/?name=" + friend.username }} />
                                                </div>
                                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-white ${friend.is_online ? 'bg-green-500' : 'bg-gray-300'}`}></div>

                                                {/* Profile Modal (Click-based) */}
                                                {hoveredFriend === friend.user_id && (
                                                    <div
                                                        ref={modalRef}
                                                        className="absolute left-0 top-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl p-2 z-50 min-w-[220px] animate-fade-in"
                                                    >
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setHoveredFriend(null);
                                                                onClose();
                                                                setIsNavigating(true);
                                                                setTimeout(() => {
                                                                    navigate(`/friend/${friend.username}`);
                                                                }, 300);
                                                            }}
                                                            className="w-full px-4 py-3 text-left text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all flex items-center gap-3 group/btn"
                                                        >
                                                            <div className="p-1.5 bg-gray-50 rounded-md group-hover/btn:bg-blue-100 transition-colors">
                                                                <Home size={16} />
                                                            </div>
                                                            <span className="whitespace-nowrap">친구 홈 가기</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setHoveredFriend(null);
                                                                const blogUrl = friend.blog_url || `https://${friend.username}.github.io`;
                                                                window.open(blogUrl, '_blank');
                                                            }}
                                                            className="w-full px-4 py-3 text-left text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all flex items-center gap-3 group/btn"
                                                        >
                                                            <div className="p-1.5 bg-gray-50 rounded-md group-hover/btn:bg-blue-100 transition-colors">
                                                                <ExternalLink size={16} />
                                                            </div>
                                                            <span className="whitespace-nowrap">친구 블로그 가기</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Name & Link Icon */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-sm font-black text-gray-800 tracking-tight transition-all ${hoveredFriend === friend.user_id ? 'underline decoration-2 decoration-blue-500' : ''
                                                        }`}>
                                                        {friend.username}
                                                    </span>
                                                    <span
                                                        className="inline-flex items-center justify-center w-6 h-6 text-xs cursor-pointer bg-slate-100 border-b-2 border-slate-300 rounded-lg hover:bg-slate-200 active:translate-y-0.5 active:border-b-0 transition-all shadow-sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setHoveredFriend(hoveredFriend === friend.user_id ? null : friend.user_id);
                                                        }}
                                                    >🔗</span>
                                                </div>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5 tracking-tighter">{friend.is_online ? 'Active' : 'Away'}</p>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1">
                                                <div className="p-2 text-gray-300 group-hover:text-blue-500 transition-all relative">
                                                    <MessageSquare size={18} />
                                                    {unreadCounts[friend.user_id] > 0 && (
                                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                                                            {unreadCounts[friend.user_id]}
                                                        </div>
                                                    )}
                                                </div>
                                                {editMode && <button onClick={(e) => { e.stopPropagation(); handleDeleteFriend(friend); }} className="p-2 text-red-300 hover:text-red-500 transition-all z-20">❌</button>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pending Friend Requests (받은 요청) */}
                            {pendingRequests.length > 0 && (
                                <div className="space-y-4 mt-6">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending Requests ({pendingRequests.length})</h4>
                                    {pendingRequests.map((req) => (
                                        <div key={req.friendship_id} className="flex items-center justify-between p-4 bg-amber-50 border-2 border-amber-100 rounded-2xl">
                                            <div>
                                                <p className="text-sm font-black text-gray-900">{req.requester_username}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">친구 요청</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        apiClient.put(`/friends/${req.friendship_id}/accept`)
                                                            .then(() => { notify('친구 요청을 수락했습니다! 🎉', 'success'); loadFriendData(); })
                                                            .catch(err => console.error(err));
                                                    }}
                                                    className="px-3 py-1.5 bg-green-500 text-white text-[9px] font-black rounded-full uppercase tracking-widest hover:bg-green-600"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        apiClient.delete(`/friends/${req.friendship_id}/reject`)
                                                            .then(() => { notify('친구 요청을 거절했습니다.', 'info'); loadFriendData(); })
                                                            .catch(err => console.error(err));
                                                    }}
                                                    className="px-3 py-1.5 bg-red-500 text-white text-[9px] font-black rounded-full uppercase tracking-widest hover:bg-red-600"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Sent Friend Requests (보낸 요청) */}
                            {sentRequests.length > 0 && (
                                <div className="space-y-4 mt-6">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sent Requests ({sentRequests.length})</h4>
                                    {sentRequests.map((req) => (
                                        <div key={req.friendship_id} className="flex items-center justify-between p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl">
                                            <div>
                                                <p className="text-sm font-black text-gray-900">{req.addressee_username}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">대기 중</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    apiClient.delete(`/friends/${req.friendship_id}/cancel`)
                                                        .then(() => { notify('친구 요청을 취소했습니다.', 'info'); loadFriendData(); })
                                                        .catch(err => console.error(err));
                                                }}
                                                className="px-3 py-1.5 bg-gray-500 text-white text-[9px] font-black rounded-full uppercase tracking-widest hover:bg-gray-600"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Chat Session Area */
                        <div className="flex-1 flex flex-col bg-gray-50/20 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                {messages.map((msg, index) => (
                                    <div key={msg.id || `msg-${index}-${msg.timestamp}`} className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-[13px] font-bold shadow-sm ${msg.sender === 'me' ? 'bg-blue-500 text-white rounded-tr-none' : 'bg-white text-gray-800 border-2 border-gray-100 rounded-tl-none'
                                            }`}>
                                            {msg.text || msg.message}
                                        </div>
                                        <span className="text-[9px] font-black text-gray-400 mt-1.5 px-1 uppercase tracking-tighter">
                                            {(() => {
                                                const timeValue = msg.timestamp || msg.created_at;
                                                if (!timeValue) return '';
                                                const date = new Date(timeValue);
                                                return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            })()}
                                        </span>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="p-6 bg-white border-t-2 border-gray-50 flex-shrink-0">
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <input name="msgInput" placeholder="Write a message..." className="flex-1 px-5 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all font-sans" />
                                    <button type="submit" className="p-3 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-500/20 hover:scale-105 transition-all flex items-center justify-center flex-shrink-0"><Send size={20} /></button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ChatSidebar;

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
    IconArrowLeft,
    IconSend,
    IconPaperclip,
    IconCheck,
    IconClock,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@simple/config';

interface ChatMessage {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    createdAt: string;
    isRead: boolean;
    type: 'text' | 'image' | 'file';
}

interface Conversation {
    id: string;
    otherUser: {
        id: string;
        name: string;
        image?: string;
    };
    lastMessage: ChatMessage;
    unreadCount: number;
}

export default function ChatPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        if (activeConversation) {
            fetchMessages(activeConversation.id);
        }
    }, [activeConversation]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchConversations = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/conversations`, {
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                setConversations(data.conversations || []);
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMessages = async (conversationId: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/conversations/${conversationId}/messages`, {
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const sendMessage = async () => {
        if (!inputMessage.trim() || !activeConversation) return;

        const newMessage: ChatMessage = {
            id: Math.random().toString(36).substr(2, 9),
            senderId: user?.id || '',
            receiverId: activeConversation.otherUser.id,
            content: inputMessage,
            createdAt: new Date().toISOString(),
            isRead: false,
            type: 'text',
        };

        setMessages(prev => [...prev, newMessage]);
        setInputMessage('');

        try {
            const res = await fetch(`${API_BASE}/api/serenatas/conversations/${activeConversation.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ content: inputMessage }),
            });

            if (!res.ok) {
                console.error('Error sending message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    };

    // Conversations List View
    if (!activeConversation) {
        return (
            <div className="min-h-screen bg-zinc-50">
                {/* Header */}
                <div className="bg-white px-6 py-4 border-b border-zinc-100 sticky top-0 z-10">
                    <h1 className="text-xl font-bold text-zinc-900">Mensajes</h1>
                </div>

                {/* Conversations List */}
                <div className="divide-y divide-zinc-100">
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mx-auto" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="text-center py-12 px-6">
                            <p className="text-zinc-500">No tienes conversaciones aún</p>
                            <p className="text-sm text-zinc-400 mt-1">
                                Las conversaciones aparecerán cuando un capitán te contacte
                            </p>
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <div
                                key={conv.id}
                                onClick={() => setActiveConversation(conv)}
                                className="p-4 flex items-center gap-3 bg-white hover:bg-zinc-50 cursor-pointer transition-colors"
                            >
                                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                                    <span className="text-rose-500 font-medium text-lg">
                                        {conv.otherUser.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="font-medium text-zinc-900 truncate">
                                            {conv.otherUser.name}
                                        </p>
                                        <span className="text-xs text-zinc-400">
                                            {formatTime(conv.lastMessage.createdAt)}
                                        </span>
                                    </div>
                                    <p className={`text-sm truncate ${
                                        conv.unreadCount > 0 ? 'text-zinc-900 font-medium' : 'text-zinc-500'
                                    }`}>
                                        {conv.lastMessage.content}
                                    </p>
                                </div>
                                {conv.unreadCount > 0 && (
                                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center shrink-0">
                                        {conv.unreadCount}
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    // Chat View
    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col">
            {/* Chat Header */}
            <div className="bg-white px-4 py-3 border-b border-zinc-100 flex items-center gap-3 sticky top-0 z-10">
                <button 
                    onClick={() => setActiveConversation(null)}
                    className="p-2 -ml-2 text-zinc-600 hover:text-zinc-900"
                >
                    <IconArrowLeft size={24} />
                </button>
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                    <span className="text-rose-500 font-medium">
                        {activeConversation.otherUser.name.charAt(0).toUpperCase()}
                    </span>
                </div>
                <div className="flex-1">
                    <p className="font-medium text-zinc-900">{activeConversation.otherUser.name}</p>
                    <p className="text-xs text-zinc-500">En línea</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400">
                        <p>No hay mensajes aún</p>
                        <p className="text-sm">Envía el primer mensaje</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.senderId === user?.id;
                        const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId;

                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`flex gap-2 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {showAvatar && !isMe && (
                                        <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                                            <span className="text-rose-500 text-sm">
                                                {activeConversation.otherUser.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div className={`px-4 py-2 rounded-2xl ${
                                        isMe 
                                            ? 'bg-rose-500 text-white rounded-br-sm' 
                                            : 'bg-white text-zinc-900 rounded-bl-sm shadow-sm'
                                    }`}>
                                        <p>{msg.content}</p>
                                        <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                                            <span className={`text-xs ${isMe ? 'text-rose-100' : 'text-zinc-400'}`}>
                                                {formatTime(msg.createdAt)}
                                            </span>
                                            {isMe && (
                                                <IconCheck size={14} className="text-rose-100" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white p-3 border-t border-zinc-100">
                <div className="flex items-center gap-2">
                    <button className="p-2 text-zinc-400 hover:text-zinc-600">
                        <IconPaperclip size={24} />
                    </button>
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 px-4 py-2 bg-zinc-100 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-rose-200"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim()}
                        className="p-2 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors disabled:opacity-50"
                    >
                        <IconSend size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}

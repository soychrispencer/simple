'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
    IconArrowLeft,
    IconSend,
    IconPaperclip,
    IconCheck,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@simple/config';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';

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

        const text = inputMessage.trim();

        const newMessage: ChatMessage = {
            id: Math.random().toString(36).substr(2, 9),
            senderId: user?.id || '',
            receiverId: activeConversation.otherUser.id,
            content: text,
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
                body: JSON.stringify({ content: text }),
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
            <div className="pb-6">
                <SerenatasPageShell width="default">
                    <SerenatasPageHeader
                        title="Mensajes"
                        description={
                            conversations.length > 0
                                ? `${conversations.length} conversación${conversations.length === 1 ? '' : 'es'}`
                                : 'Chats con coordinadores y clientes'
                        }
                    />
                </SerenatasPageShell>

                <div className="divide-y border-t" style={{ borderColor: 'var(--border)' }}>
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--accent)' }} />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="text-center py-12 px-6">
                            <p style={{ color: 'var(--fg-secondary)' }}>No tienes conversaciones aún</p>
                            <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                                Las conversaciones aparecerán cuando un coordinador te contacte
                            </p>
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <div
                                key={conv.id}
                                onClick={() => setActiveConversation(conv)}
                                className="p-4 flex items-center gap-3 cursor-pointer transition-colors"
                                style={{ background: 'var(--surface)' }}
                            >
                                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent-subtle)' }}>
                                    <span className="font-medium text-lg" style={{ color: 'var(--accent)' }}>
                                        {conv.otherUser.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="font-medium truncate" style={{ color: 'var(--fg)' }}>
                                            {conv.otherUser.name}
                                        </p>
                                        <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                            {formatTime(conv.lastMessage.createdAt)}
                                        </span>
                                    </div>
                                    <p
                                        className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-medium' : ''}`}
                                        style={{ color: conv.unreadCount > 0 ? 'var(--fg)' : 'var(--fg-secondary)' }}
                                    >
                                        {conv.lastMessage.content}
                                    </p>
                                </div>
                                {conv.unreadCount > 0 && (
                                    <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center shrink-0" style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}>
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
        <div className="flex min-h-dvh flex-col">
            {/* Chat Header */}
            <div className="px-4 py-3 border-b flex items-center gap-3 sticky top-0 z-10" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <button 
                    type="button"
                    onClick={() => setActiveConversation(null)}
                    className="serenatas-interactive -ml-2 rounded-lg p-2"
                    style={{ color: 'var(--fg-secondary)' }}
                >
                    <IconArrowLeft size={24} />
                </button>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-subtle)' }}>
                    <span className="font-medium" style={{ color: 'var(--accent)' }}>
                        {activeConversation.otherUser.name.charAt(0).toUpperCase()}
                    </span>
                </div>
                <div className="flex-1">
                    <p className="font-medium" style={{ color: 'var(--fg)' }}>{activeConversation.otherUser.name}</p>
                    <p className="text-xs" style={{ color: 'var(--fg-secondary)' }}>En línea</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="text-center py-8" style={{ color: 'var(--fg-muted)' }}>
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
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent-subtle)' }}>
                                            <span className="text-sm" style={{ color: 'var(--accent)' }}>
                                                {activeConversation.otherUser.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div
                                        className={`px-4 py-2 rounded-2xl ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                                        style={{
                                            background: isMe ? 'var(--accent)' : 'var(--surface)',
                                            color: isMe ? 'var(--accent-contrast)' : 'var(--fg)',
                                            border: isMe ? 'none' : '1px solid var(--border)',
                                        }}
                                    >
                                        <p>{msg.content}</p>
                                        <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                                            <span
                                                className="text-xs"
                                                style={{ color: isMe ? 'color-mix(in oklab, var(--accent-contrast) 70%, transparent)' : 'var(--fg-muted)' }}
                                            >
                                                {formatTime(msg.createdAt)}
                                            </span>
                                            {isMe && (
                                                <IconCheck size={14} style={{ color: 'color-mix(in oklab, var(--accent-contrast) 70%, transparent)' }} />
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
            <div className="p-3 border-t" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                    <button className="p-2" style={{ color: 'var(--fg-muted)' }}>
                        <IconPaperclip size={24} />
                    </button>
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 px-4 py-2 rounded-full border-none focus:outline-none focus:ring-2"
                        style={{ background: 'var(--bg-subtle)', color: 'var(--fg)', borderColor: 'transparent' }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim()}
                        className="p-2 rounded-full transition-colors disabled:opacity-50"
                        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                    >
                        <IconSend size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}

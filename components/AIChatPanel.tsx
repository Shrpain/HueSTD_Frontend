import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, AlertCircle, ArrowDown } from 'lucide-react';
import { chatWithDocument, ChatMessage, getSystemPrompt } from '../services/aiService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface AIChatPanelProps {
    documentTitle: string;
    extractedText: string;
    onClose: () => void;
}

const AIChatPanel: React.FC<AIChatPanelProps> = ({ documentTitle, extractedText, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isAiReady, setIsAiReady] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);

    // Ref for the scrollable container
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    // Ref for the end of messages to scroll to
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change, ONLY if user is already near bottom
    useEffect(() => {
        if (messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

            if (isNearBottom) {
                scrollToBottom();
            }
        }
    }, [messages, isTyping]);

    useEffect(() => {
        let mounted = true;
        const initChat = async () => {
            if (extractedText) {
                setIsTyping(true);
                try {
                    const systemPrompt = getSystemPrompt(extractedText);
                    const response = await chatWithDocument(systemPrompt, extractedText, true);
                    if (mounted) {
                        setMessages([{ id: 'welcome', role: 'assistant', content: response, timestamp: new Date() }]);
                        setIsAiReady(true);
                    }
                } catch (err) {
                    if (mounted) {
                        setMessages([{ id: 'error', role: 'assistant', content: "Xin lỗi, không thể đọc tài liệu.", timestamp: new Date() }]);
                        setIsAiReady(true);
                    }
                } finally {
                    if (mounted) setIsTyping(false);
                }
            } else {
                if (mounted) {
                    setMessages([{ id: 'no-content', role: 'assistant', content: "Tài liệu không có nội dung.", timestamp: new Date() }]);
                    setIsAiReady(true);
                }
            }
        };
        initChat();

        // Initial scroll to bottom
        setTimeout(scrollToBottom, 100);

        return () => { mounted = false; };
    }, [extractedText]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleScroll = () => {
        if (messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
            // Show button if user is not at the bottom (allow some buffer)
            const isNotAtBottom = scrollHeight - scrollTop - clientHeight > 100;
            setShowScrollButton(isNotAtBottom);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputValue.trim() || isTyping || !isAiReady) return;

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: inputValue, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        // Force scroll to bottom when sending
        setTimeout(scrollToBottom, 50);

        try {
            const responseText = await chatWithDocument(userMsg.content, extractedText);
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: responseText, timestamp: new Date() }]);
        } catch {
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Có lỗi xảy ra.', timestamp: new Date() }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        // CRITICAL: Force height with inline style for flexbox to work
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }} className="bg-slate-50">
            {/* Messages Area - flex: 1, minHeight: 0, overflow scroll */}
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollBehavior: 'smooth' }}
                className="p-4 relative"
            >
                {extractedText.length < 50 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-3 text-yellow-800 text-sm mb-4">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <p>Tài liệu có ít nội dung.</p>
                    </div>
                )}

                <div className="space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md'}`}>
                                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-slate-700 border rounded-bl-none'}`}>
                                {msg.role === 'user' ? (
                                    <span className="whitespace-pre-wrap">{msg.content}</span>
                                ) : (
                                    <div className="prose prose-sm prose-slate max-w-none [&_p]:my-1.5 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_.katex]:text-[0.95em] [&_strong]:font-semibold [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:rounded">
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                )}
                                <p className={`text-[10px] mt-2 opacity-70 ${msg.role === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400'}`}>
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-md">
                                <Bot size={16} />
                            </div>
                            <div className="bg-white border rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                                <div className="flex gap-1.5">
                                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            {showScrollButton && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-20 right-6 p-2 bg-white text-violet-600 rounded-full shadow-lg border border-slate-200 hover:bg-slate-50 transition-all z-10 animate-in fade-in zoom-in duration-200"
                    aria-label="Cuộn xuống dưới"
                >
                    <ArrowDown size={20} />
                </button>
            )}

            {/* Input Area - MUST NOT shrink */}
            <div style={{ flexShrink: 0 }} className="p-3 bg-white border-t">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2 bg-slate-100 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-violet-500/50">
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder={isAiReady ? "Hỏi gì đó về tài liệu này..." : "AI đang đọc tài liệu..."}
                        className="flex-1 bg-transparent border-0 focus:ring-0 p-2 text-sm text-slate-700 resize-none max-h-24 min-h-[40px] outline-none"
                        rows={1}
                        disabled={isTyping || !isAiReady}
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || isTyping || !isAiReady}
                        className="p-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AIChatPanel;

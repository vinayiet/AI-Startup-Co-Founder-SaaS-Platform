"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";

interface Session {
    id: string;
    project_id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

interface Citation {
    source: string;
    content: string;
    score: number;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    citations?: Citation[];
    suggestions?: string[];
    created_at: string;
}

interface DashboardMetrics {
    startup_score: number;
    competitor_count: number;
    risk_score: number;
    financial_summary: {
        break_even?: string;
        year_1_revenue?: string;
        year_1_cost?: string;
    };
}

export default function CopilotChatWorkspace() {
    const { id: projectId } = useParams() as { id: string };
    const router = useRouter();

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);

    // Live chat parameters
    const [inputMessage, setInputMessage] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingText, setStreamingText] = useState("");
    const [streamingSuggestions, setStreamingSuggestions] = useState<string[]>([]);
    const [streamingCitations, setStreamingCitations] = useState<Citation[]>([]);

    // Metrics panel parameters
    const [metrics, setMetrics] = useState<DashboardMetrics>({
        startup_score: 0,
        competitor_count: 0,
        risk_score: 0,
        financial_summary: {}
    });

    const [newSessionTitle, setNewSessionTitle] = useState("");
    const [showNewSessionModal, setShowNewSessionModal] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const streamingTextRef = useRef("");
    const streamingSuggestionsRef = useRef<string[]>([]);
    const streamingCitationsRef = useRef<Citation[]>([]);

    useEffect(() => {
        loadSessions();
        loadDashboardMetrics();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [projectId]);

    useEffect(() => {
        if (selectedSession) {
            loadMessages(selectedSession.id);
            connectWebSocket(selectedSession.id);
        } else {
            setMessages([]);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        }
    }, [selectedSession]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingText]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const loadSessions = async () => {
        try {
            const data = await api.get<Session[]>(`/copilot/projects/${projectId}/sessions`);
            setSessions(data);
            if (data.length > 0) {
                setSelectedSession(data[0]);
            }
        } catch (err) {
            console.error("Failed to load sessions:", err);
        } finally {
            setLoadingSessions(false);
        }
    };

    const loadMessages = async (sessionId: string) => {
        setLoadingMessages(true);
        try {
            const data = await api.get<Message[]>(`/copilot/sessions/${sessionId}/messages`);
            setMessages(data);
        } catch (err) {
            console.error("Failed to load messages:", err);
        } finally {
            setLoadingMessages(false);
        }
    };

    const loadDashboardMetrics = async () => {
        try {
            const data = await api.get<DashboardMetrics>(`/copilot/projects/${projectId}/dashboard-metrics`);
            setMetrics(data);
        } catch (err) {
            console.error("Failed to load dashboard metrics:", err);
        }
    };

    const connectWebSocket = (sessionId: string) => {
        if (wsRef.current) {
            wsRef.current.close();
        }

        const token = localStorage.getItem("token") || "";
        const wsUrl = `ws://localhost:8000/api/v1/copilot/sessions/${sessionId}/chat?token=${token}`;
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("WebSocket connected to session:", sessionId);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "token") {
                    streamingTextRef.current += data.content;
                    setStreamingText(streamingTextRef.current);
                } else if (data.type === "suggestions") {
                    streamingSuggestionsRef.current = data.content || [];
                    setStreamingSuggestions(streamingSuggestionsRef.current);
                } else if (data.type === "citations") {
                    streamingCitationsRef.current = data.content || [];
                    setStreamingCitations(streamingCitationsRef.current);
                } else if (data.type === "done") {
                    setIsStreaming(false);
                    // Add streamed message into full state messages array
                    const newMsg: Message = {
                        id: Math.random().toString(),
                        role: "assistant",
                        content: streamingTextRef.current,
                        citations: streamingCitationsRef.current,
                        suggestions: streamingSuggestionsRef.current,
                        created_at: new Date().toISOString()
                    };
                    setMessages((prev) => [...prev, newMsg]);
                    
                    // Reset refs
                    streamingTextRef.current = "";
                    streamingSuggestionsRef.current = [];
                    streamingCitationsRef.current = [];
                    
                    // Reset state
                    setStreamingText("");
                    setStreamingSuggestions([]);
                    setStreamingCitations([]);
                    
                    loadDashboardMetrics(); // Refresh right side panel metrics
                } else if (data.type === "error") {
                    setIsStreaming(false);
                    alert(`Error: ${data.content}`);
                }
            } catch (err) {
                console.error("Failed to parse websocket message:", err);
            }
        };

        ws.onclose = () => {
            console.log("WebSocket connection closed");
        };

        ws.onerror = (err) => {
            console.error("WebSocket encountered an error:", err);
        };
    };

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSessionTitle.trim()) return;

        try {
            const newSession = await api.post<Session>(`/copilot/projects/${projectId}/sessions`, {
                title: newSessionTitle
            });
            setSessions([newSession, ...sessions]);
            setSelectedSession(newSession);
            setNewSessionTitle("");
            setShowNewSessionModal(false);
        } catch (err) {
            alert("Failed to create advisor session.");
        }
    };

    const handleSendMessage = (textToSend?: string) => {
        const messageText = textToSend || inputMessage;
        if (!messageText.trim() || isStreaming || !selectedSession) return;

        // Add user message to UI state first
        const userMsg: Message = {
            id: Math.random().toString(),
            role: "user",
            content: messageText,
            created_at: new Date().toISOString()
        };
        setMessages((prev) => [...prev, userMsg]);
        
        if (!textToSend) {
            setInputMessage("");
        }

        // Trigger websocket stream
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            setIsStreaming(true);
            
            // Clear refs
            streamingTextRef.current = "";
            streamingSuggestionsRef.current = [];
            streamingCitationsRef.current = [];
            
            // Clear state
            setStreamingText("");
            setStreamingSuggestions([]);
            setStreamingCitations([]);
            
            wsRef.current.send(JSON.stringify({ content: messageText }));
        } else {
            alert("Connection lost. Retrying to connect...");
            connectWebSocket(selectedSession.id);
        }
    };

    if (!mounted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-[#f4f4f5] font-sans">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-zinc-400">Loading AI Copilot...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#09090b] text-[#f4f4f5] font-sans relative select-none">
            {/* Background Glows */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-pink-900/5 rounded-full blur-[150px] pointer-events-none" />

            {/* Header */}
            <header className="border-b border-zinc-900 bg-zinc-950/70 backdrop-blur-md px-8 py-4 flex items-center justify-between sticky top-0 z-45">
                <div className="flex items-center gap-4">
                    <Link href={`/dashboard/project/${projectId}`} className="text-zinc-400 hover:text-white transition-all text-xs flex items-center gap-2 group">
                        <span className="transform group-hover:-translate-x-1 transition-transform">&larr;</span> Back to Workspace
                    </Link>
                    <span className="text-zinc-800">|</span>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                        <h1 className="text-sm font-bold text-white tracking-tight">AI Founder Copilot Advisor</h1>
                    </div>
                </div>
            </header>

            {/* Content Body */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                
                {/* Left Panel: Advisor Sessions */}
                <aside className="w-full lg:w-72 sidebar-gradient p-6 border-r border-zinc-900 flex flex-col gap-4 overflow-y-auto">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">Chat History</span>
                        <button
                            onClick={() => setShowNewSessionModal(true)}
                            className="bg-purple-600/15 border border-purple-500/20 hover:bg-purple-600/25 text-purple-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                            + New Session
                        </button>
                    </div>

                    <div className="space-y-1.5 flex-1 max-h-[40vh] lg:max-h-none overflow-y-auto">
                        {loadingSessions ? (
                            <p className="text-[10px] text-zinc-600 italic">Syncing session archives...</p>
                        ) : sessions.length === 0 ? (
                            <p className="text-[10px] text-zinc-600 italic">No chat sessions found. Start a new advisor session above.</p>
                        ) : (
                            sessions.map((sess) => (
                                <button
                                    key={sess.id}
                                    onClick={() => setSelectedSession(sess)}
                                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 flex flex-col gap-1 ${
                                        selectedSession?.id === sess.id
                                            ? "bg-purple-950/20 text-purple-400 border-purple-500/30 shadow-md"
                                            : "text-zinc-400 hover:text-white border-transparent hover:bg-zinc-900/40"
                                    }`}
                                >
                                    <span className="text-xs font-bold tracking-wide truncate block w-full">💬 {sess.title}</span>
                                    <span className="text-[8px] text-zinc-550 block select-none">
                                        {new Date(sess.created_at).toLocaleDateString()} at {new Date(sess.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </aside>

                {/* Center Panel: Chat Interface */}
                <main className="flex-1 flex flex-col bg-grid-pattern relative min-h-[50vh] lg:min-h-0">
                    <div className="flex-1 p-6 overflow-y-auto space-y-4">
                        {loadingMessages ? (
                            <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                                Fetching advisor message context...
                            </div>
                        ) : messages.length === 0 && !isStreaming ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 max-w-sm mx-auto">
                                <div className="text-4xl">🤖</div>
                                <h3 className="text-md font-bold text-white">Start Your Advisory Chat</h3>
                                <p className="text-zinc-500 text-xs leading-relaxed">
                                    Ask me anything about your project reports, roadmap tasks, competitor models, or risks. 
                                    Use **`/` commands** to quickly query specific sections.
                                </p>
                                <div className="grid grid-cols-2 gap-2 w-full pt-2">
                                    <button onClick={() => handleSendMessage("/roadmap")} className="bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 p-2 rounded-xl text-[10px] font-mono text-left">/roadmap</button>
                                    <button onClick={() => handleSendMessage("/risks")} className="bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 p-2 rounded-xl text-[10px] font-mono text-left">/risks</button>
                                    <button onClick={() => handleSendMessage("/competitors")} className="bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 p-2 rounded-xl text-[10px] font-mono text-left">/competitors</button>
                                    <button onClick={() => handleSendMessage("/investors")} className="bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 p-2 rounded-xl text-[10px] font-mono text-left">/investors</button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 select-text max-w-3xl mx-auto">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                        <div className={`p-4 rounded-2xl max-w-[85%] text-xs leading-relaxed border ${
                                            msg.role === "user"
                                                ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/10"
                                                : "bg-zinc-950 text-zinc-200 border-zinc-900 leading-relaxed whitespace-pre-wrap font-sans"
                                        }`}>
                                            {msg.content}
                                        </div>

                                        {/* Citations dropdown for assistant messages */}
                                        {msg.citations && msg.citations.length > 0 && (
                                            <div className="mt-2 pl-2 w-full max-w-[85%]">
                                                <details className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer select-none">
                                                    <summary className="font-semibold">Citations & References ({msg.citations.length})</summary>
                                                    <div className="mt-2 space-y-2 bg-zinc-950/80 border border-zinc-900 rounded-xl p-3 select-text leading-relaxed">
                                                        {msg.citations.map((cite, cIdx) => (
                                                            <div key={cIdx} className="border-b border-zinc-900/60 last:border-b-0 pb-1.5 last:pb-0">
                                                                <span className="text-purple-400 font-mono text-[9px] uppercase tracking-wider block">[{cIdx + 1}] Source: {cite.source}</span>
                                                                <p className="text-zinc-400 mt-0.5">{cite.content}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </details>
                                            </div>
                                        )}

                                        {/* Dynamic suggested questions list */}
                                        {msg.suggestions && msg.suggestions.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2 w-full max-w-[85%]">
                                                {msg.suggestions.map((sug, sIdx) => (
                                                    <button
                                                        key={sIdx}
                                                        onClick={() => handleSendMessage(sug)}
                                                        className="bg-zinc-900 border border-zinc-800 hover:border-purple-500/30 hover:text-purple-400 text-zinc-400 text-[10px] font-semibold px-3 py-1.5 rounded-full transition-all shadow-sm"
                                                    >
                                                        {sug}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Streaming Message display */}
                                {isStreaming && streamingText && (
                                    <div className="flex flex-col items-start">
                                        <div className="p-4 rounded-2xl max-w-[85%] text-xs leading-relaxed bg-zinc-950 text-zinc-200 border border-zinc-900 whitespace-pre-wrap font-sans">
                                            {streamingText}
                                            <span className="inline-block w-1 h-3.5 ml-1 bg-purple-500 animate-pulse align-middle" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Dynamic Command Helper Drawer */}
                    {inputMessage.startsWith("/") && (
                        <div className="px-6 py-2 border-t border-zinc-900 bg-zinc-950/60 backdrop-blur-sm max-w-3xl mx-auto w-full flex gap-3 text-[10px] font-mono text-zinc-500 scrollbar-none overflow-x-auto select-none">
                            <span className="text-purple-400 font-bold">Commands:</span>
                            <span className="cursor-pointer hover:text-white" onClick={() => setInputMessage("/roadmap")}>/roadmap (MVP phases)</span>
                            <span className="cursor-pointer hover:text-white" onClick={() => setInputMessage("/risks")}>/risks (Mitigations)</span>
                            <span className="cursor-pointer hover:text-white" onClick={() => setInputMessage("/competitors")}>/competitors (Market gaps)</span>
                            <span className="cursor-pointer hover:text-white" onClick={() => setInputMessage("/financials")}>/financials (Revenue targets)</span>
                            <span className="cursor-pointer hover:text-white" onClick={() => setInputMessage("/market")}>/market (TAM / SOM trends)</span>
                            <span className="cursor-pointer hover:text-white" onClick={() => setInputMessage("/investors")}>/investors (VC Brief)</span>
                        </div>
                    )}

                    {/* Chat Input Field */}
                    <div className="p-6 border-t border-zinc-900 bg-zinc-950/30 backdrop-blur-md">
                        <div className="max-w-3xl mx-auto flex items-center gap-3 relative">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSendMessage();
                                }}
                                disabled={isStreaming}
                                placeholder={isStreaming ? "AI Advisor is formulating strategy..." : "Ask your Advisor or type '/' for commands..."}
                                className="flex-1 bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-550 focus:outline-none focus:border-purple-500 disabled:opacity-60 transition-all font-sans"
                            />
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={isStreaming || !inputMessage.trim()}
                                className="bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-650 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 disabled:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </main>

                {/* Right Panel: Startup Health Statistics */}
                <aside className="w-full lg:w-72 sidebar-gradient p-6 border-l border-zinc-900 flex flex-col gap-6 overflow-y-auto">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">Project Health Metrics</span>
                    
                    {/* Startup Validation Score circular indicator */}
                    <div className="glass-panel p-5 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center text-center shadow-lg relative group">
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-4">Startup Score</h4>
                        <div className="relative w-28 h-28 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="56" cy="56" r="48" className="stroke-zinc-900 fill-transparent" strokeWidth="6" />
                                <circle
                                    cx="56"
                                    cy="56"
                                    r="48"
                                    className="stroke-purple-600 fill-transparent transition-all duration-1000"
                                    strokeWidth="6"
                                    strokeDasharray={301.6}
                                    strokeDashoffset={301.6 - (301.6 * (metrics.startup_score || 0)) / 100}
                                />
                            </svg>
                            <span className="absolute text-xl font-black text-white">{metrics.startup_score || 0}%</span>
                        </div>
                        <p className="text-[9px] text-zinc-500 mt-4 leading-relaxed">Confidence grade compiled from LLM evaluation matrix reports.</p>
                    </div>

                    {/* Competitor count stat card */}
                    <div className="glass-panel p-5 rounded-2xl border border-zinc-800 border-l-4 border-l-blue-500 shadow-md">
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Competitors Tracked</h4>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-white">{metrics.competitor_count || 0}</span>
                            <span className="text-[10px] text-zinc-500">niche platforms</span>
                        </div>
                    </div>

                    {/* Risk index stat card */}
                    <div className="glass-panel p-5 rounded-2xl border border-zinc-800 border-l-4 border-l-rose-500 shadow-md">
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Risk Index Score</h4>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-white">{metrics.risk_score || 0}</span>
                            <span className="text-[10px] text-zinc-500">/ 100</span>
                        </div>
                        <div className="w-full bg-zinc-950 border border-zinc-900 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div className="bg-rose-500 h-full rounded-full" style={{ width: `${metrics.risk_score || 0}%` }} />
                        </div>
                    </div>

                    {/* Financial projection card */}
                    <div className="glass-panel p-5 rounded-2xl border border-zinc-800 border-l-4 border-l-emerald-500 shadow-md space-y-2.5">
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Financial Highlights</h4>
                        <div className="space-y-1.5 text-[10px] font-mono text-zinc-450">
                            <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                                <span>Break-Even:</span>
                                <span className="text-white font-bold">{metrics.financial_summary?.break_even || "N/A"}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                                <span>Yr 1 Revenue:</span>
                                <span className="text-emerald-400 font-bold">{metrics.financial_summary?.year_1_revenue || "N/A"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Yr 1 Cost:</span>
                                <span className="text-rose-400 font-bold">{metrics.financial_summary?.year_1_cost || "N/A"}</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Create Session Dialog Modal */}
            {showNewSessionModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0c0c0e] border border-zinc-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
                        <h2 className="text-md font-bold text-white mb-1">Create Advisor Session</h2>
                        <p className="text-[10px] text-zinc-500 mb-4">Choose a title for your advisory chat session.</p>
                        
                        <form onSubmit={handleCreateSession} className="space-y-4">
                            <input
                                type="text"
                                required
                                placeholder="e.g. Scaling Tech Moats"
                                value={newSessionTitle}
                                onChange={(e) => setNewSessionTitle(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-sans"
                            />
                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowNewSessionModal(false)}
                                    className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white px-3.5 py-2 rounded-xl text-xs font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold"
                                >
                                    Create Session
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";

interface Project {
    id: string;
    name: string;
    description: string;
}

interface DebateRound {
    id?: string;
    agent_name: string;
    round_number: number;
    content: string;
    stance: string;
    agreements?: string[];
    disagreements?: string[];
    created_at?: string;
}

interface Vote {
    id?: string;
    agent_name: string;
    vote: string;
    confidence: number;
    rationale: string;
    created_at?: string;
}

interface BoardMeeting {
    id: string;
    project_id: string;
    topic: string;
    status: "pending" | "running" | "completed" | "failed";
    final_decision?: string;
    confidence_score: number;
    summary?: string;
    action_items?: string[];
    created_at: string;
    rounds?: DebateRound[];
    votes?: Vote[];
}

const ADVISORS: Record<string, { title: string; name: string; role: string; icon: string; bg: string; border: string; text: string }> = {
    "CEO Advisor": { 
        title: "CEO Advisor", 
        name: "Elena Rostova", 
        role: "Growth & Velocity Strategy", 
        icon: "💼",
        bg: "from-blue-600/10 to-indigo-600/10",
        border: "border-blue-500/20",
        text: "text-blue-400"
    },
    "CTO Advisor": { 
        title: "CTO Advisor", 
        name: "Vikram Malhotra", 
        role: "Architecture & Tech Feasibility", 
        icon: "⚙️",
        bg: "from-cyan-600/10 to-blue-600/10",
        border: "border-cyan-500/20",
        text: "text-cyan-400"
    },
    "CFO Advisor": { 
        title: "CFO Advisor", 
        name: "Marcus Thorne", 
        role: "Unit Economics & Runway", 
        icon: "📊",
        bg: "from-emerald-600/10 to-teal-600/10",
        border: "border-emerald-500/20",
        text: "text-emerald-400"
    },
    "Investor Advisor": { 
        title: "Investor Rep", 
        name: "Sarah Jenkins", 
        role: "Market TAM & Venture Return", 
        icon: "💰",
        bg: "from-amber-600/10 to-yellow-600/10",
        border: "border-amber-500/20",
        text: "text-amber-400"
    },
    "Marketing Advisor": { 
        title: "CMO Advisor", 
        name: "Chloe Dupont", 
        role: "Acquisition & GTM Channels", 
        icon: "📢",
        bg: "from-purple-600/10 to-pink-600/10",
        border: "border-purple-500/20",
        text: "text-purple-400"
    },
    "Product Advisor": { 
        title: "CPO Advisor", 
        name: "Kenji Sato", 
        role: "MVP Priority & UX Scope", 
        icon: "📦",
        bg: "from-rose-600/10 to-orange-600/10",
        border: "border-rose-500/20",
        text: "text-rose-400"
    },
    "Legal Advisor": { 
        title: "General Counsel", 
        name: "David Vance", 
        role: "Regulation & Liability Protection", 
        icon: "⚖️",
        bg: "from-slate-600/10 to-zinc-600/10",
        border: "border-slate-500/20",
        text: "text-slate-400"
    },
    "Operations Advisor": { 
        title: "COO Advisor", 
        name: "Sanjay Gupta", 
        role: "Execution Logistics & Scaling", 
        icon: "🏭",
        bg: "from-sky-600/10 to-indigo-600/10",
        border: "border-sky-500/20",
        text: "text-sky-400"
    },
    "Risk Advisor": { 
        title: "CRO Advisor", 
        name: "Frederik Lindqvist", 
        role: "Competitive Threats & Resilience", 
        icon: "🛡️",
        bg: "from-red-600/10 to-orange-600/10",
        border: "border-red-500/20",
        text: "text-red-400"
    },
    "Customer Representative": { 
        title: "User Advocate", 
        name: "Aria Miller", 
        role: "Voice of the Customer", 
        icon: "👥",
        bg: "from-violet-600/10 to-fuchsia-600/10",
        border: "border-violet-500/20",
        text: "text-violet-400"
    },
    "Moderator Advisor": { 
        title: "Board Moderator", 
        name: "AI Moderator", 
        role: "Debate Facilitation & Synthesis", 
        icon: "🎙️",
        bg: "from-indigo-600/10 to-purple-600/10",
        border: "border-indigo-500/20",
        text: "text-indigo-400"
    }
};

const TOPIC_PRESETS = [
    "Should we raise a Seed round of ₹5 Crore ($600k) at a ₹35 Crore valuation?",
    "Should we pivot from B2C to enterprise B2B SaaS for better unit economics?",
    "Should we offer a lifetime deal (LTD) for early traction despite long-term costs?",
    "Should we hire two senior engineering leaders now, increasing our burn rate by 40%?",
    "Should we delay public launch by 2 months to audit security & compliance issues?"
];

export default function BoardMeetingWorkspace() {
    const { id: projectId } = useParams() as { id: string };
    const router = useRouter();

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // State Variables
    const [project, setProject] = useState<Project | null>(null);
    const [meetings, setMeetings] = useState<BoardMeeting[]>([]);
    const [activeMeeting, setActiveMeeting] = useState<BoardMeeting | null>(null);
    const [selectedMeeting, setSelectedMeeting] = useState<BoardMeeting | null>(null);
    
    // UI parameters
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [newTopic, setNewTopic] = useState("");
    const [activeSpeakingAgent, setActiveSpeakingAgent] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"debate" | "votes">("debate");

    // Streaming Log Console State
    const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
    const logsEndRef = useRef<HTMLDivElement | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    // Load initial project details and meeting history
    useEffect(() => {
        if (projectId) {
            loadProject();
            loadMeetings();
        }
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [projectId]);

    // Scroll log console to bottom when new logs stream in
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [terminalLogs]);

    const loadProject = async () => {
        try {
            const data = await api.get<Project>(`/projects/${projectId}`);
            setProject(data);
        } catch (err) {
            console.error("Failed to load project:", err);
            router.push("/dashboard");
        }
    };

    const loadMeetings = async () => {
        setLoading(true);
        try {
            const data = await api.get<BoardMeeting[]>(`/board/projects/${projectId}/meetings`);
            setMeetings(data);
            
            // Check if any meeting is running or pending
            const active = data.find(m => ["pending", "running"].includes(m.status));
            if (active) {
                setActiveMeeting(active);
                setSelectedMeeting(active);
                connectWebSocket(active.id);
            } else if (data.length > 0 && !selectedMeeting) {
                // Load details of latest completed meeting
                loadMeetingDetails(data[0].id);
            }
        } catch (err) {
            console.error("Failed to load meetings:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadMeetingDetails = async (meetingId: string) => {
        try {
            const details = await api.get<BoardMeeting>(`/board/meetings/${meetingId}`);
            setSelectedMeeting(details);
            
            // Populate terminal logs for completed meetings to make history review beautiful
            const generatedLogs: string[] = [];
            generatedLogs.push("[System] Loading archived meeting debate...");
            if (details.rounds) {
                details.rounds.forEach(r => {
                    generatedLogs.push(`[${r.agent_name}] Debate stance: ${r.stance.toUpperCase()}`);
                    generatedLogs.push(`[${r.agent_name}] "${r.content}"`);
                });
            }
            if (details.status === "completed") {
                generatedLogs.push(`[System] Debate concluded. Resolution: ${details.final_decision}`);
            }
            setTerminalLogs(generatedLogs);
        } catch (err) {
            console.error("Failed to load meeting details:", err);
        }
    };

    const handleSelectMeeting = (meeting: BoardMeeting) => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setTerminalLogs([]);
        setActiveSpeakingAgent(null);
        
        if (["pending", "running"].includes(meeting.status)) {
            setActiveMeeting(meeting);
            setSelectedMeeting(meeting);
            connectWebSocket(meeting.id);
        } else {
            setActiveMeeting(null);
            loadMeetingDetails(meeting.id);
        }
    };

    const getWsUrl = (meetingId: string) => {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
        const wsBase = baseUrl.replace(/^http/, "ws");
        return `${wsBase}/board/meetings/${meetingId}/stream`;
    };

    const connectWebSocket = (meetingId: string) => {
        if (wsRef.current) {
            wsRef.current.close();
        }

        setTerminalLogs(["[System] Establishing secure board line...", "[System] Waiting for moderators..."]);
        const url = getWsUrl(meetingId);
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            setTerminalLogs(prev => [...prev, "[System] Secure board connection initialized."]);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Handle Keepalive Pings
                if (data.ping) return;

                // Handle status updates
                if (data.status) {
                    if (data.status === "running") {
                        if (data.log) {
                            setTerminalLogs(prev => [...prev, data.log]);
                        }
                        
                        // Handle streaming of advisor statements
                        if (data.agent_name) {
                            setActiveSpeakingAgent(data.agent_name);
                            
                            // Append new round entry to current selectedMeeting snapshot
                            setSelectedMeeting(prev => {
                                if (!prev) return null;
                                const prevRounds = prev.rounds || [];
                                // Check if round is already present
                                const exists = prevRounds.some(r => r.agent_name === data.agent_name && r.content === data.content);
                                if (exists) return prev;
                                
                                return {
                                    ...prev,
                                    status: "running",
                                    rounds: [...prevRounds, {
                                        agent_name: data.agent_name,
                                        round_number: prevRounds.length + 1,
                                        content: data.content,
                                        stance: data.stance,
                                        agreements: data.agreements,
                                        disagreements: data.disagreements
                                    }]
                                };
                            });

                            // Add a clean terminal line
                            setTerminalLogs(prev => [
                                ...prev, 
                                `[${data.agent_name}] (${data.stance.toUpperCase()} stance): ${data.content}`
                            ]);
                        }
                    } else if (data.status === "completed") {
                        setActiveSpeakingAgent(null);
                        setTerminalLogs(prev => [
                            ...prev, 
                            `[System] Consensus reached: ${data.final_decision}`,
                            `[System] Final Summary: ${data.summary}`,
                            `[System] Meeting successfully adjourned.`
                        ]);
                        
                        // Refetch details to get complete DB rows including individual votes and summaries
                        loadMeetingDetails(meetingId);
                        setActiveMeeting(null);
                        loadMeetings();
                        
                        if (wsRef.current) {
                            wsRef.current.close();
                        }
                    } else if (data.status === "failed") {
                        setActiveSpeakingAgent(null);
                        setTerminalLogs(prev => [
                            ...prev, 
                            `[System ERROR] Meeting adjourned abnormally: ${data.summary || "Execution failed."}`
                        ]);
                        setActiveMeeting(null);
                        loadMeetings();
                        
                        if (wsRef.current) {
                            wsRef.current.close();
                        }
                    }
                }
            } catch (err) {
                console.error("Error parsing socket message:", err);
            }
        };

        ws.onclose = () => {
            setTerminalLogs(prev => [...prev, "[System] Board meeting stream disconnected."]);
        };

        ws.onerror = (err) => {
            console.error("Socket error:", err);
            setTerminalLogs(prev => [...prev, "[System ERROR] WebSocket network disruption."]);
        };
    };

    const handleStartMeeting = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const topic = newTopic.trim();
        if (!topic) return;

        setSubmitting(true);
        try {
            const res = await api.post<BoardMeeting>(`/board/projects/${projectId}/meetings`, {
                topic: topic
            });
            setNewTopic("");
            setActiveMeeting(res);
            setSelectedMeeting(res);
            setTerminalLogs([]);
            connectWebSocket(res.id);
            loadMeetings();
        } catch (err: any) {
            alert(err.message || "Failed to initialize board meeting.");
        } finally {
            setSubmitting(false);
        }
    };

    // Derived values for components
    const isMeetingActive = activeMeeting !== null;
    
    // Group rounds and votes by Advisor name for card renderings
    const advisorStateMap = useMemo(() => {
        if (!selectedMeeting) return {};
        const map: Record<string, { statement?: string; stance?: string; vote?: string; confidence?: number; rationale?: string }> = {};
        
        // Load debate statements
        if (selectedMeeting.rounds) {
            selectedMeeting.rounds.forEach(r => {
                map[r.agent_name] = {
                    statement: r.content,
                    stance: r.stance
                };
            });
        }
        
        // Load final votes
        if (selectedMeeting.votes) {
            selectedMeeting.votes.forEach(v => {
                if (!map[v.agent_name]) map[v.agent_name] = {};
                map[v.agent_name].vote = v.vote;
                map[v.agent_name].confidence = v.confidence;
                map[v.agent_name].rationale = v.rationale;
            });
        }
        
        return map;
    }, [selectedMeeting]);

    if (!mounted) return null;

    return (
        <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100 font-sans select-none relative">
            {/* Ambient Background Glow */}
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
                        <h1 className="text-sm font-bold text-white tracking-tight">{project?.name} Boardroom</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href={`/dashboard/project/${projectId}/copilot`}
                        className="bg-zinc-900 border border-zinc-800 hover:border-purple-500/30 hover:bg-zinc-850 hover:text-purple-400 text-zinc-300 text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5"
                    >
                        <span>🤖</span> AI Founder Copilot
                    </Link>
                    <Link
                        href={`/dashboard/project/${projectId}/reports`}
                        className="bg-zinc-900 border border-zinc-800 hover:border-purple-500/30 hover:bg-zinc-850 hover:text-purple-400 text-zinc-300 text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5"
                    >
                        <span>📄</span> Evaluation Reports
                    </Link>
                </div>
            </header>

            {/* Workspace Split */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Left Panel: History & Board Setup */}
                <div className="w-full lg:w-[320px] xl:w-[350px] border-r border-zinc-900 bg-zinc-950/40 backdrop-blur-sm p-6 overflow-y-auto space-y-6 flex flex-col justify-between sidebar-gradient">
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Board Decisions</h2>
                            
                            {/* Start Board Meeting Card */}
                            {!isMeetingActive ? (
                                <form onSubmit={handleStartMeeting} className="space-y-4">
                                    <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-3">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Initiate a Board Resolution</label>
                                        <textarea
                                            value={newTopic}
                                            onChange={(e) => setNewTopic(e.target.value)}
                                            placeholder="Enter debate topic (e.g. Raise Seed Round? Pivot pricing model?)"
                                            rows={3}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-purple-500 transition-all resize-none leading-relaxed"
                                        />
                                        
                                        {/* Presets Chips */}
                                        <div className="space-y-1.5">
                                            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider block">Quick Topics</span>
                                            <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                                                {TOPIC_PRESETS.map((preset, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setNewTopic(preset)}
                                                        className="text-[9px] bg-zinc-900/60 hover:bg-purple-950/20 border border-zinc-800/80 hover:border-purple-500/30 text-zinc-400 hover:text-purple-300 px-2 py-1 rounded-lg transition-all text-left truncate max-w-full"
                                                    >
                                                        {preset}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={submitting || !newTopic.trim()}
                                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-550 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-purple-500/10 active:scale-[0.98]"
                                        >
                                            {submitting ? "Convening Board..." : "🎙️ Start Board Meeting"}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="p-4 bg-purple-950/10 border border-purple-900/30 rounded-2xl space-y-3 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl animate-pulse" />
                                    <div className="flex items-center gap-2">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                                        </span>
                                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Meeting Active</span>
                                    </div>
                                    <p className="text-xs text-zinc-300 font-semibold leading-relaxed line-clamp-3">
                                        {activeMeeting.topic}
                                    </p>
                                    <div className="text-[9px] text-zinc-500 bg-zinc-950 px-2 py-1.5 rounded-lg border border-zinc-900 select-text">
                                        Meeting ID: {activeMeeting.id.slice(0, 8)}...
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Meeting History List */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Resolution Archives</h3>
                            {loading ? (
                                <div className="space-y-2">
                                    <div className="h-12 bg-zinc-900/30 animate-pulse rounded-xl" />
                                    <div className="h-12 bg-zinc-900/30 animate-pulse rounded-xl" />
                                </div>
                            ) : meetings.length === 0 ? (
                                <p className="text-[10px] text-zinc-650 italic text-center py-4">No meetings archived.</p>
                            ) : (
                                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                                    {meetings.map((m) => {
                                        const isSelected = selectedMeeting?.id === m.id;
                                        return (
                                            <button
                                                key={m.id}
                                                onClick={() => handleSelectMeeting(m)}
                                                className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex flex-col gap-1.5 ${
                                                    isSelected 
                                                        ? "bg-purple-950/15 border-purple-500/40 shadow-inner" 
                                                        : "bg-zinc-950/20 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/10"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold border uppercase tracking-wider ${
                                                        m.status === "completed" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                                        m.status === "failed" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                                                        "bg-purple-500/10 border-purple-500/20 text-purple-400 animate-pulse"
                                                    }`}>
                                                        {m.status}
                                                    </span>
                                                    <span className="text-[8px] text-zinc-600 font-mono">
                                                        {new Date(m.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className={`font-semibold tracking-tight leading-relaxed truncate-3 ${
                                                    isSelected ? "text-purple-300" : "text-zinc-400"
                                                }`}>
                                                    {m.topic}
                                                </p>
                                                {m.final_decision && (
                                                    <div className="flex items-center justify-between mt-1 text-[9px] font-semibold text-zinc-500 border-t border-zinc-900 pt-1">
                                                        <span>Verdict: {m.final_decision}</span>
                                                        <span className="text-zinc-600">Conf: {(m.confidence_score * 100).toFixed(0)}%</span>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Console HUD Telemetry logs */}
                    <div className="border border-zinc-900 bg-zinc-950 rounded-2xl overflow-hidden shadow-xl mt-4">
                        <div className="bg-zinc-900/60 border-b border-zinc-900 px-4 py-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-rose-500/60" />
                                <div className="w-2 h-2 rounded-full bg-amber-500/60" />
                                <div className="w-2 h-2 rounded-full bg-emerald-500/60" />
                            </div>
                            <span className="text-[9px] font-mono text-zinc-500 tracking-wider">board_comm_telemetry</span>
                        </div>
                        <div className="p-4 h-44 overflow-y-auto text-[10px] font-mono text-zinc-500 space-y-2 select-text scrollbar-thin">
                            {terminalLogs.length > 0 ? (
                                terminalLogs.map((log, idx) => (
                                    <div key={idx} className="flex gap-2 items-start border-l border-zinc-900 pl-2 leading-relaxed">
                                        <span className="text-zinc-700 select-none">&gt;</span>
                                        <span className={
                                            log.includes("[System ERROR]") ? "text-red-400" :
                                            log.includes("[System]") ? "text-zinc-400" :
                                            log.includes("(SUPPORTIVE stance)") ? "text-emerald-400" :
                                            log.includes("(SKEPTICAL stance)") ? "text-rose-400" :
                                            "text-zinc-500"
                                        }>{log}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-zinc-750 italic text-center py-12">Waiting for boardroom trigger...</p>
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>

                {/* Right Panel: Main Boardroom Visual Workspace */}
                <div className="flex-1 p-8 overflow-y-auto bg-grid-pattern relative flex flex-col">
                    {!selectedMeeting ? (
                        /* Showcase Banner */
                        <div className="max-w-xl mx-auto w-full text-center space-y-8 py-20 my-auto">
                            <div className="relative inline-flex items-center justify-center">
                                <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl animate-pulse" />
                                <div className="w-24 h-24 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-5xl shadow-2xl relative z-10">
                                    💼
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black text-white tracking-tight">AI Virtual Board of Directors</h3>
                                <p className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
                                    Review startup proposals or raise active topics to convene a board debate. 
                                    11 specialized advisors (CEO, CTO, CFO, CRO, etc.) will critique the ideas, debate constraints, 
                                    cast weighted votes, and synthesis operational resolutions.
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* Active boardroom dashboard Workspace */
                        <div className="space-y-8 flex-1 flex flex-col justify-between">
                            {/* Meeting Header Metadata Banner */}
                            <div className="p-6 bg-zinc-950/40 border border-zinc-900 rounded-2xl glass-card flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                                <div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider ${
                                            selectedMeeting.status === "completed" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                            selectedMeeting.status === "failed" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                                            "bg-purple-500/10 border-purple-500/20 text-purple-400 animate-pulse"
                                        }`}>
                                            {selectedMeeting.status}
                                        </span>
                                        <span className="text-[10px] text-zinc-500 font-mono">
                                            Convened: {new Date(selectedMeeting.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <h2 className="text-base font-extrabold text-white tracking-tight leading-relaxed">
                                        {selectedMeeting.topic}
                                    </h2>
                                </div>

                                {/* Consensus Gauge Metrics if Completed */}
                                {selectedMeeting.status === "completed" && (
                                    <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-zinc-900 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
                                        {/* Consensus Verdict Indicator */}
                                        <div className="text-center md:text-left space-y-1">
                                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Consensus Verdict</span>
                                            <span className={`text-base font-black tracking-tight filter drop-shadow-md ${
                                                selectedMeeting.final_decision === "Approved" ? "text-emerald-400 neon-text-glow" :
                                                selectedMeeting.final_decision === "Approved with Caution" ? "text-amber-400" :
                                                "text-rose-400"
                                            }`}>
                                                {selectedMeeting.final_decision}
                                            </span>
                                        </div>

                                        {/* Custom Circular SVG Confidence Gauge */}
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-12 h-12 flex items-center justify-center">
                                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                                    <circle cx="18" cy="18" r="16" fill="transparent" stroke="#18181b" strokeWidth="2.5" />
                                                    <circle 
                                                        cx="18" 
                                                        cy="18" 
                                                        r="16" 
                                                        fill="transparent" 
                                                        stroke={
                                                            selectedMeeting.final_decision === "Approved" ? "#10b981" :
                                                            selectedMeeting.final_decision === "Approved with Caution" ? "#f59e0b" :
                                                            "#f43f5e"
                                                        } 
                                                        strokeWidth="2.5" 
                                                        strokeDasharray={`${selectedMeeting.confidence_score * 100}, 100`} 
                                                    />
                                                </svg>
                                                <span className="absolute text-[10px] font-black font-mono text-white">
                                                    {(selectedMeeting.confidence_score * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="space-y-0.5">
                                                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Confidence</span>
                                                <span className="text-[10px] text-zinc-400 font-mono">Weighted Ratio</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Main Boardroom Area */}
                            <div className="flex-1 space-y-6">
                                {/* Navigation tabs for Completed meeting details */}
                                {selectedMeeting.status === "completed" && (
                                    <div className="flex border-b border-zinc-900 gap-4">
                                        <button
                                            onClick={() => setActiveTab("debate")}
                                            className={`pb-2 text-xs font-bold transition-all relative ${
                                                activeTab === "debate" ? "text-purple-400" : "text-zinc-500 hover:text-zinc-300"
                                            }`}
                                        >
                                            Debate Statements
                                            {activeTab === "debate" && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setActiveTab("votes")}
                                            className={`pb-2 text-xs font-bold transition-all relative ${
                                                activeTab === "votes" ? "text-purple-400" : "text-zinc-500 hover:text-zinc-300"
                                            }`}
                                        >
                                            Final Advisor Votes
                                            {activeTab === "votes" && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                                            )}
                                        </button>
                                    </div>
                                )}

                                {/* Dynamic Grid of 11 Advisors */}
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {Object.entries(ADVISORS).map(([key, info]) => {
                                        const state = advisorStateMap[key];
                                        const isSpeaking = activeSpeakingAgent === key;
                                        const hasSpoken = state !== undefined;
                                        
                                        return (
                                            <div 
                                                key={key} 
                                                className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-[210px] ${
                                                    isSpeaking 
                                                        ? "bg-purple-950/20 border-purple-500 shadow-lg scale-[1.03] ring-1 ring-purple-500/20" 
                                                        : hasSpoken 
                                                            ? "bg-zinc-900/30 border-zinc-800" 
                                                            : "bg-zinc-950/10 border-zinc-950 opacity-40"
                                                }`}
                                            >
                                                {/* Header info */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-3.5">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm shadow-inner">
                                                                {info.icon}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-bold text-white tracking-tight">{info.name}</h4>
                                                                <span className="text-[9px] text-zinc-500 font-medium">{info.title} &bull; {info.role}</span>
                                                            </div>
                                                        </div>

                                                        {/* Dynamic Stance / Vote badges */}
                                                        {hasSpoken && (
                                                            selectedMeeting.status === "completed" && activeTab === "votes" && state.vote ? (
                                                                <span className={`text-[8px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                                                                    state.vote === "Approve" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                                                    state.vote === "Approve with Caution" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                                                                    "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                                                }`}>
                                                                    Vote: {state.vote}
                                                                </span>
                                                            ) : state.stance ? (
                                                                <span className={`text-[8px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                                                                    state.stance === "supportive" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                                                    state.stance === "skeptical" ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                                                                    "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                                                }`}>
                                                                    {state.stance}
                                                                </span>
                                                            ) : null
                                                        )}
                                                    </div>

                                                    {/* Statement or Rationale text */}
                                                    <div className="text-[11px] text-zinc-400 leading-relaxed font-sans mt-2 line-clamp-4 relative select-text">
                                                        {isSpeaking && (
                                                            <div className="absolute inset-0 bg-[#09090b]/80 backdrop-blur-xs flex items-center justify-center rounded-lg">
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                                                    <span className="text-[9px] font-bold text-purple-400 uppercase tracking-widest animate-pulse">Formulating Argument...</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        
                                                        {selectedMeeting.status === "completed" && activeTab === "votes" ? (
                                                            state?.rationale ? (
                                                                <span>&ldquo;{state.rationale}&rdquo;</span>
                                                            ) : (
                                                                <span className="italic text-zinc-600">No vote registered.</span>
                                                            )
                                                        ) : (
                                                            state?.statement ? (
                                                                <span>&ldquo;{state.statement}&rdquo;</span>
                                                            ) : (
                                                                <span className="italic text-zinc-700">Waiting for discussion round...</span>
                                                            )
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Weighted confidence rating */}
                                                {selectedMeeting.status === "completed" && activeTab === "votes" && state?.confidence && (
                                                    <div className="flex items-center justify-between border-t border-zinc-900/60 pt-2.5 text-[9px] font-semibold text-zinc-500">
                                                        <span>Confidence Margin</span>
                                                        <span className="text-zinc-400 font-mono">{(state.confidence * 100).toFixed(0)}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Adjourned Details: Executive Summary & Actions */}
                            {selectedMeeting.status === "completed" && selectedMeeting.summary && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-zinc-900 mt-8">
                                    {/* Summary Card */}
                                    <div className="md:col-span-2 p-6 rounded-2xl bg-zinc-950/40 border border-zinc-900 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">📜</span>
                                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Executive Board Resolution Summary</h3>
                                        </div>
                                        <p className="text-xs text-zinc-300 leading-relaxed font-sans select-text">
                                            {selectedMeeting.summary}
                                        </p>
                                    </div>

                                    {/* Action Items Card */}
                                    <div className="p-6 rounded-2xl bg-zinc-950/40 border border-zinc-900 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">✅</span>
                                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Action Checklist</h3>
                                        </div>
                                        <div className="space-y-3">
                                            {selectedMeeting.action_items && selectedMeeting.action_items.length > 0 ? (
                                                selectedMeeting.action_items.map((item, idx) => (
                                                    <div key={idx} className="flex gap-2.5 items-start text-xs select-text">
                                                        <input 
                                                            type="checkbox" 
                                                            className="mt-0.5 rounded border-zinc-800 bg-zinc-950 text-purple-600 focus:ring-purple-500" 
                                                            defaultChecked={idx < 1} 
                                                        />
                                                        <span className="text-zinc-400 leading-relaxed font-medium">{item}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-zinc-650 italic leading-relaxed">No action items defined by the board.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

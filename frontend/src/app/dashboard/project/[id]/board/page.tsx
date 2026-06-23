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

    // Scroll log console to bottom when new logs stream in
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [terminalLogs]);

    async function loadProject() {
        try {
            const data = await api.get<Project>(`/projects/${projectId}`);
            setProject(data);
        } catch (err) {
            console.error("Failed to load project:", err);
            router.push("/dashboard");
        }
    }

    async function loadMeetings() {
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
    }

    // Load initial project details and meeting history
    useEffect(() => {
        if (projectId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            loadProject();
            loadMeetings();
        }
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    async function loadMeetingDetails(meetingId: string) {
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
    }

    function handleSelectMeeting(meeting: BoardMeeting) {
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
    }

    function getWsUrl(meetingId: string) {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
        const wsBase = baseUrl.replace(/^http/, "ws");
        return `${wsBase}/board/meetings/${meetingId}/stream`;
    }

    function connectWebSocket(meetingId: string) {
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

    async function handleStartMeeting(e?: React.FormEvent) {
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
        } catch (err) {
            const error = err as Error;
            alert(error.message || "Failed to initialize board meeting.");
        } finally {
            setSubmitting(false);
        }
    }

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

    return (
        <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800 bg-grid-pattern font-sans select-none relative">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-pink-500/3 rounded-full blur-[150px] pointer-events-none" />

            {/* Header */}
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md px-8 py-4 flex items-center justify-between sticky top-0 z-45">
                <div className="flex items-center gap-4">
                    <Link href={`/dashboard/project/${projectId}`} className="text-slate-500 hover:text-slate-950 transition-all text-xs flex items-center gap-2 group font-semibold">
                        <span className="transform group-hover:-translate-x-1 transition-transform">&larr;</span> Back to Workspace
                    </Link>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                        <h1 className="text-sm font-bold text-slate-900 tracking-tight">{project?.name} Boardroom</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href={`/dashboard/project/${projectId}/copilot`}
                        className="bg-white border border-slate-200 hover:border-indigo-500/30 hover:bg-slate-50 hover:text-indigo-650 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                    >
                        <span>🤖</span> AI Founder Copilot
                    </Link>
                    <Link
                        href={`/dashboard/project/${projectId}/reports`}
                        className="bg-white border border-slate-200 hover:border-indigo-500/30 hover:bg-slate-50 hover:text-indigo-650 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                    >
                        <span>📄</span> Evaluation Reports
                    </Link>
                </div>
            </header>

            {/* Workspace Split */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Left Panel: History & Board Setup */}
                <div className="w-full lg:w-[320px] xl:w-[350px] sidebar-gradient p-6 overflow-y-auto space-y-6 flex flex-col justify-between border-r border-slate-200">
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Board Decisions</h2>
                            
                            {/* Start Board Meeting Card */}
                            {!isMeetingActive ? (
                                <form onSubmit={handleStartMeeting} className="space-y-4">
                                    <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-sm">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Initiate a Board Resolution</label>
                                        <textarea
                                            value={newTopic}
                                            onChange={(e) => setNewTopic(e.target.value)}
                                            placeholder="Enter debate topic (e.g. Raise Seed Round? Pivot pricing model?)"
                                            rows={3}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-450 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none leading-relaxed font-medium"
                                        />
                                        
                                        {/* Presets Chips */}
                                        <div className="space-y-1.5">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Quick Topics</span>
                                            <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                                                {TOPIC_PRESETS.map((preset, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setNewTopic(preset)}
                                                        className="text-[9px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg transition-all text-left truncate max-w-full font-medium"
                                                    >
                                                        {preset}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={submitting || !newTopic.trim()}
                                            className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-sm disabled:opacity-50 uppercase tracking-wider text-[10px]"
                                        >
                                            {submitting ? "Convening Board..." : "🎙️ Start Board Meeting"}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="p-4 bg-indigo-50 border border-indigo-150 rounded-2xl space-y-3 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl animate-pulse" />
                                    <div className="flex items-center gap-2">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                        </span>
                                        <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Meeting Active</span>
                                    </div>
                                    <p className="text-xs text-indigo-950 font-bold leading-relaxed line-clamp-3">
                                        {activeMeeting.topic}
                                    </p>
                                    <div className="text-[9px] text-slate-500 bg-white px-2 py-1.5 rounded-lg border border-slate-200 select-text font-medium">
                                        Meeting ID: {activeMeeting.id.slice(0, 8)}...
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Meeting History List */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolution Archives</h3>
                            {loading ? (
                                <div className="space-y-2">
                                    <div className="h-12 bg-slate-100 animate-pulse rounded-xl" />
                                    <div className="h-12 bg-slate-100 animate-pulse rounded-xl" />
                                </div>
                            ) : meetings.length === 0 ? (
                                <p className="text-[10px] text-slate-450 italic text-center py-4">No meetings archived.</p>
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
                                                        ? "bg-indigo-50 border-indigo-200 shadow-inner" 
                                                        : "bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50/50"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold border uppercase tracking-wider ${
                                                        m.status === "completed" ? "bg-emerald-50 border-emerald-150 text-emerald-800" :
                                                        m.status === "failed" ? "bg-red-50 border-red-150 text-red-800" :
                                                        "bg-indigo-50 border-indigo-150 text-indigo-700 animate-pulse"
                                                    }`}>
                                                        {m.status}
                                                    </span>
                                                    <span className="text-[8px] text-slate-400 font-mono font-medium">
                                                        {new Date(m.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className={`font-semibold tracking-tight leading-relaxed truncate-3 ${
                                                    isSelected ? "text-indigo-950 font-bold" : "text-slate-600"
                                                }`}>
                                                    {m.topic}
                                                </p>
                                                {m.final_decision && (
                                                    <div className="flex items-center justify-between mt-1 text-[9px] font-semibold text-slate-500 border-t border-slate-100 pt-1">
                                                        <span>Verdict: {m.final_decision}</span>
                                                        <span className="text-slate-400 font-medium">Conf: {(m.confidence_score * 100).toFixed(0)}%</span>
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
                    <div className="border border-slate-800 bg-slate-900 rounded-2xl overflow-hidden shadow-md mt-4">
                        <div className="bg-slate-850 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-rose-500/60" />
                                <div className="w-2 h-2 rounded-full bg-amber-500/60" />
                                <div className="w-2 h-2 rounded-full bg-emerald-500/60" />
                            </div>
                            <span className="text-[9px] font-mono text-slate-400 tracking-wider">board_comm_telemetry</span>
                        </div>
                        <div className="p-4 h-44 overflow-y-auto text-[10px] font-mono text-slate-350 space-y-2 select-text scrollbar-thin">
                            {terminalLogs.length > 0 ? (
                                terminalLogs.map((log, idx) => (
                                    <div key={idx} className="flex gap-2 items-start border-l border-slate-800 pl-2 leading-relaxed">
                                        <span className="text-slate-650 select-none">&gt;</span>
                                        <span className={
                                            log.includes("[System ERROR]") ? "text-red-400" :
                                            log.includes("[System]") ? "text-slate-400" :
                                            log.includes("(SUPPORTIVE stance)") ? "text-emerald-400" :
                                            log.includes("(SKEPTICAL stance)") ? "text-rose-400" :
                                            "text-slate-300"
                                        }>{log}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-550 italic text-center py-12">Waiting for boardroom trigger...</p>
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>

                {/* Right Panel: Main Boardroom Workspace */}
                <div className="flex-1 p-8 overflow-y-auto bg-grid-pattern relative flex flex-col">
                    {!selectedMeeting ? (
                        /* Showcase Banner */
                        <div className="max-w-xl mx-auto w-full text-center space-y-8 py-20 my-auto">
                            <div className="relative inline-flex items-center justify-center">
                                <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-2xl animate-pulse" />
                                <div className="w-24 h-24 rounded-3xl bg-white border border-slate-200 flex items-center justify-center text-5xl shadow-md relative z-10">
                                    💼
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">AI Virtual Board of Directors</h3>
                                <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
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
                            <div className="p-6 bg-white border border-slate-200 rounded-2xl flex flex-col md:flex-row gap-6 justify-between items-start md:items-center shadow-sm">
                                <div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider ${
                                            selectedMeeting.status === "completed" ? "bg-emerald-50 border-emerald-150 text-emerald-800" :
                                            selectedMeeting.status === "failed" ? "bg-red-50 border-red-150 text-red-800" :
                                            "bg-indigo-50 border-indigo-150 text-indigo-700 animate-pulse"
                                        }`}>
                                            {selectedMeeting.status}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono font-medium">
                                            Convened: {new Date(selectedMeeting.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight leading-relaxed">
                                        {selectedMeeting.topic}
                                    </h2>
                                </div>

                                {/* Consensus Gauge Metrics if Completed */}
                                {selectedMeeting.status === "completed" && (
                                    <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
                                        {/* Consensus Verdict Indicator */}
                                        <div className="text-center md:text-left space-y-1">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Consensus Verdict</span>
                                            <span className={`text-base font-black tracking-tight ${
                                                selectedMeeting.final_decision === "Approved" ? "text-emerald-650" :
                                                selectedMeeting.final_decision === "Approved with Caution" ? "text-amber-600" :
                                                "text-rose-600"
                                            }`}>
                                                {selectedMeeting.final_decision}
                                            </span>
                                        </div>

                                        {/* Custom Circular SVG Confidence Gauge */}
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-12 h-12 flex items-center justify-center">
                                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                                    <circle cx="18" cy="18" r="16" fill="transparent" stroke="#f1f5f9" strokeWidth="2.5" />
                                                    <circle 
                                                        cx="18" 
                                                        cy="18" 
                                                        r="16" 
                                                        fill="transparent" 
                                                        stroke={
                                                            selectedMeeting.final_decision === "Approved" ? "#059669" :
                                                            selectedMeeting.final_decision === "Approved with Caution" ? "#d97706" :
                                                            "#e11d48"
                                                        } 
                                                        strokeWidth="2.5" 
                                                        strokeDasharray={`${selectedMeeting.confidence_score * 100}, 100`} 
                                                    />
                                                </svg>
                                                <span className="absolute text-[10px] font-black font-mono text-slate-900">
                                                    {(selectedMeeting.confidence_score * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="space-y-0.5">
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Confidence</span>
                                                <span className="text-[10px] text-slate-500 font-mono font-medium">Weighted Ratio</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Main Boardroom Area */}
                            <div className="flex-1 space-y-6">
                                {/* Navigation tabs for Completed meeting details */}
                                {selectedMeeting.status === "completed" && (
                                    <div className="flex border-b border-slate-200 gap-4">
                                        <button
                                            onClick={() => setActiveTab("debate")}
                                            className={`pb-2 text-xs font-bold transition-all relative ${
                                                activeTab === "debate" ? "text-indigo-650 font-black border-b-2 border-indigo-600" : "text-slate-500 hover:text-slate-800"
                                            }`}
                                        >
                                            Debate Statements
                                        </button>
                                        <button
                                            onClick={() => setActiveTab("votes")}
                                            className={`pb-2 text-xs font-bold transition-all relative ${
                                                activeTab === "votes" ? "text-indigo-650 font-black border-b-2 border-indigo-600" : "text-slate-500 hover:text-slate-800"
                                            }`}
                                        >
                                            Final Advisor Votes
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
                                                        ? "bg-indigo-50/40 border-indigo-500 shadow-md scale-[1.02] ring-1 ring-indigo-500/10" 
                                                        : hasSpoken 
                                                            ? "bg-white border-slate-200 shadow-sm" 
                                                            : "bg-slate-100/50 border-slate-200 opacity-40"
                                                }`}
                                            >
                                                {/* Header info */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-3.5">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center text-sm shadow-sm">
                                                                {info.icon}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-900 tracking-tight">{info.name}</h4>
                                                                <span className="text-[9px] text-slate-500 font-medium">{info.title} &bull; {info.role}</span>
                                                            </div>
                                                        </div>

                                                        {/* Dynamic Stance / Vote badges */}
                                                        {hasSpoken && (
                                                            selectedMeeting.status === "completed" && activeTab === "votes" && state.vote ? (
                                                                <span className={`text-[8px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                                                                    state.vote === "Approve" ? "bg-emerald-55 border-emerald-150 text-emerald-800" :
                                                                    state.vote === "Approve with Caution" ? "bg-amber-50 border-amber-150 text-amber-800" :
                                                                    "bg-rose-50 border-rose-150 text-rose-800"
                                                                }`}>
                                                                    Vote: {state.vote}
                                                                </span>
                                                            ) : state.stance ? (
                                                                <span className={`text-[8px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                                                                    state.stance === "supportive" ? "bg-emerald-50 border-emerald-150 text-emerald-800" :
                                                                    state.stance === "skeptical" ? "bg-rose-50 border-rose-150 text-rose-800" :
                                                                    "bg-amber-50 border-amber-150 text-amber-800"
                                                                }`}>
                                                                    {state.stance}
                                                                </span>
                                                            ) : null
                                                        )}
                                                    </div>

                                                    {/* Statement or Rationale text */}
                                                    <div className="text-[11px] text-slate-650 leading-relaxed font-sans mt-2 line-clamp-4 relative select-text">
                                                        {isSpeaking && (
                                                            <div className="absolute inset-0 bg-white/85 backdrop-blur-xs flex items-center justify-center rounded-lg">
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                                                    <span className="text-[9px] font-bold text-indigo-650 uppercase tracking-wider animate-pulse">Formulating Argument...</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        
                                                        {selectedMeeting.status === "completed" && activeTab === "votes" ? (
                                                            state?.rationale ? (
                                                                <span>&ldquo;{state.rationale}&rdquo;</span>
                                                            ) : (
                                                                <span className="italic text-slate-400">No vote registered.</span>
                                                            )
                                                        ) : (
                                                            state?.statement ? (
                                                                <span>&ldquo;{state.statement}&rdquo;</span>
                                                            ) : (
                                                                <span className="italic text-slate-400 font-medium">Waiting for discussion round...</span>
                                                            )
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Weighted confidence rating */}
                                                {selectedMeeting.status === "completed" && activeTab === "votes" && state?.confidence && (
                                                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-[9px] font-semibold text-slate-500">
                                                        <span>Confidence Margin</span>
                                                        <span className="text-slate-700 font-mono">{(state.confidence * 100).toFixed(0)}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Adjourned Details: Executive Summary & Actions */}
                            {selectedMeeting.status === "completed" && selectedMeeting.summary && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200 mt-8">
                                    {/* Summary Card */}
                                    <div className="md:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">📜</span>
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Executive Board Resolution Summary</h3>
                                        </div>
                                        <p className="text-xs text-slate-700 leading-relaxed font-sans select-text">
                                            {selectedMeeting.summary}
                                        </p>
                                    </div>

                                    {/* Action Items Card */}
                                    <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">✅</span>
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Action Checklist</h3>
                                        </div>
                                        <div className="space-y-3">
                                            {selectedMeeting.action_items && selectedMeeting.action_items.length > 0 ? (
                                                selectedMeeting.action_items.map((item, idx) => (
                                                    <div key={idx} className="flex gap-2.5 items-start text-xs select-text">
                                                        <input 
                                                            type="checkbox" 
                                                            className="mt-0.5 rounded border-slate-200 bg-white text-indigo-600 focus:ring-indigo-500" 
                                                            defaultChecked={idx < 1} 
                                                        />
                                                        <span className="text-slate-600 leading-relaxed font-medium">{item}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-slate-400 italic leading-relaxed">No action items defined by the board.</p>
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

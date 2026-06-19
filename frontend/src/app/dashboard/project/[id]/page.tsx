"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";

interface Project {
    id: string;
    name: string;
    description: string;
}

interface WorkflowRun {
    id: string;
    status: "pending" | "running" | "waiting_approval" | "completed" | "failed";
    current_step: string;
    state_snapshot: Record<string, any>;
    logs: { steps: string[] };
    created_at?: string;
    updated_at?: string;
}

const STEPS = [
    "Idea Analyzer",
    "Market Research",
    "Competitor Intelligence",
    "Technical Architect",
    "MVP Planner",
    "Financial Planning",
    "Marketing Strategy",
    "Risk Analysis",
    "Pitch Deck",
    "Moderator",
    "Evaluation"
];

export default function ProjectWorkspace() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const [project, setProject] = useState<Project | null>(null);
    const [activeRun, setActiveRun] = useState<WorkflowRun | null>(null);
    const [loading, setLoading] = useState(true);
    const [submittingApproval, setSubmittingApproval] = useState(false);

    // Checkpoint Forms State
    const [feedback, setFeedback] = useState("");
    // Tech Architect fields
    const [editTechStack, setEditTechStack] = useState("");
    const [editArchitecture, setEditArchitecture] = useState("");
    const [editInfraCosts, setEditInfraCosts] = useState("");
    // MVP Planner fields
    const [editBacklog, setEditBacklog] = useState("");

    useEffect(() => {
        loadProject();
        loadActiveRun();
        
        // Setup polling
        const interval = setInterval(loadActiveRun, 4000);
        return () => clearInterval(interval);
    }, [id]);

    const loadProject = async () => {
        try {
            const data = await api.get<Project>(`/projects/${id}`);
            setProject(data);
        } catch (err) {
            router.push("/dashboard");
        } finally {
            setLoading(false);
        }
    };

    const loadActiveRun = async () => {
        try {
            const runs = await api.get<WorkflowRun[]>(`/projects/${id}/runs`);
            if (runs.length > 0) {
                const latest = runs[0];
                if (["pending", "running", "waiting_approval"].includes(latest.status)) {
                    setActiveRun(latest);
                    // Prepopulate form editors
                    if (latest.status === "waiting_approval") {
                        const snap = latest.state_snapshot || {};
                        if (latest.current_step === "Technical Architect") {
                            setEditTechStack(snap.tech_stack || "");
                            setEditArchitecture(snap.architecture || "");
                            setEditInfraCosts(snap.infra_costs || "");
                        } else if (latest.current_step === "MVP Planner") {
                            const backlogArr = snap.priority_backlog || [];
                            setEditBacklog(backlogArr.join("\n"));
                        }
                    }
                } else {
                    setActiveRun(latest); // Set completed/failed run if that's the latest
                }
            }
        } catch (err) {
            // Keep previous
        }
    };

    const handleTriggerRun = async () => {
        try {
            const run = await api.post<WorkflowRun>(`/projects/${id}/analyze`);
            setActiveRun(run);
        } catch (err: any) {
            alert(err.message || "Failed to trigger analysis.");
        }
    };

    const handleApprove = async () => {
        if (!activeRun) return;
        setSubmittingApproval(true);
        try {
            const updates: Record<string, any> = {};
            if (activeRun.current_step === "Technical Architect") {
                updates.tech_stack = editTechStack;
                updates.architecture = editArchitecture;
                updates.infra_costs = editInfraCosts;
            } else if (activeRun.current_step === "MVP Planner") {
                updates.priority_backlog = editBacklog.split("\n").filter(Boolean);
            }

            await api.post(`/projects/runs/${activeRun.id}/approve`, {
                feedback: feedback,
                state_updates: updates
            });

            setFeedback("");
            loadActiveRun();
        } catch (err) {
            alert("Failed to submit approval.");
        } finally {
            setSubmittingApproval(false);
        }
    };

    if (!mounted) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400 text-sm font-sans tracking-wide">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <span>Initializing project workspace...</span>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400 text-sm font-sans tracking-wide">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <span>Initializing project workspace...</span>
                </div>
            </div>
        );
    }

    // Determine step status helper
    const getStepStatus = (stepName: string) => {
        if (!activeRun) return "waiting";
        if (activeRun.status === "completed") return "completed";
        if (activeRun.status === "failed") return "failed";
        
        const currentIdx = STEPS.indexOf(activeRun.current_step);
        const stepIdx = STEPS.indexOf(stepName);

        if (stepIdx < currentIdx) return "completed";
        if (stepIdx === currentIdx) {
            return activeRun.status === "waiting_approval" ? "checkpoint" : "running";
        }
        return "waiting";
    };

    const getStepSubText = (stepName: string, status: string) => {
        switch (status) {
            case "completed": return "Analyzed & saved";
            case "running": return "Deep research active...";
            case "checkpoint": return "Awaiting input";
            case "failed": return "Process failed";
            default: return "Queued";
        }
    };

    const formatLogMessage = (msg: string) => {
        if (msg.includes("[Deep Research]")) {
            const parts = msg.split("[Deep Research]");
            return (
                <span>
                    <span className="bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 text-[9px] px-1.5 py-0.5 rounded-md mr-2 font-bold select-none">Deep Research</span>
                    <span className="text-zinc-300">{parts[1]}</span>
                </span>
            );
        }
        if (msg.includes("[Analyze]")) {
            const parts = msg.split("[Analyze]");
            return (
                <span>
                    <span className="bg-cyan-500/15 border border-cyan-500/20 text-cyan-400 text-[9px] px-1.5 py-0.5 rounded-md mr-2 font-bold select-none">Analyze</span>
                    <span className="text-zinc-300">{parts[1]}</span>
                </span>
            );
        }
        if (msg.includes("[Assemble]")) {
            const parts = msg.split("[Assemble]");
            return (
                <span>
                    <span className="bg-pink-500/15 border border-pink-500/20 text-pink-400 text-[9px] px-1.5 py-0.5 rounded-md mr-2 font-bold select-none">Assemble</span>
                    <span className="text-zinc-300">{parts[1]}</span>
                </span>
            );
        }
        if (msg.includes("[Evaluate]")) {
            const parts = msg.split("[Evaluate]");
            return (
                <span>
                    <span className="bg-purple-500/15 border border-purple-500/20 text-purple-400 text-[9px] px-1.5 py-0.5 rounded-md mr-2 font-bold select-none">Evaluate</span>
                    <span className="text-zinc-300">{parts[1]}</span>
                </span>
            );
        }
        return <span className="text-zinc-400">{msg}</span>;
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100 font-sans select-none relative">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-pink-900/5 rounded-full blur-[150px] pointer-events-none" />

            {/* Top Bar Nav */}
            <header className="border-b border-zinc-900 bg-zinc-950/70 backdrop-blur-md px-8 py-4 flex items-center justify-between sticky top-0 z-45">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-all text-xs flex items-center gap-2 group">
                        <span className="transform group-hover:-translate-x-1 transition-transform">&larr;</span> Back to Projects
                    </Link>
                    <span className="text-zinc-800">|</span>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                        <h1 className="text-sm font-bold text-white tracking-tight">{project?.name} Workspace</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href={`/dashboard/project/${id}/copilot`}
                        className="bg-zinc-900 border border-zinc-800 hover:border-purple-500/30 hover:bg-zinc-850 hover:text-purple-400 text-zinc-300 text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5"
                    >
                        <span>🤖</span> AI Founder Copilot
                    </Link>
                    <Link
                        href={`/dashboard/project/${id}/board`}
                        className="bg-zinc-900 border border-zinc-800 hover:border-purple-500/30 hover:bg-zinc-850 hover:text-purple-400 text-zinc-300 text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5"
                    >
                        <span>💼</span> AI Boardroom
                    </Link>
                    {(!activeRun || ["completed", "failed"].includes(activeRun.status)) && (
                        <button
                            onClick={handleTriggerRun}
                            className="relative group overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                        >
                            <span className="relative z-10 flex items-center gap-1.5">
                                <span className="animate-bounce">⚡</span> Start Deep Validation Run
                            </span>
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </button>
                    )}
                </div>
            </header>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* Left Side: Agent Execution Sequence Logs */}
                <div className="w-full md:w-[320px] lg:w-[360px] border-r border-zinc-900 bg-zinc-950/40 backdrop-blur-sm p-6 overflow-y-auto space-y-6 flex flex-col justify-between sidebar-gradient">
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Validation Pipeline</h2>
                            {activeRun && (
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold border ${
                                    activeRun.status === "running" ? "bg-purple-500/10 border-purple-500/20 text-purple-400 animate-pulse" :
                                    activeRun.status === "waiting_approval" ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" :
                                    activeRun.status === "completed" ? "bg-green-500/10 border-green-500/20 text-green-400" :
                                    "bg-zinc-800 border-zinc-700 text-zinc-400"
                                }`}>
                                    {activeRun.status.toUpperCase().replace("_", " ")}
                                </span>
                            )}
                        </div>
                        
                        {/* Interactive Connector Timeline */}
                        <div className="relative pl-6 border-l border-zinc-800/80 space-y-6">
                            {STEPS.map((step, idx) => {
                                const status = getStepStatus(step);
                                const isActive = activeRun?.current_step === step;
                                return (
                                    <div key={idx} className={`relative transition-all duration-300 ${isActive ? "scale-[1.02]" : ""}`}>
                                        {/* Absolute Connector Indicator */}
                                        <div className="absolute -left-[36px] w-6 h-6 flex items-center justify-center z-10">
                                            {status === "completed" && (
                                                <div className="w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-zinc-950 font-bold shadow-md shadow-emerald-500/20 border border-emerald-400/30">
                                                    ✓
                                                </div>
                                            )}
                                            {status === "running" && (
                                                <div className="w-5 h-5 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/40 relative">
                                                    <span className="absolute inset-0 rounded-full bg-purple-500/30 animate-ping opacity-75" />
                                                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                                                </div>
                                            )}
                                            {status === "checkpoint" && (
                                                <div className="w-5 h-5 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/40 relative">
                                                    <span className="absolute inset-0 rounded-full bg-yellow-500/30 animate-pulse" />
                                                    <span className="text-yellow-500 text-[10px] font-black">!</span>
                                                </div>
                                            )}
                                            {status === "waiting" && (
                                                <div className="w-3.5 h-3.5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                                                </div>
                                            )}
                                        </div>

                                        <div className={`p-2 py-1.5 rounded-xl transition-all duration-250 ${
                                            isActive ? "bg-purple-950/20 border border-purple-900/40 shadow-inner" : "border border-transparent"
                                        }`}>
                                            <p className={`text-xs font-semibold tracking-wide ${
                                                status === "running" ? "text-purple-400 font-bold animate-pulse" :
                                                status === "checkpoint" ? "text-yellow-400 font-bold" :
                                                status === "completed" ? "text-zinc-300" : "text-zinc-500"
                                            }`}>
                                                {step}
                                            </p>
                                            <p className="text-[9px] text-zinc-650 mt-0.5">
                                                {getStepSubText(step, status)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Console HUD Log Panel */}
                    <div className="border border-zinc-800/60 bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl mt-4">
                        <div className="bg-zinc-900/60 border-b border-zinc-850 px-4 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-rose-500/80" />
                                <div className="w-2 h-2 rounded-full bg-amber-500/80" />
                                <div className="w-2 h-2 rounded-full bg-emerald-500/80" />
                            </div>
                            <span className="text-[9px] font-mono text-zinc-500 tracking-wider">research_agent_terminal</span>
                        </div>
                        <div className="p-4 h-40 overflow-y-auto text-[10px] font-mono text-zinc-400 space-y-2 select-text scrollbar-thin">
                            {activeRun?.logs?.steps?.map((log, idx) => (
                                <div key={idx} className="flex gap-2 items-start border-l border-zinc-850 pl-2 py-0.5 leading-relaxed">
                                    <span className="text-zinc-600 select-none" suppressHydrationWarning>
                                        [{new Date(activeRun.created_at || new Date()).toLocaleTimeString()}]
                                    </span>
                                    {formatLogMessage(log)}
                                </div>
                            )) || <p className="text-zinc-600 italic text-center py-10">Waiting for validation run to begin...</p>}
                        </div>
                    </div>
                </div>

                {/* Right Side: Main Validation View & HITL editor */}
                <div className="flex-1 p-8 overflow-y-auto bg-grid-pattern relative flex flex-col justify-center">
                    {!activeRun ? (
                        /* Idle Showcase View */
                        <div className="max-w-xl mx-auto w-full text-center space-y-8 py-10">
                            <div className="relative inline-flex items-center justify-center">
                                <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl animate-pulse" />
                                <div className="w-20 h-20 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-4xl shadow-2xl relative z-10">
                                    🤖
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black text-white tracking-tight">AI Co-Founder Workspace</h3>
                                <p className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
                                    Ready to run deep, multi-agent validation. The pipeline crawls the web to build investor-ready analyses of target markets, competitors, and technical blueprints.
                                </p>
                            </div>

                            {/* Visual Agent Pipeline Map */}
                            <div className="p-6 bg-zinc-950/40 border border-zinc-900 rounded-2xl glass-card text-left space-y-4">
                                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block">Agent Execution Flow</span>
                                <div className="grid grid-cols-3 gap-3 text-[10px] text-zinc-400 font-mono">
                                    <div className="p-2 border border-zinc-850/50 bg-zinc-900/20 rounded-lg flex items-center gap-1.5">
                                        <span className="text-emerald-500">1.</span> Idea Classification
                                    </div>
                                    <div className="p-2 border border-zinc-850/50 bg-zinc-900/20 rounded-lg flex items-center gap-1.5">
                                        <span className="text-emerald-500">2.</span> Live Web Search
                                    </div>
                                    <div className="p-2 border border-zinc-850/50 bg-zinc-900/20 rounded-lg flex items-center gap-1.5">
                                        <span className="text-emerald-500">3.</span> Price Matrix
                                    </div>
                                    <div className="p-2 border border-zinc-850/50 bg-zinc-900/20 rounded-lg flex items-center gap-1.5 col-span-2">
                                        <span className="text-purple-400">4.</span> Technical blueprint & INR costs
                                    </div>
                                    <div className="p-2 border border-zinc-850/50 bg-zinc-900/20 rounded-lg flex items-center gap-1.5">
                                        <span className="text-purple-400">5.</span> MVP backlog
                                    </div>
                                    <div className="p-2 border border-zinc-850/50 bg-zinc-900/20 rounded-lg flex items-center gap-1.5">
                                        <span className="text-pink-400">6.</span> Financial Forecast
                                    </div>
                                    <div className="p-2 border border-zinc-850/50 bg-zinc-900/20 rounded-lg flex items-center gap-1.5">
                                        <span className="text-pink-400">7.</span> Marketing loops
                                    </div>
                                    <div className="p-2 border border-zinc-850/50 bg-zinc-900/20 rounded-lg flex items-center gap-1.5">
                                        <span className="text-rose-500">8.</span> Risk mitigation
                                    </div>
                                    <div className="p-2 border border-zinc-850/50 bg-zinc-900/20 rounded-lg flex items-center gap-1.5 col-span-3 text-center bg-purple-950/10 border-purple-900/20 text-purple-300">
                                        🚀 Final VC Pitch Outline & Auditor Evaluation
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleTriggerRun}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 text-sm"
                            >
                                Start Analysis Sequence
                            </button>
                        </div>
                    ) : activeRun.status === "completed" ? (
                        /* Complete View */
                        <div className="max-w-md mx-auto w-full text-center space-y-6 py-10">
                            <div className="relative inline-flex items-center justify-center">
                                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
                                <div className="w-20 h-20 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-4xl shadow-2xl relative z-10">
                                    🎉
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-white tracking-tight">Validation Complete</h3>
                                <p className="text-zinc-400 text-sm leading-relaxed">
                                    Multi-agent analyses completed successfully. Your custom startup dashboard, product specifications, and pitch decks are ready.
                                </p>
                            </div>
                            <Link
                                href={`/dashboard/project/${id}/reports`}
                                className="inline-block w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold py-3.5 rounded-xl shadow-lg transition-transform hover:scale-[1.01] text-sm text-center"
                            >
                                Open Reports & Projections
                            </Link>
                        </div>
                    ) : activeRun.status === "waiting_approval" ? (
                        /* Checkpoint Editor View */
                        <div className="space-y-6 max-w-3xl mx-auto w-full pb-10">
                            <div className="p-6 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex items-center justify-between shadow-lg backdrop-blur-sm">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                                        <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest">Human Approval Checkpoint</h3>
                                    </div>
                                    <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
                                        The AI has gathered deep research checkpoints. You can modify these values or add qualitative instructions to direct the next research node.
                                    </p>
                                </div>
                                <span className="text-[10px] bg-yellow-500/10 border border-yellow-500/25 text-yellow-500 px-3 py-1.5 rounded-xl font-bold font-mono">
                                    NODE: {activeRun.current_step.toUpperCase()}
                                </span>
                            </div>

                            {/* Forms based on Active Step */}
                            <div className="glass-panel p-8 rounded-2xl border border-zinc-800/80 shadow-2xl space-y-6">
                                {activeRun.current_step === "Technical Architect" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="col-span-2 p-4 bg-zinc-900/20 border border-zinc-850 rounded-xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-lg">🏗️</span>
                                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">System Architecture Summary</label>
                                            </div>
                                            <textarea
                                                rows={4}
                                                value={editArchitecture}
                                                onChange={(e) => setEditArchitecture(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 font-sans leading-relaxed resize-y"
                                                placeholder="Describe system design..."
                                            />
                                        </div>
                                        <div className="p-4 bg-zinc-900/20 border border-zinc-850 rounded-xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-lg">🚀</span>
                                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Recommended Tech Stack</label>
                                            </div>
                                            <textarea
                                                rows={2}
                                                value={editTechStack}
                                                onChange={(e) => setEditTechStack(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 font-mono resize-y"
                                                placeholder="Next.js, Python, PostgreSQL..."
                                            />
                                        </div>
                                        <div className="p-4 bg-zinc-900/20 border border-zinc-850 rounded-xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-lg">💰</span>
                                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Starting Infra Costs (INR/mo)</label>
                                            </div>
                                            <input
                                                type="text"
                                                value={editInfraCosts}
                                                onChange={(e) => setEditInfraCosts(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 font-semibold"
                                                placeholder="e.g. ₹8,000 / month"
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeRun.current_step === "MVP Planner" && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-zinc-900/20 border border-zinc-850 rounded-xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-lg">📋</span>
                                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Prioritized Backlog List (New line separated)</label>
                                            </div>
                                            <textarea
                                                rows={8}
                                                value={editBacklog}
                                                onChange={(e) => setEditBacklog(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-purple-500 resize-y leading-relaxed"
                                                placeholder="Task 1&#10;Task 2&#10;Task 3..."
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="p-4 bg-zinc-900/20 border border-zinc-850 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">💬</span>
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Feedback to Agents (Optional)</label>
                                    </div>
                                    <textarea
                                        rows={2}
                                        placeholder="Add guidelines (e.g. 'Target regional users first', 'Use AWS instead of GCP', 'Include dynamic payments backlog'...)"
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 leading-relaxed resize-y"
                                    />
                                </div>

                                <button
                                    onClick={handleApprove}
                                    disabled={submittingApproval}
                                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 text-sm"
                                >
                                    {submittingApproval ? "Submitting Checkpoint..." : "✓ Approve & Continue Run"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* In Progress View */
                        <div className="max-w-md mx-auto w-full text-center space-y-6 py-10">
                            <div className="relative inline-flex items-center justify-center">
                                <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-2xl animate-pulse" />
                                <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-850 flex items-center justify-center shadow-xl relative z-10">
                                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-black text-white tracking-tight">Validation in Progress</h3>
                                <p className="text-purple-400 font-mono text-[10px] uppercase tracking-widest animate-pulse">
                                    Active Agent: {activeRun.current_step}
                                </p>
                                <p className="text-zinc-550 text-xs max-w-xs mx-auto leading-relaxed">
                                    Specialized agents are performing live queries, indexing competitor matrices, and predicting cash flows. Check the telemetry console below for detailed steps.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

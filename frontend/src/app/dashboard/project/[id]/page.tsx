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
    state_snapshot: Record<string, unknown>;
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
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

    async function loadProject() {
        try {
            const data = await api.get<Project>(`/projects/${id}`);
            setProject(data);
        } catch {
            router.push("/dashboard");
        } finally {
            setLoading(false);
        }
    }

    async function loadActiveRun() {
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
                            setEditTechStack((snap.tech_stack as string) || "");
                            setEditArchitecture((snap.architecture as string) || "");
                            setEditInfraCosts((snap.infra_costs as string) || "");
                        } else if (latest.current_step === "MVP Planner") {
                            const backlogArr = (snap.priority_backlog as string[]) || [];
                            setEditBacklog(backlogArr.join("\n"));
                        }
                    }
                } else {
                    setActiveRun(latest); // Set completed/failed run if that's the latest
                }
            }
        } catch {
            // Keep previous
        }
    }

    async function handleTriggerRun() {
        try {
            const run = await api.post<WorkflowRun>(`/projects/${id}/analyze`);
            setActiveRun(run);
        } catch (err) {
            const error = err as Error;
            alert(error.message || "Failed to trigger analysis.");
        }
    }

    async function handleRetryRun() {
        if (!activeRun) return;
        try {
            await api.post(`/projects/runs/${activeRun.id}/retry`);
            loadActiveRun();
        } catch (err) {
            const error = err as Error;
            alert(error.message || "Failed to retry analysis.");
        }
    }

    async function handleApprove() {
        if (!activeRun) return;
        setSubmittingApproval(true);
        try {
            const updates: Record<string, string | string[]> = {};
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
        } catch {
            alert("Failed to submit approval.");
        } finally {
            setSubmittingApproval(false);
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadProject();
        loadActiveRun();
        
        // Setup polling
        const interval = setInterval(loadActiveRun, 4000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    if (!mounted) {
        return (
            <div className="min-h-screen bg-[#f8fafc] bg-grid-pattern flex items-center justify-center text-slate-500 text-sm font-sans tracking-wide">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-5 h-5 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin" />
                    <span>Initializing project workspace...</span>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafc] bg-grid-pattern flex items-center justify-center text-slate-500 text-sm font-sans tracking-wide">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-5 h-5 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin" />
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
        <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800 bg-grid-pattern font-sans select-none relative">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-pink-500/3 rounded-full blur-[150px] pointer-events-none" />

            {/* Top Bar Nav */}
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md px-8 py-4 flex items-center justify-between sticky top-0 z-45">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="text-slate-500 hover:text-slate-950 transition-all text-xs flex items-center gap-2 group font-semibold">
                        <span className="transform group-hover:-translate-x-1 transition-transform">&larr;</span> Back to Projects
                    </Link>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                        <h1 className="text-sm font-bold text-slate-900 tracking-tight">{project?.name} Workspace</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href={`/dashboard/project/${id}/copilot`}
                        className="bg-white border border-slate-200 hover:border-indigo-500/30 hover:bg-slate-50 hover:text-indigo-650 text-slate-700 text-xs font-bold px-4.5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                    >
                        <span>🤖</span> AI Founder Copilot
                    </Link>
                    <Link
                        href={`/dashboard/project/${id}/board`}
                        className="bg-white border border-slate-200 hover:border-indigo-500/30 hover:bg-slate-50 hover:text-indigo-650 text-slate-700 text-xs font-bold px-4.5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                    >
                        <span>💼</span> AI Boardroom
                    </Link>
                    {(!activeRun || ["completed", "failed"].includes(activeRun.status)) && (
                        <button
                            onClick={handleTriggerRun}
                            className="bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all uppercase tracking-wider text-[10px]"
                        >
                            <span className="flex items-center gap-1.5">
                                <span className="animate-bounce">⚡</span> Start Deep Validation Run
                            </span>
                        </button>
                    )}
                </div>
            </header>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* Left Side: Agent Execution Sequence Logs */}
                <div className="w-full md:w-[320px] lg:w-[360px] sidebar-gradient p-6 overflow-y-auto space-y-6 flex flex-col justify-between border-r border-slate-200">
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Validation Pipeline</h2>
                            {activeRun && (
                                <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider ${
                                    activeRun.status === "running" ? "bg-indigo-50 border-indigo-150 text-indigo-700 animate-pulse" :
                                    activeRun.status === "waiting_approval" ? "bg-yellow-50 border-yellow-150 text-yellow-800" :
                                    activeRun.status === "completed" ? "bg-green-50 border-green-150 text-green-800" :
                                    "bg-slate-100 border-slate-200 text-slate-500"
                                }`}>
                                    {activeRun.status.toUpperCase().replace("_", " ")}
                                </span>
                            )}
                        </div>
                        
                        {/* Interactive Connector Timeline */}
                        <div className="relative pl-6 border-l border-slate-200 space-y-6">
                            {STEPS.map((step, idx) => {
                                const status = getStepStatus(step);
                                const isActive = activeRun?.current_step === step;
                                return (
                                    <div key={idx} className={`relative transition-all duration-300 ${isActive ? "scale-[1.02]" : ""}`}>
                                        {/* Absolute Connector Indicator */}
                                        <div className="absolute -left-[36px] w-6 h-6 flex items-center justify-center z-10">
                                            {status === "completed" && (
                                                <div className="w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold shadow-md shadow-emerald-550/15 border border-emerald-400/30">
                                                    ✓
                                                </div>
                                            )}
                                            {status === "running" && (
                                                <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-400 relative">
                                                    <span className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping opacity-75" />
                                                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                                                </div>
                                            )}
                                            {status === "checkpoint" && (
                                                <div className="w-5 h-5 rounded-full bg-yellow-50 flex items-center justify-center border border-yellow-400 relative">
                                                    <span className="absolute inset-0 rounded-full bg-yellow-500/20 animate-pulse" />
                                                    <span className="text-yellow-600 text-[10px] font-black">!</span>
                                                </div>
                                            )}
                                            {status === "waiting" && (
                                                <div className="w-3.5 h-3.5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                </div>
                                            )}
                                        </div>

                                        <div className={`p-2 py-1.5 rounded-xl transition-all duration-250 ${
                                            isActive ? "bg-indigo-50 border border-indigo-100 shadow-inner" : "border border-transparent"
                                        }`}>
                                            <p className={`text-xs font-bold tracking-wide ${
                                                status === "running" ? "text-indigo-650 animate-pulse" :
                                                status === "checkpoint" ? "text-yellow-600" :
                                                status === "completed" ? "text-slate-800" : "text-slate-400"
                                            }`}>
                                                {step}
                                            </p>
                                            <p className="text-[9px] text-slate-500 mt-0.5 font-medium">
                                                {getStepSubText(step, status)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Console HUD Log Panel */}
                    <div className="border border-slate-800 bg-slate-900 rounded-2xl overflow-hidden shadow-md mt-4">
                        <div className="bg-slate-850 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-rose-500/80" />
                                <div className="w-2 h-2 rounded-full bg-amber-500/80" />
                                <div className="w-2 h-2 rounded-full bg-emerald-500/80" />
                            </div>
                            <span className="text-[9px] font-mono text-slate-400 tracking-wider">research_agent_terminal</span>
                        </div>
                        <div className="p-4 h-40 overflow-y-auto text-[10px] font-mono text-slate-350 space-y-2 select-text scrollbar-thin">
                            {activeRun?.logs?.steps?.map((log, idx) => (
                                <div key={idx} className="flex gap-2 items-start border-l border-slate-800 pl-2 py-0.5 leading-relaxed">
                                    <span className="text-slate-500 select-none" suppressHydrationWarning>
                                        [{new Date(activeRun.created_at || new Date()).toLocaleTimeString()}]
                                    </span>
                                    {formatLogMessage(log)}
                                </div>
                            )) || <p className="text-slate-550 italic text-center py-10">Waiting for validation run to begin...</p>}
                        </div>
                    </div>
                </div>

                {/* Right Side: Main Validation View & HITL editor */}
                <div className="flex-1 p-8 overflow-y-auto bg-grid-pattern relative flex flex-col justify-center">
                    {!activeRun ? (
                        /* Idle Showcase View */
                        <div className="max-w-xl mx-auto w-full text-center space-y-8 py-10">
                            <div className="relative inline-flex items-center justify-center">
                                <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-2xl animate-pulse" />
                                <div className="w-20 h-20 rounded-3xl bg-white border border-slate-200 flex items-center justify-center text-4xl shadow-md relative z-10">
                                    🤖
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">AI Co-Founder Workspace</h3>
                                <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                                    Ready to run deep, multi-agent validation. The pipeline crawls the web to build investor-ready analyses of target markets, competitors, and technical blueprints.
                                </p>
                            </div>

                            {/* Visual Agent Pipeline Map */}
                            <div className="p-6 bg-white border border-slate-200 rounded-2xl text-left space-y-4 shadow-sm">
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Agent Execution Flow</span>
                                <div className="grid grid-cols-3 gap-3 text-[10px] text-slate-650 font-mono">
                                    <div className="p-2 border border-slate-100 bg-slate-50 rounded-lg flex items-center gap-1.5 font-medium">
                                        <span className="text-emerald-600 font-bold">1.</span> Idea Classification
                                    </div>
                                    <div className="p-2 border border-slate-100 bg-slate-50 rounded-lg flex items-center gap-1.5 font-medium">
                                        <span className="text-emerald-600 font-bold">2.</span> Live Web Search
                                    </div>
                                    <div className="p-2 border border-slate-100 bg-slate-50 rounded-lg flex items-center gap-1.5 font-medium">
                                        <span className="text-emerald-600 font-bold">3.</span> Price Matrix
                                    </div>
                                    <div className="p-2 border border-slate-100 bg-slate-50 rounded-lg flex items-center gap-1.5 col-span-2 font-medium">
                                        <span className="text-indigo-600 font-bold">4.</span> Technical blueprint & INR costs
                                    </div>
                                    <div className="p-2 border border-slate-100 bg-slate-50 rounded-lg flex items-center gap-1.5 font-medium">
                                        <span className="text-indigo-600 font-bold">5.</span> MVP backlog
                                    </div>
                                    <div className="p-2 border border-slate-100 bg-slate-50 rounded-lg flex items-center gap-1.5 font-medium">
                                        <span className="text-pink-600 font-bold">6.</span> Financial Forecast
                                    </div>
                                    <div className="p-2 border border-slate-100 bg-slate-50 rounded-lg flex items-center gap-1.5 font-medium">
                                        <span className="text-pink-600 font-bold">7.</span> Marketing loops
                                    </div>
                                    <div className="p-2 border border-slate-100 bg-slate-50 rounded-lg flex items-center gap-1.5 font-medium">
                                        <span className="text-rose-600 font-bold">8.</span> Risk mitigation
                                    </div>
                                    <div className="p-2 border border-indigo-100 bg-indigo-50 rounded-lg flex items-center gap-1.5 col-span-3 text-center text-indigo-700 font-bold">
                                        🚀 Final VC Pitch Outline & Auditor Evaluation
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleTriggerRun}
                                className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold py-3.5 rounded-xl shadow-sm transition-all uppercase tracking-wider text-xs"
                            >
                                Start Analysis Sequence
                            </button>
                        </div>
                    ) : activeRun.status === "completed" ? (
                        /* Complete View */
                        <div className="max-w-md mx-auto w-full text-center space-y-6 py-10">
                            <div className="relative inline-flex items-center justify-center">
                                <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-2xl animate-pulse" />
                                <div className="w-20 h-20 rounded-3xl bg-white border border-slate-200 flex items-center justify-center text-4xl shadow-md relative z-10">
                                    🎉
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Validation Complete</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    Multi-agent analyses completed successfully. Your custom startup dashboard, product specifications, and pitch decks are ready.
                                </p>
                            </div>
                            <Link
                                href={`/dashboard/project/${id}/reports`}
                                className="inline-block w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-sm transition-transform hover:scale-[1.01] text-xs text-center uppercase tracking-wider"
                            >
                                Open Reports & Projections
                            </Link>
                        </div>
                    ) : activeRun.status === "waiting_approval" ? (
                        /* Checkpoint Editor View */
                        <div className="space-y-6 max-w-3xl mx-auto w-full pb-10">
                            <div className="p-6 bg-yellow-50 border border-yellow-150 rounded-2xl flex items-center justify-between shadow-sm backdrop-blur-sm">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-ping" />
                                        <h3 className="text-xs font-bold text-yellow-800 uppercase tracking-wider">Human Approval Checkpoint</h3>
                                    </div>
                                    <p className="text-xs text-slate-650 max-w-xl leading-relaxed">
                                        The AI has gathered deep research checkpoints. You can modify these values or add qualitative instructions to direct the next research node.
                                    </p>
                                </div>
                                <span className="text-[10px] bg-yellow-100 border border-yellow-200 text-yellow-800 px-3 py-1.5 rounded-xl font-bold font-mono">
                                    NODE: {activeRun.current_step.toUpperCase()}
                                </span>
                            </div>

                            {/* Forms based on Active Step */}
                            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                                {activeRun.current_step === "Technical Architect" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="col-span-2 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-lg">🏗️</span>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Architecture Summary</label>
                                            </div>
                                            <textarea
                                                rows={4}
                                                value={editArchitecture}
                                                onChange={(e) => setEditArchitecture(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-sans leading-relaxed resize-y font-medium"
                                                placeholder="Describe system design..."
                                            />
                                        </div>
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-lg">🚀</span>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recommended Tech Stack</label>
                                            </div>
                                            <textarea
                                                rows={2}
                                                value={editTechStack}
                                                onChange={(e) => setEditTechStack(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-mono resize-y font-medium"
                                                placeholder="Next.js, Python, PostgreSQL..."
                                            />
                                        </div>
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-lg">💰</span>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Starting Infra Costs (INR/mo)</label>
                                            </div>
                                            <input
                                                type="text"
                                                value={editInfraCosts}
                                                onChange={(e) => setEditInfraCosts(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-bold"
                                                placeholder="e.g. ₹8,000 / month"
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeRun.current_step === "MVP Planner" && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-lg">📋</span>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prioritized Backlog List (New line separated)</label>
                                            </div>
                                            <textarea
                                                rows={8}
                                                value={editBacklog}
                                                onChange={(e) => setEditBacklog(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 resize-y leading-relaxed font-medium"
                                                placeholder="Task 1&#10;Task 2&#10;Task 3..."
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">💬</span>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Feedback to Agents (Optional)</label>
                                    </div>
                                    <textarea
                                        rows={2}
                                        placeholder="Add guidelines (e.g. 'Target regional users first', 'Use AWS instead of GCP', 'Include dynamic payments backlog'...)"
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 leading-relaxed resize-y font-medium"
                                    />
                                </div>

                                <button
                                    onClick={handleApprove}
                                    disabled={submittingApproval}
                                    className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold py-3.5 rounded-xl shadow-sm transition-all text-xs uppercase tracking-wider"
                                >
                                    {submittingApproval ? "Submitting Checkpoint..." : "✓ Approve & Continue Run"}
                                </button>
                            </div>
                        </div>
                    ) : activeRun.status === "failed" ? (
                        /* Failed View */
                        <div className="max-w-md mx-auto w-full text-center space-y-6 py-10">
                            <div className="relative inline-flex items-center justify-center">
                                <div className="absolute inset-0 bg-rose-500/10 rounded-full blur-2xl animate-pulse" />
                                <div className="w-20 h-20 rounded-3xl bg-white border border-slate-200 flex items-center justify-center text-4xl shadow-md relative z-10">
                                    ❌
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Process Failed</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    The agent pipeline encountered an error during the <b>{activeRun.current_step}</b> step. You can retry the process from where it left off, or start a new run entirely.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 mt-4">
                                <button
                                    onClick={handleRetryRun}
                                    className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold py-3.5 rounded-xl shadow-sm transition-all text-xs uppercase tracking-wider"
                                >
                                    ↻ Retry Failed Step
                                </button>
                                <button
                                    onClick={handleTriggerRun}
                                    className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-xl shadow-sm transition-all text-xs uppercase tracking-wider"
                                >
                                    Start Fresh Run
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* In Progress View */
                        <div className="max-w-md mx-auto w-full text-center space-y-6 py-10">
                            <div className="relative inline-flex items-center justify-center">
                                <div className="absolute inset-0 bg-indigo-500/5 rounded-full blur-2xl animate-pulse" />
                                <div className="w-16 h-16 rounded-3xl bg-white border border-slate-200 flex items-center justify-center shadow-md relative z-10">
                                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Validation in Progress</h3>
                                <p className="text-indigo-650 font-mono text-[10px] uppercase tracking-wider font-bold animate-pulse">
                                    Active Agent: {activeRun.current_step}
                                </p>
                                <p className="text-slate-500 text-xs max-w-xs mx-auto leading-relaxed font-medium">
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

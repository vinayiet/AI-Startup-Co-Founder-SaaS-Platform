"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";

interface Workspace {
    id: string;
    name: string;
}

interface Project {
    id: string;
    name: string;
    description: string;
    industry?: string;
    target_audience?: string;
    created_at: string;
}

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Create Workspace Form State
    const [newWsName, setNewWsName] = useState("");
    const [wsError, setWsError] = useState<string | null>(null);
    const [wsSuccess, setWsSuccess] = useState(false);

    // Create Project Form State
    const [newProjName, setNewProjName] = useState("");
    const [newProjDesc, setNewProjDesc] = useState("");
    const [newProjInd, setNewProjInd] = useState("");
    const [newProjAud, setNewProjAud] = useState("");
    const [projError, setProjError] = useState<string | null>(null);
    const [showProjModal, setShowProjModal] = useState(false);

    async function loadWorkspaces() {
        try {
            const data = await api.get<Workspace[]>("/workspaces");
            setWorkspaces(data);
            if (data.length > 0) {
                setSelectedWorkspace(data[0]);
            }
        } catch {
            // Keep empty
        } finally {
            setLoading(false);
        }
    }

    async function loadProjects(wsId: string) {
        try {
            const data = await api.get<Project[]>(`/projects?workspace_id=${wsId}`);
            setProjects(data);
        } catch {
            // Keep empty
        }
    }

    async function handleCreateWorkspace(e: React.FormEvent) {
        e.preventDefault();
        setWsError(null);
        try {
            const newWs = await api.post<Workspace>("/workspaces", { name: newWsName });
            setWorkspaces([...workspaces, newWs]);
            setSelectedWorkspace(newWs);
            setNewWsName("");
            setWsSuccess(true);
            setTimeout(() => setWsSuccess(false), 3000);
        } catch (err) {
            const error = err as Error;
            setWsError(error.message || "Failed to create workspace.");
        }
    }

    async function handleCreateProject(e: React.FormEvent) {
        e.preventDefault();
        setProjError(null);
        if (!selectedWorkspace) return;

        try {
            const newProj = await api.post<Project>("/projects", {
                workspace_id: selectedWorkspace.id,
                name: newProjName,
                description: newProjDesc,
                industry: newProjInd,
                target_audience: newProjAud
            });
            setProjects([newProj, ...projects]);
            setNewProjName("");
            setNewProjDesc("");
            setNewProjInd("");
            setNewProjAud("");
            setShowProjModal(false);
        } catch (err) {
            const error = err as Error;
            setProjError(error.message || "Failed to create project.");
        }
    }

    async function handleUpgrade() {
        try {
            const res = await api.post<{ checkout_url?: string }>("/billing/checkout?plan_name=Pro");
            if (res.checkout_url) {
                window.location.href = res.checkout_url;
            }
        } catch {
            alert("Upgrade failed to initialize.");
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadWorkspaces();
    }, []);

    useEffect(() => {
        if (selectedWorkspace) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            loadProjects(selectedWorkspace.id);
        } else {
            setProjects([]);
        }
    }, [selectedWorkspace]);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafc] bg-grid-pattern flex items-center justify-center text-slate-500 text-sm font-medium">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-5 h-5 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin" />
                    <span>Loading workspace environments...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] bg-grid-pattern text-slate-800">
            {/* Mobile Header Bar */}
            <header className="flex md:hidden items-center justify-between p-4 bg-white border-b border-slate-200 backdrop-blur-md sticky top-0 z-40">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-650 to-pink-500 flex items-center justify-center font-bold text-white shadow-md">
                        co
                    </div>
                    <span className="font-extrabold text-lg text-slate-900">
                        cofounder<span className="text-indigo-650 font-extrabold">.ai</span>
                    </span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="text-slate-650 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold shadow-sm transition-colors"
                >
                    {isMobileMenuOpen ? "✕ Close" : "☰ Menu"}
                </button>
            </header>

            {/* Sidebar */}
            <aside className={`${
                isMobileMenuOpen
                    ? "fixed inset-0 z-50 bg-white/95 backdrop-blur-md p-6 flex flex-col justify-between overflow-y-auto"
                    : "w-64 sidebar-gradient p-6 flex flex-col justify-between hidden md:flex"
            }`}>
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-650 to-pink-500 flex items-center justify-center font-bold text-white shadow-md">
                                co
                            </div>
                            <span className="font-extrabold text-lg text-slate-900">
                                cofounder<span className="text-indigo-650 font-extrabold">.ai</span>
                            </span>
                        </div>
                        {isMobileMenuOpen && (
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="text-slate-500 hover:text-slate-900 p-2 text-md transition-colors"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Workspace</span>
                        <div className="space-y-1">
                            {workspaces.map((ws) => (
                                <button
                                    key={ws.id}
                                    onClick={() => {
                                        setSelectedWorkspace(ws);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs transition-all border ${
                                        selectedWorkspace?.id === ws.id
                                            ? "bg-indigo-50 text-indigo-700 border-indigo-100 font-bold shadow-sm"
                                            : "text-slate-650 hover:text-slate-900 border-transparent hover:bg-slate-100/50 font-medium"
                                    }`}
                                >
                                    🏢 {ws.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleCreateWorkspace} className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Create Workspace</span>
                        <input
                            type="text"
                            required
                            placeholder="New Workspace Name"
                            value={newWsName}
                            onChange={(e) => setNewWsName(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                        />
                        <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition-colors uppercase tracking-wider text-[10px]">
                            + Add Workspace
                        </button>
                        {wsError && <p className="text-[10px] text-red-500 mt-1 font-medium">{wsError}</p>}
                        {wsSuccess && <p className="text-[10px] text-green-600 mt-1 font-medium">Workspace created!</p>}
                    </form>
                </div>

                <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center shadow-sm">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Billing Tier</div>
                        <div className="font-extrabold text-indigo-650 text-xs mb-3.5 uppercase tracking-wide">{user?.plan} Plan</div>
                        {user?.plan === "Free" && (
                            <button
                                onClick={handleUpgrade}
                                className="w-full text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl shadow-sm transition-colors uppercase tracking-wider"
                            >
                                Upgrade to Pro
                            </button>
                        )}
                    </div>

                    <button onClick={logout} className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors">
                        🚪 Log Out
                    </button>
                </div>
            </aside>

            {/* Main Content Dashboard */}
            <main className="flex-1 p-8 overflow-y-auto">
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Startup Projects</h1>
                        <p className="text-xs text-slate-500 mt-1">
                            Active Workspace: <span className="text-indigo-600 font-bold">{selectedWorkspace?.name || "None"}</span>
                        </p>
                    </div>
                    {selectedWorkspace && (
                        <button
                            onClick={() => setShowProjModal(true)}
                            className="bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all uppercase tracking-wider text-[10px]"
                        >
                            + New Startup Idea
                        </button>
                    )}
                </header>

                {/* Projects Grid */}
                {!selectedWorkspace ? (
                    <div className="h-64 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 shadow-sm">
                        <div className="text-3xl mb-3">🏢</div>
                        <h3 className="text-sm font-bold text-slate-900 mb-1">No active workspaces</h3>
                        <p className="text-slate-500 text-xs max-w-sm">Please construct a workspace on the sidebar to partition your validation projects.</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="h-64 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 shadow-sm">
                        <div className="text-3xl mb-3">💡</div>
                        <h3 className="text-sm font-bold text-slate-900 mb-1">No startup ideas yet</h3>
                        <p className="text-slate-500 text-xs max-w-sm mb-4">Create a validation project to kick off the multi-agent analysis workflow.</p>
                        <button
                            onClick={() => setShowProjModal(true)}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors uppercase tracking-wider text-[10px]"
                        >
                            Create Project
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((proj) => (
                            <div key={proj.id} className="glass-card p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-bold">
                                            {proj.industry || "General"}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900 mb-2 truncate">{proj.name}</h3>
                                    <p className="text-slate-500 text-xs leading-relaxed mb-6 line-clamp-3">
                                        {proj.description}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Link
                                        href={`/dashboard/project/${proj.id}`}
                                        className="flex-1 text-center bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm transition-colors uppercase tracking-wider text-[10px]"
                                    >
                                        Run Agent Validation
                                    </Link>
                                    <Link
                                        href={`/dashboard/project/${proj.id}/reports`}
                                        className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm"
                                    >
                                        📝 Reports
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Project Creation Modal */}
                {showProjModal && (
                    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl p-8 shadow-2xl relative">
                            <h2 className="text-lg font-black text-slate-900 mb-1">Define Startup Idea</h2>
                            <p className="text-xs text-slate-500 mb-6">Our 11-agent validator will evaluate your input across target audiences and competitor niches.</p>
                            
                            {projError && (
                                <div className="p-3 mb-4 rounded-xl bg-red-550/15 border border-red-500/20 text-red-750 text-xs font-semibold">
                                    ⚠️ {projError}
                                </div>
                            )}

                            <form onSubmit={handleCreateProject} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Startup Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. CoFounder AI"
                                        value={newProjName}
                                        onChange={(e) => setNewProjName(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Idea Description</label>
                                    <textarea
                                        required
                                        rows={4}
                                        placeholder="Describe the problem, your solution, and how the startup will generate revenues..."
                                        value={newProjDesc}
                                        onChange={(e) => setNewProjDesc(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium leading-relaxed"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Industry / Sector</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. B2B SaaS"
                                            value={newProjInd}
                                            onChange={(e) => setNewProjInd(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Target Audience</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Startup Founders"
                                            value={newProjAud}
                                            onChange={(e) => setNewProjAud(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setShowProjModal(false)}
                                        className="bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm uppercase tracking-wider text-[10px]"
                                    >
                                        Create Project
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

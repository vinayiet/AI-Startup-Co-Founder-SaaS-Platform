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

    useEffect(() => {
        loadWorkspaces();
    }, []);

    useEffect(() => {
        if (selectedWorkspace) {
            loadProjects(selectedWorkspace.id);
        } else {
            setProjects([]);
        }
    }, [selectedWorkspace]);

    const loadWorkspaces = async () => {
        try {
            const data = await api.get<Workspace[]>("/workspaces");
            setWorkspaces(data);
            if (data.length > 0) {
                setSelectedWorkspace(data[0]);
            }
        } catch (err) {
            // Keep empty
        } finally {
            setLoading(false);
        }
    };

    const loadProjects = async (wsId: string) => {
        try {
            const data = await api.get<Project[]>(`/projects?workspace_id=${wsId}`);
            setProjects(data);
        } catch (err) {
            // Keep empty
        }
    };

    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        setWsError(null);
        try {
            const newWs = await api.post<Workspace>("/workspaces", { name: newWsName });
            setWorkspaces([...workspaces, newWs]);
            setSelectedWorkspace(newWs);
            setNewWsName("");
            setWsSuccess(true);
            setTimeout(() => setWsSuccess(false), 3000);
        } catch (err: any) {
            setWsError(err.message || "Failed to create workspace.");
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
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
        } catch (err: any) {
            setProjError(err.message || "Failed to create project.");
        }
    };

    const handleUpgrade = async () => {
        try {
            const res = await api.post<any>("/billing/checkout?plan_name=Pro");
            if (res.checkout_url) {
                window.location.href = res.checkout_url;
            }
        } catch (err) {
            alert("Upgrade failed to initialize.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400 text-sm">
                Loading workspace environments...
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-[#09090b]">
            {/* Sidebar */}
            <aside className="w-64 sidebar-gradient p-6 flex flex-col justify-between hidden md:flex">
                <div className="space-y-8">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-bold text-white shadow-md">
                            co
                        </div>
                        <span className="font-bold text-lg text-white">cofounder.ai</span>
                    </div>

                    <div className="space-y-4">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Active Workspace</span>
                        <div className="space-y-1">
                            {workspaces.map((ws) => (
                                <button
                                    key={ws.id}
                                    onClick={() => setSelectedWorkspace(ws)}
                                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                                        selectedWorkspace?.id === ws.id
                                            ? "bg-purple-600/10 text-purple-400 border border-purple-500/20"
                                            : "text-zinc-400 hover:text-white"
                                    }`}
                                >
                                    🏢 {ws.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleCreateWorkspace} className="space-y-2">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Create Workspace</span>
                        <input
                            type="text"
                            required
                            placeholder="New Workspace Name"
                            value={newWsName}
                            onChange={(e) => setNewWsName(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                        <button type="submit" className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white py-1 rounded-lg text-xs font-semibold">
                            + Add Workspace
                        </button>
                        {wsError && <p className="text-[10px] text-red-400 mt-1">{wsError}</p>}
                        {wsSuccess && <p className="text-[10px] text-green-400 mt-1">Workspace created!</p>}
                    </form>
                </div>

                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
                        <div className="text-xs text-zinc-500 mb-1">Billing Tier</div>
                        <div className="font-bold text-purple-400 text-sm mb-3">{user?.plan} Plan</div>
                        {user?.plan === "Free" && (
                            <button
                                onClick={handleUpgrade}
                                className="w-full text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white py-2 rounded-lg"
                            >
                                Upgrade to Pro
                            </button>
                        )}
                    </div>

                    <button onClick={logout} className="w-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white py-2 rounded-xl text-xs font-semibold">
                        🚪 Log Out
                    </button>
                </div>
            </aside>

            {/* Main Content Dashboard */}
            <main className="flex-1 p-8 overflow-y-auto">
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white">Startup Projects</h1>
                        <p className="text-sm text-zinc-400 mt-1">
                            Active Workspace: <span className="text-purple-400 font-semibold">{selectedWorkspace?.name || "None"}</span>
                        </p>
                    </div>
                    {selectedWorkspace && (
                        <button
                            onClick={() => setShowProjModal(true)}
                            className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg shadow-purple-500/20 hover:scale-[1.02] transition-all"
                        >
                            + New Startup Idea
                        </button>
                    )}
                </header>

                {/* Projects Grid */}
                {!selectedWorkspace ? (
                    <div className="h-64 glass-panel rounded-2xl flex flex-col items-center justify-center text-center p-6 border border-zinc-800">
                        <div className="text-4xl mb-4">🏢</div>
                        <h3 className="text-lg font-bold text-white mb-2">No active workspaces</h3>
                        <p className="text-zinc-500 text-sm max-w-sm">Please construct a workspace on the sidebar to partition your validation projects.</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="h-64 glass-panel rounded-2xl flex flex-col items-center justify-center text-center p-6 border border-zinc-800">
                        <div className="text-4xl mb-4">💡</div>
                        <h3 className="text-lg font-bold text-white mb-2">No startup ideas yet</h3>
                        <p className="text-zinc-500 text-sm max-w-sm mb-6">Create a validation project to kick off the multi-agent analysis workflow.</p>
                        <button
                            onClick={() => setShowProjModal(true)}
                            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-4 py-2 rounded-xl text-sm font-semibold"
                        >
                            Create Project
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((proj) => (
                            <div key={proj.id} className="glass-card p-6 rounded-2xl border border-zinc-800 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-xs bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-1 rounded-full font-semibold">
                                            {proj.industry || "General"}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2 truncate">{proj.name}</h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed mb-6 line-clamp-3">
                                        {proj.description}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Link
                                        href={`/dashboard/project/${proj.id}`}
                                        className="flex-1 text-center bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold py-2.5 rounded-xl shadow-md transition-colors"
                                    >
                                        Run Agent Validation
                                    </Link>
                                    <Link
                                        href={`/dashboard/project/${proj.id}/reports`}
                                        className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white px-3 py-2.5 rounded-xl text-xs transition-colors"
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
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-[#0c0c0e] border border-zinc-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl relative">
                            <h2 className="text-xl font-bold text-white mb-2">Define Startup Idea</h2>
                            <p className="text-xs text-zinc-500 mb-6">Our 11-agent validator will evaluate your input across target audiences and competitor niches.</p>
                            
                            {projError && (
                                <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                                    ⚠️ {projError}
                                </div>
                            )}

                            <form onSubmit={handleCreateProject} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Startup Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. CoFounder AI"
                                        value={newProjName}
                                        onChange={(e) => setNewProjName(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Idea Description</label>
                                    <textarea
                                        required
                                        rows={4}
                                        placeholder="Describe the problem, your solution, and how the startup will generate revenues..."
                                        value={newProjDesc}
                                        onChange={(e) => setNewProjDesc(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Industry / Sector</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. B2B SaaS"
                                            value={newProjInd}
                                            onChange={(e) => setNewProjInd(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Target Audience</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Startup Founders"
                                            value={newProjAud}
                                            onChange={(e) => setNewProjAud(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setShowProjModal(false)}
                                        className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white px-4 py-2 rounded-xl text-sm font-semibold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-semibold"
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

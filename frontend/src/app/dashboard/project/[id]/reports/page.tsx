"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";

interface Report {
    id: string;
    title: string;
    sections: Record<string, any>;
    version: string;
    created_at: string;
}

export default function ReportsWorkspace() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);
    const [activeReport, setActiveReport] = useState<Report | null>(null);
    const [activeTab, setActiveTab] = useState("vision");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReports();
    }, [id]);

    const loadReports = async () => {
        try {
            const data = await api.get<Report[]>(`/reports/project/${id}`);
            setReports(data);
            if (data.length > 0) {
                setActiveReport(data[0]);
            }
        } catch (err) {
            // Keep empty
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400 text-sm font-sans tracking-wide">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <span>Compiling validation report layout...</span>
                </div>
            </div>
        );
    }

    if (reports.length === 0 || !activeReport) {
        return (
            <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-center">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-xl font-bold text-white mb-2">No Reports Generated Yet</h3>
                <p className="text-zinc-500 text-sm max-w-sm mb-6">
                    Run the multi-agent validation graph to analyze your startup concept and assemble the final reports.
                </p>
                <Link
                    href={`/dashboard/project/${id}`}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-lg"
                >
                    Go to Workspace Dashboard
                </Link>
            </div>
        );
    }

    const { analysis, market, competitors, reality_check, technical, mvp, financials, marketing, risks, pitch_deck } = activeReport.sections;

    const TABS = [
        { id: "vision", name: "💡 Vision & Assumptions", desc: "Category, target demographic, hypotheses" },
        { id: "market", name: "📈 Market Analysis", desc: "TAM, SAM, SOM, demand & growth trends" },
        { id: "competitors", name: "⚔️ Competition", desc: "Pricing models & competitive position" },
        { id: "reality_check", name: "💀 Reality Check", desc: "Viability score, failure probability & pivots" },
        { id: "tech", name: "🛠️ Technical Architecture", desc: "Recommended stack, blueprint & hosting costs" },
        { id: "mvp", name: "📋 MVP Delivery Roadmap", desc: "Scrum backlog & product release phases" },
        { id: "finance", name: "📊 Financial Forecasts", desc: "Revenue streams & break-even analyses in INR" },
        { id: "marketing", name: "🚀 GTM Strategy", desc: "Launch plans, loops & growth hacks" },
        { id: "risks", name: "⚠️ Risk Assessment", desc: "Mitigation catalog & regulatory compliance" },
        { id: "pitch", name: "🎤 Investor Pitch Deck", desc: "10-slide VC pitch deck outline" }
    ];

    return (
        <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col font-sans select-none relative">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-pink-900/5 rounded-full blur-[150px] pointer-events-none" />

            {/* Top Bar Nav */}
            <header className="border-b border-zinc-900 bg-zinc-950/70 backdrop-blur-md px-8 py-4 flex items-center justify-between sticky top-0 z-45">
                <div className="flex items-center gap-4">
                    <Link href={`/dashboard/project/${id}`} className="text-zinc-400 hover:text-white transition-all text-xs flex items-center gap-2 group">
                        <span className="transform group-hover:-translate-x-1 transition-transform">&larr;</span> Back to Workspace
                    </Link>
                    <span className="text-zinc-800">|</span>
                    <h1 className="text-sm font-bold text-white tracking-tight">{activeReport.title}</h1>
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
                    <button
                        onClick={() => window.print()}
                        className="bg-zinc-900/60 border border-zinc-800 hover:border-purple-500/30 hover:bg-zinc-850 hover:text-purple-400 text-zinc-300 text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5"
                    >
                        <span>🖨️</span> Export PDF / Print
                    </button>
                </div>
            </header>

            {/* Dashboard Tabs & Content Area */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* Tabs selection sidebar */}
                <aside className="w-full md:w-72 sidebar-gradient p-6 border-r border-zinc-900 flex flex-col gap-2 overflow-y-auto">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-4">Report Sections</span>
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-305 flex flex-col gap-0.5 ${
                                activeTab === tab.id
                                    ? "bg-purple-950/20 text-purple-400 border-purple-500/30 shadow-md shadow-purple-500/5"
                                    : "text-zinc-400 hover:text-white border-transparent hover:bg-zinc-900/40"
                            }`}
                        >
                            <span className="text-xs font-bold tracking-wide">{tab.name}</span>
                            <span className="text-[9px] text-zinc-500">{tab.desc}</span>
                        </button>
                    ))}
                </aside>

                {/* Main section contents wrapper */}
                <main className="flex-1 p-8 overflow-y-auto bg-grid-pattern relative">
                    {activeTab === "vision" && (
                        <div className="space-y-6 max-w-4xl">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Section 01</span>
                                <h2 className="text-xl font-black text-white tracking-tight">Startup Vision & Assumptions</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-2">
                                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Startup Classification</h3>
                                    <p className="text-white text-md font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">{analysis?.category || "N/A"}</p>
                                </div>
                                <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-2">
                                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Target Customers</h3>
                                    <p className="text-zinc-300 text-xs leading-relaxed">{analysis?.target_users || "N/A"}</p>
                                </div>
                            </div>
                            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-2">
                                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Business Revenue Model</h3>
                                <p className="text-zinc-300 text-xs leading-relaxed">{analysis?.business_model || "N/A"}</p>
                            </div>
                            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-3">
                                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Key Critical Hypotheses</h3>
                                <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-line">{analysis?.assumptions || "N/A"}</p>
                            </div>
                        </div>
                    )}

                    {activeTab === "market" && (
                        <div className="space-y-6 max-w-4xl">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Section 02</span>
                                <h2 className="text-xl font-black text-white tracking-tight">Market Sizing & Industry Demand</h2>
                            </div>
                            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-2">
                                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Demand Summary</h3>
                                <p className="text-zinc-300 text-xs leading-relaxed">{market?.demand || market?.market_demand || "N/A"}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="glass-panel p-6 rounded-2xl border border-zinc-800 border-l-4 border-l-purple-500 shadow-md">
                                    <h3 className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Total Addressable (TAM)</h3>
                                    <p className="text-lg font-black text-white tracking-tight">{market?.tam || "N/A"}</p>
                                </div>
                                <div className="glass-panel p-6 rounded-2xl border border-zinc-800 border-l-4 border-l-pink-500 shadow-md">
                                    <h3 className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Serviceable Addressable (SAM)</h3>
                                    <p className="text-lg font-black text-white tracking-tight">{market?.sam || "N/A"}</p>
                                </div>
                                <div className="glass-panel p-6 rounded-2xl border border-zinc-800 border-l-4 border-l-blue-500 shadow-md">
                                    <h3 className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Obtainable Share (SOM)</h3>
                                    <p className="text-lg font-black text-white tracking-tight">{market?.som || "N/A"}</p>
                                </div>
                            </div>

                            {/* Graphical Sizing Comparison */}
                            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
                                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Market Sizing Comparative Graph</h3>
                                <div className="space-y-3 font-mono text-[10px] text-zinc-400">
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span>SOM (Target Segment)</span>
                                            <span className="text-blue-400 font-bold">{market?.som || "N/A"}</span>
                                        </div>
                                        <div className="w-full bg-zinc-950 border border-zinc-900 h-2.5 rounded-full overflow-hidden">
                                            <div className="bg-blue-500 h-full rounded-full" style={{ width: '12%' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span>SAM (Addressable Audience)</span>
                                            <span className="text-pink-400 font-bold">{market?.sam || "N/A"}</span>
                                        </div>
                                        <div className="w-full bg-zinc-950 border border-zinc-900 h-2.5 rounded-full overflow-hidden">
                                            <div className="bg-pink-500 h-full rounded-full" style={{ width: '38%' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span>TAM (Global Market Capacity)</span>
                                            <span className="text-purple-400 font-bold">{market?.tam || "N/A"}</span>
                                        </div>
                                        <div className="w-full bg-zinc-950 border border-zinc-900 h-2.5 rounded-full overflow-hidden">
                                            <div className="bg-purple-500 h-full rounded-full" style={{ width: '100%' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-2">
                                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Emerging Industry Trends</h3>
                                <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-line">{market?.trends || market?.market_trends || "N/A"}</p>
                            </div>
                        </div>
                    )}

                    {activeTab === "competitors" && (
                        <div className="space-y-6 max-w-4xl">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Section 03</span>
                                <h2 className="text-xl font-black text-white tracking-tight">Competitor Positioning & Opportunities</h2>
                            </div>
                            <div className="glass-panel border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-zinc-950/80 border-b border-zinc-900 text-zinc-400">
                                        <tr>
                                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-[9px]">Competitor Name</th>
                                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-[9px]">Pricing Model</th>
                                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-[9px]">Market Positioning / Gaps</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-900 bg-zinc-950/20">
                                        {(competitors?.list || competitors?.competitors || []).map((comp: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-zinc-900/35 transition-colors">
                                                <td className="px-6 py-4.5 font-bold text-white text-xs">{comp.name}</td>
                                                <td className="px-6 py-4.5 text-purple-400 font-semibold text-xs">{comp.pricing}</td>
                                                <td className="px-6 py-4.5 text-zinc-350 leading-relaxed text-xs">{comp.positioning}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-2">
                                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Our Positioning Strategy</h3>
                                    <p className="text-zinc-300 text-xs leading-relaxed">{competitors?.positioning || "N/A"}</p>
                                </div>
                                <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-2">
                                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Identified Market Gaps</h3>
                                    <p className="text-zinc-300 text-xs leading-relaxed">{competitors?.opportunities || "N/A"}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "reality_check" && (
                        <div className="space-y-6 max-w-4xl">
                            {/* Header */}
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Reality Check Audit</span>
                                <h2 className="text-xl font-black text-white tracking-tight">Assumptions Stress-Test & Viability Audit</h2>
                            </div>

                            {/* Core Dashboard Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Viability Card */}
                                <div className="glass-panel p-6 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                                    <h3 className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-4">Overall Viability Score</h3>
                                    
                                    {/* SVG Ring */}
                                    <div className="relative w-28 h-28 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-95">
                                            <circle cx="56" cy="56" r="46" stroke="#18181b" strokeWidth="8" fill="transparent" />
                                            <circle 
                                                cx="56" 
                                                cy="56" 
                                                r="46" 
                                                stroke="url(#viabilityGlow)" 
                                                strokeWidth="8" 
                                                fill="transparent" 
                                                strokeDasharray="289"
                                                strokeDashoffset={289 - (289 * (reality_check?.viability_score || 0)) / 100}
                                                strokeLinecap="round"
                                                className="transition-all duration-1000 ease-out"
                                            />
                                            <defs>
                                                <linearGradient id="viabilityGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#10b981" />
                                                    <stop offset="100%" stopColor="#059669" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute flex flex-col items-center">
                                            <span className="text-2xl font-black text-white tracking-tight">{reality_check?.viability_score || 0}</span>
                                            <span className="text-[8px] font-bold text-zinc-500 uppercase">Grade {reality_check?.viability_grade || "F"}</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-zinc-405 mt-4 leading-relaxed italic">
                                        "{reality_check?.reality_validator_report?.viability?.summary || reality_check?.summary || "No validation summary."}"
                                    </p>
                                </div>

                                {/* Failure Probability Card */}
                                <div className="glass-panel p-6 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-600" />
                                    <h3 className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-4">Failure Probability</h3>
                                    
                                    {/* SVG Ring */}
                                    <div className="relative w-28 h-28 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-95">
                                            <circle cx="56" cy="56" r="46" stroke="#18181b" strokeWidth="8" fill="transparent" />
                                            <circle 
                                                cx="56" 
                                                cy="56" 
                                                r="46" 
                                                stroke="url(#failureGlow)" 
                                                strokeWidth="8" 
                                                fill="transparent" 
                                                strokeDasharray="289"
                                                strokeDashoffset={289 - (289 * (reality_check?.failure_probability || 0)) / 100}
                                                strokeLinecap="round"
                                                className="transition-all duration-1000 ease-out"
                                            />
                                            <defs>
                                                <linearGradient id="failureGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#ef4444" />
                                                    <stop offset="100%" stopColor="#b91c1c" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute flex flex-col items-center">
                                            <span className="text-2xl font-black text-red-500 tracking-tight">{reality_check?.failure_probability || 0}%</span>
                                            <span className="text-[8px] font-bold text-zinc-500 uppercase">Confidence {reality_check?.reality_validator_report?.failure_probability_engine?.confidence || 0}%</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 mt-4 leading-relaxed font-mono">
                                        Critically assessed based on timing, competitor strength, and CAC complexity.
                                    </p>
                                </div>

                                {/* Quick Risks & Assumptions Card */}
                                <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4 flex flex-col justify-between">
                                    <div className="space-y-3">
                                        <h4 className="text-[9px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <span>💀</span> Critical Failure Risks
                                        </h4>
                                        <ul className="space-y-1.5 text-[10px] text-zinc-350 leading-relaxed list-none pl-0">
                                            {(reality_check?.top_failure_reasons || reality_check?.reality_validator_report?.failure_probability_engine?.top_failure_reasons || []).slice(0, 3).map((reason: string, i: number) => (
                                                <li key={i} className="flex gap-2">
                                                    <span className="text-red-500 font-bold">•</span>
                                                    <span>{reason}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="space-y-1.5">
                                        <h4 className="text-[9px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <span>⚠️</span> Challenged Assumptions
                                        </h4>
                                        <ul className="space-y-1.5 text-[10px] text-zinc-350 leading-relaxed list-none pl-0">
                                            {(reality_check?.critical_assumptions || reality_check?.reality_validator_report?.critical_assumptions || []).slice(0, 2).map((ass: string, i: number) => (
                                                <li key={i} className="flex gap-2">
                                                    <span className="text-amber-500 font-bold">•</span>
                                                    <span>{ass}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Pivots & Repositioning Section */}
                            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-5">
                                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <span>🔄</span> Recommended Pivot Directions & Repositioning
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-zinc-950/60 p-4 border border-amber-500/20 rounded-xl space-y-2 relative shadow-lg">
                                        <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full m-3" />
                                        <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Pivoting Strategy</h4>
                                        <ul className="space-y-1.5 text-[10px] text-zinc-350 list-disc pl-4 leading-relaxed">
                                            {(reality_check?.recommended_pivots?.recommended_pivots || []).map((pivot: string, i: number) => (
                                                <li key={i}>{pivot}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-zinc-950/60 p-4 border border-purple-500/20 rounded-xl space-y-2 relative shadow-lg">
                                        <div className="absolute top-0 right-0 w-2 h-2 bg-purple-500 rounded-full m-3" />
                                        <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Market Repositioning</h4>
                                        <ul className="space-y-1.5 text-[10px] text-zinc-350 list-disc pl-4 leading-relaxed">
                                            {(reality_check?.recommended_pivots?.market_repositioning || []).map((repos: string, i: number) => (
                                                <li key={i}>{repos}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-zinc-950/60 p-4 border border-emerald-500/20 rounded-xl space-y-2 relative shadow-lg">
                                        <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full m-3" />
                                        <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Scope Reductions (Lean MVP)</h4>
                                        <ul className="space-y-1.5 text-[10px] text-zinc-350 list-disc pl-4 leading-relaxed">
                                            {(reality_check?.recommended_pivots?.scope_reduction_suggestions || []).map((red: string, i: number) => (
                                                <li key={i}>{red}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed 6-Category Stress Tests */}
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Category Stress Test Breakdowns</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* 1. Founder-Market Fit */}
                                    <div className="glass-panel p-5 rounded-2xl border border-zinc-800 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">1. Founder-Market Fit</span>
                                            <span className="text-[10px] font-bold text-white bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg">Score: {reality_check?.reality_validator_report?.founder_market_fit?.score || 0}/10</span>
                                        </div>
                                        <p className="text-[10px] text-zinc-305 leading-relaxed">
                                            {reality_check?.reality_validator_report?.founder_market_fit?.analysis || "N/A"}
                                        </p>
                                    </div>

                                    {/* 2. Market Timing */}
                                    <div className="glass-panel p-5 rounded-2xl border border-zinc-800 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">2. Market Timing</span>
                                            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/20 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                                                {reality_check?.reality_validator_report?.market_timing?.timing || "N/A"} ({reality_check?.reality_validator_report?.market_timing?.confidence || 0}% Conf.)
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-zinc-305 leading-relaxed">
                                            {reality_check?.reality_validator_report?.market_timing?.analysis || "N/A"}
                                        </p>
                                    </div>

                                    {/* 3. Competition Pressure */}
                                    <div className="glass-panel p-5 rounded-2xl border border-zinc-800 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">3. Competition Pressure</span>
                                            <span className="text-[10px] font-bold text-white bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg">Score: {reality_check?.reality_validator_report?.competition_pressure?.competition_score || 0}/10</span>
                                        </div>
                                        <div className="flex gap-4 text-[9px] text-zinc-505">
                                            <span>Switching Costs: <b className="text-zinc-300">{reality_check?.reality_validator_report?.competition_pressure?.switching_cost || "N/A"}</b></span>
                                            <span>Differentiation: <b className="text-zinc-300">{reality_check?.reality_validator_report?.competition_pressure?.differentiation_strength || "N/A"}</b></span>
                                        </div>
                                        <ul className="space-y-1 text-[10px] text-zinc-350 list-disc pl-4">
                                            {(reality_check?.reality_validator_report?.competition_pressure?.risks || []).slice(0, 2).map((risk: string, i: number) => (
                                                <li key={i}>{risk}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* 4. Customer Acquisition Difficulty */}
                                    <div className="glass-panel p-5 rounded-2xl border border-zinc-800 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">4. Customer Acquisition</span>
                                            <span className="text-[10px] font-bold text-rose-400 bg-rose-950/20 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                                                Difficulty: {reality_check?.reality_validator_report?.customer_acquisition?.difficulty || "N/A"}
                                            </span>
                                        </div>
                                        <div className="text-[9px] text-zinc-505">
                                            <span>Estimated CAC: <b className="text-zinc-300">{reality_check?.reality_validator_report?.customer_acquisition?.estimated_cac || "N/A"}</b></span>
                                        </div>
                                        <p className="text-[10px] text-zinc-305 leading-relaxed">
                                            {reality_check?.reality_validator_report?.customer_acquisition?.analysis || "N/A"}
                                        </p>
                                    </div>

                                    {/* 5. Revenue Assumption Validation */}
                                    <div className="glass-panel p-5 rounded-2xl border border-zinc-800 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">5. Revenue Realism</span>
                                            <span className="text-[10px] font-bold text-white bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg">Score: {reality_check?.reality_validator_report?.revenue_validation?.realism_score || 0}/10</span>
                                        </div>
                                        <p className="text-[10px] text-zinc-305 leading-relaxed">
                                            {reality_check?.reality_validator_report?.revenue_validation?.adjusted_expectations || "N/A"}
                                        </p>
                                    </div>

                                    {/* 6. Technical Execution Risk */}
                                    <div className="glass-panel p-5 rounded-2xl border border-zinc-800 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">6. Technical & Regulatory Risk</span>
                                            <span className="text-[10px] font-bold text-rose-400 bg-rose-950/20 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                                                Risk: {reality_check?.reality_validator_report?.technical_execution?.risk_level || "N/A"}
                                            </span>
                                        </div>
                                        <div className="text-[9px] text-zinc-505">
                                            <span>Complexity: <b className="text-zinc-300">{reality_check?.reality_validator_report?.technical_execution?.complexity || "N/A"}</b></span>
                                        </div>
                                        <ul className="space-y-1 text-[10px] text-zinc-350 list-disc pl-4">
                                            {(reality_check?.reality_validator_report?.technical_execution?.concerns || []).slice(0, 2).map((c: string, i: number) => (
                                                <li key={i}>{c}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "tech" && (
                        <div className="space-y-6 max-w-4xl">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Section 04</span>
                                <h2 className="text-xl font-black text-white tracking-tight">Technical Stack & Architectural Blueprint</h2>
                            </div>
                            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-2">
                                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Recommended Tech Stack</h3>
                                <p className="text-white text-xs font-mono bg-zinc-950 px-4 py-3 border border-zinc-850 rounded-xl leading-relaxed whitespace-pre-wrap">{technical?.tech_stack || "N/A"}</p>
                            </div>
                            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-3">
                                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Architecture Details</h3>
                                <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-line font-mono bg-zinc-950 p-4 border border-zinc-850 rounded-xl">{technical?.architecture || "N/A"}</p>
                            </div>
                            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 border-l-4 border-l-pink-500 shadow-md">
                                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Starting Infrastructure Cost Target</h3>
                                <p className="text-pink-400 text-sm font-bold font-mono">{technical?.infra_costs || "N/A"}</p>
                            </div>
                        </div>
                    )}

                    {activeTab === "mvp" && (
                        <div className="space-y-6 max-w-4xl">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Section 05</span>
                                <h2 className="text-xl font-black text-white tracking-tight">MVP Prioritization Backlog</h2>
                            </div>
                            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
                                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Core Feature Specs</h3>
                                <div className="space-y-3">
                                    {(mvp?.features || mvp?.mvp_features || []).map((feat: any, idx: number) => (
                                        <div key={idx} className="p-4 bg-zinc-950/45 border border-zinc-850/60 rounded-xl flex items-center justify-between shadow-sm hover:border-zinc-800 transition-colors">
                                            <div>
                                                <h4 className="font-bold text-white text-xs">{feat.name}</h4>
                                                <p className="text-zinc-400 text-[10px] mt-1 leading-relaxed">{feat.description}</p>
                                            </div>
                                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                                                feat.priority === "High" ? "bg-purple-500/10 border-purple-500/20 text-purple-400" :
                                                feat.priority === "Medium" ? "bg-pink-500/10 border-pink-500/20 text-pink-400" :
                                                "bg-zinc-800/80 border-zinc-700 text-zinc-400"
                                            }`}>
                                                {feat.priority}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
                                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Release Timeline</h3>
                                    <div className="space-y-4 relative pl-4 border-l border-zinc-800">
                                        {(mvp?.roadmap || []).map((phase: any, idx: number) => (
                                            <div key={idx} className="space-y-1 relative">
                                                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-purple-500 border border-purple-400/30 shadow-md shadow-purple-500/20" />
                                                <div className="text-[10px] text-purple-400 font-bold">{phase.phase} ({phase.time})</div>
                                                <div className="text-xs text-white leading-relaxed">{phase.description}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
                                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Prioritized Scrum Backlog</h3>
                                    <div className="space-y-1.5 text-xs font-mono text-zinc-300 bg-zinc-950 p-4 border border-zinc-850 rounded-xl max-h-60 overflow-y-auto">
                                        {(mvp?.backlog || mvp?.priority_backlog || []).map((item: string, idx: number) => (
                                            <p key={idx} className="border-b border-zinc-900/60 pb-1 last:border-b-0">{item}</p>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "finance" && (
                        <div className="space-y-6 max-w-4xl">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Section 06</span>
                                <h2 className="text-xl font-black text-white tracking-tight">Financial Forecasts & Projections</h2>
                            </div>
                            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-2">
                                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Revenue Model & Monetization</h3>
                                <p className="text-zinc-300 text-xs leading-relaxed">{financials?.revenue_model || "N/A"}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
                                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Yearly Projections (INR)</h3>
                                    <div className="space-y-2 bg-zinc-950 p-4 border border-zinc-850 rounded-xl font-mono text-xs">
                                        {Object.entries(financials?.projections || {}).map(([key, val]: any, idx) => (
                                            <div key={idx} className="flex justify-between py-1.5 border-b border-zinc-900 last:border-b-0">
                                                <span className="text-zinc-500 font-medium">{key}</span>
                                                <span className="text-white font-bold">{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="glass-panel p-6 rounded-2xl border border-zinc-800 border-l-4 border-l-purple-500 shadow-md space-y-2">
                                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cash Flow Break-Even Point</h3>
                                    <p className="text-zinc-200 text-xs leading-relaxed font-sans">{financials?.break_even || "N/A"}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "marketing" && (
                        <div className="space-y-6 max-w-4xl">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Section 07</span>
                                <h2 className="text-xl font-black text-white tracking-tight">Go-To-Market Growth Loop</h2>
                            </div>
                            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-2">
                                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Launch Strategy</h3>
                                <p className="text-zinc-300 text-xs leading-relaxed">{marketing?.launch || marketing?.launch_strategy || "N/A"}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-3">
                                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Customer Acquisition Channels</h3>
                                    <ul className="space-y-2 text-xs text-zinc-300 font-sans">
                                        {(marketing?.channels || marketing?.acquisition_channels || []).map((ch: string, idx: number) => (
                                            <li key={idx} className="flex gap-2 items-start">
                                                <span className="text-purple-400">•</span> <span>{ch}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-3">
                                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Viral Growth Hacks</h3>
                                    <ul className="space-y-2 text-xs text-zinc-300 font-sans">
                                        {(marketing?.growth || marketing?.growth_hacks || []).map((gh: string, idx: number) => (
                                            <li key={idx} className="flex gap-2 items-start">
                                                <span className="text-pink-400">•</span> <span>{gh}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "risks" && (
                        <div className="space-y-6 max-w-4xl">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Section 08</span>
                                <h2 className="text-xl font-black text-white tracking-tight">Risk Matrix & Mitigation Plans</h2>
                            </div>
                            <div className="glass-panel border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-zinc-950/80 border-b border-zinc-900 text-zinc-400">
                                        <tr>
                                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-[9px]">Category</th>
                                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-[9px]">Severity</th>
                                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-[9px]">Failure Description</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-900 bg-zinc-950/20">
                                        {(risks?.list || risks?.risks || []).map((risk: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-zinc-900/35 transition-colors">
                                                <td className="px-6 py-4.5 font-bold text-white text-xs">{risk.category}</td>
                                                <td className="px-6 py-4.5">
                                                    <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border ${
                                                        risk.severity === "High" 
                                                            ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                                                            : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                                                    }`}>
                                                        {risk.severity}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4.5 text-zinc-350 leading-relaxed text-xs">{risk.description}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
                                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Mitigation Catalog</h3>
                                <div className="space-y-3">
                                    {(risks?.mitigations || []).map((mit: any, idx: number) => (
                                        <div key={idx} className="p-4 bg-zinc-950/45 border border-zinc-850/60 rounded-xl space-y-1 hover:border-zinc-800 transition-colors shadow-sm">
                                            <div className="text-xs font-bold text-white">Risk Point: {mit.risk_description}</div>
                                            <div className="text-xs text-purple-400 font-semibold">AI Recommended Action: {mit.mitigation_plan}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "pitch" && (
                        <div className="space-y-6 max-w-4xl pb-10">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Section 09</span>
                                <h2 className="text-xl font-black text-white tracking-tight">10-Slide Investor Pitch Deck Outline</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {(pitch_deck?.pitch_deck || pitch_deck || []).map((slide: any, idx: number) => {
                                    const slideNum = String(idx + 1).padStart(2, "0");
                                    return (
                                        <div key={idx} className="glass-panel p-6 rounded-2xl border border-zinc-800/80 shadow-lg space-y-3 relative group overflow-hidden">
                                            {/* Aspect Ratio Slide preview marker */}
                                            <div className="absolute top-4 right-4 text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-400 font-mono font-bold px-2 py-0.5 rounded">
                                                SLIDE {slideNum}
                                            </div>
                                            <h4 className="font-bold text-white text-sm max-w-[80%] pr-4">{slide.title}</h4>
                                            <ul className="space-y-2 text-xs text-zinc-350 pl-2 pt-2 leading-relaxed">
                                                {slide.points.map((pt: string, pIdx: number) => (
                                                    <li key={pIdx} className="flex gap-2 items-start">
                                                        <span className="text-purple-400/70 select-none">•</span>
                                                        <span>{pt}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

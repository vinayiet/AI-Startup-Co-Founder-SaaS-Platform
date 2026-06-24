"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/services/api";

interface Competitor {
    name: string;
    pricing: string;
    last_verified?: string;
    source_url?: string;
    positioning: string;
}

interface RiskItem {
    category: string;
    severity: string;
    description: string;
}

interface MitigationItem {
    risk_description: string;
    mitigation_plan: string;
}

interface FeatureItem {
    name: string;
    description: string;
    priority: string;
}

interface PhaseItem {
    phase: string;
    time: string;
    description: string;
}

interface SlideItem {
    title: string;
    points: string[];
}

interface Report {
    id: string;
    title: string;
    sections: {
        analysis?: {
            category?: string;
            target_users?: string;
            business_model?: string;
            assumptions?: string;
        };
        market?: {
            demand?: string;
            market_demand?: string;
            tam?: string;
            sam?: string;
            som?: string;
            trends?: string;
            market_trends?: string;
        };
        competitors?: {
            list?: Competitor[];
            competitors?: Competitor[];
            positioning?: string;
            opportunities?: string;
        };
        reality_check?: {
            viability_score?: number;
            viability_grade?: string;
            summary?: string;
            failure_probability?: number;
            top_failure_reasons?: string[];
            critical_assumptions?: string[];
            reality_validator_report?: {
                viability?: { summary?: string };
                failure_probability_engine?: {
                    confidence?: number;
                    top_failure_reasons?: string[];
                };
                critical_assumptions?: string[];
                founder_market_fit?: { score?: number; analysis?: string };
                market_timing?: { timing?: string; confidence?: number; analysis?: string };
                competition_pressure?: { competition_score?: number; switching_cost?: string; differentiation_strength?: string; risks?: string[] };
                customer_acquisition?: { difficulty?: string; estimated_cac?: string; analysis?: string };
                revenue_validation?: { realism_score?: number; adjusted_expectations?: string };
                technical_execution?: { risk_level?: string; complexity?: string; concerns?: string[] };
            };
            recommended_pivots?: {
                recommended_pivots?: string[];
                market_repositioning?: string[];
                scope_reduction_suggestions?: string[];
            };
        };
        technical?: {
            tech_stack?: string;
            architecture?: string;
            infra_costs?: string;
        };
        mvp?: {
            features?: FeatureItem[];
            mvp_features?: FeatureItem[];
            roadmap?: PhaseItem[];
            backlog?: string[];
            priority_backlog?: string[];
        };
        financials?: {
            needs_review?: boolean;
            warnings?: string[];
            revenue_model?: string;
            projections?: Record<string, string>;
            break_even?: string;
        };
        marketing?: {
            launch?: string;
            launch_strategy?: string;
            channels?: string[];
            acquisition_channels?: string[];
            growth?: string[];
            growth_hacks?: string[];
        };
        risks?: {
            list?: RiskItem[];
            risks?: RiskItem[];
            mitigations?: MitigationItem[];
        };
        pitch_deck?: {
            pitch_deck?: SlideItem[];
        } | SlideItem[];
    };
    version: string;
    created_at: string;
}

export default function ReportsWorkspace() {
    const { id } = useParams() as { id: string };
    const [reports, setReports] = useState<Report[]>([]);
    const [activeReport, setActiveReport] = useState<Report | null>(null);
    const [activeTab, setActiveTab] = useState("vision");
    const [loading, setLoading] = useState(true);

    async function loadReports() {
        try {
            const data = await api.get<Report[]>(`/reports/project/${id}`);
            setReports(data);
            if (data.length > 0) {
                setActiveReport(data[0]);
            }
        } catch {
            // Keep empty
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadReports();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafc] bg-grid-pattern flex items-center justify-center text-slate-500 text-sm font-sans tracking-wide">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-5 h-5 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin" />
                    <span>Compiling validation report layout...</span>
                </div>
            </div>
        );
    }

    if (reports.length === 0 || !activeReport) {
        return (
            <div className="min-h-screen bg-[#f8fafc] bg-grid-pattern flex flex-col items-center justify-center p-6 text-center">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Reports Generated Yet</h3>
                <p className="text-slate-500 text-sm max-w-sm mb-6 leading-relaxed font-medium">
                    Run the multi-agent validation graph to analyze your startup concept and assemble the final reports.
                </p>
                <Link
                    href={`/dashboard/project/${id}`}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-sm transition-all uppercase tracking-wider text-[11px]"
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

    const slideItems: SlideItem[] = Array.isArray(pitch_deck)
        ? pitch_deck
        : (pitch_deck?.pitch_deck || []);

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans select-none relative">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-pink-500/3 rounded-full blur-[150px] pointer-events-none" />

            {/* Top Bar Nav */}
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md px-8 py-4 flex items-center justify-between sticky top-0 z-45">
                <div className="flex items-center gap-4">
                    <Link href={`/dashboard/project/${id}`} className="text-slate-500 hover:text-slate-950 transition-all text-xs flex items-center gap-2 group font-semibold">
                        <span className="transform group-hover:-translate-x-1 transition-transform">&larr;</span> Back to Workspace
                    </Link>
                    <span className="text-slate-300">|</span>
                    <h1 className="text-sm font-bold text-slate-900 tracking-tight">{activeReport.title}</h1>
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
                    <button
                        onClick={() => window.print()}
                        className="bg-white border border-slate-200 hover:border-indigo-500/30 hover:bg-slate-50 hover:text-indigo-650 text-slate-700 text-xs font-bold px-4.5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                    >
                        <span>🖨️</span> Export PDF / Print
                    </button>
                </div>
            </header>

            {/* Dashboard Tabs & Content Area */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* Tabs selection sidebar */}
                <aside className="w-full md:w-72 sidebar-gradient p-6 border-r border-slate-200 flex flex-col gap-2 overflow-y-auto">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-4">Report Sections</span>
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-300 flex flex-col gap-0.5 ${
                                activeTab === tab.id
                                    ? "bg-indigo-50 text-indigo-750 border-indigo-200 shadow-inner font-semibold"
                                    : "text-slate-650 hover:text-slate-900 border-transparent hover:bg-slate-100/50"
                            }`}
                        >
                            <span className="text-xs font-bold tracking-wide">{tab.name}</span>
                            <span className="text-[9px] text-slate-450 font-medium">{tab.desc}</span>
                        </button>
                    ))}
                </aside>

                {/* Main section contents wrapper */}
                <main className="flex-1 p-8 overflow-y-auto bg-grid-pattern relative">
                    {activeTab === "vision" && (
                        <div className="space-y-6 max-w-4xl">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Section 01</span>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Startup Vision & Assumptions</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-2 shadow-sm">
                                    <h3 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Startup Classification</h3>
                                    <p className="text-slate-900 text-md font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">{analysis?.category || "N/A"}</p>
                                </div>
                                <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-2 shadow-sm">
                                    <h3 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Target Customers</h3>
                                    <p className="text-slate-600 text-xs leading-relaxed font-medium">{analysis?.target_users || "N/A"}</p>
                                </div>
                            </div>
                            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-2 shadow-sm">
                                <h3 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Business Revenue Model</h3>
                                <p className="text-slate-600 text-xs leading-relaxed font-medium">{analysis?.business_model || "N/A"}</p>
                            </div>
                            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-3 shadow-sm">
                                <h3 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Key Critical Hypotheses</h3>
                                <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-line font-medium">{analysis?.assumptions || "N/A"}</p>
                            </div>
                        </div>
                    )}

                    {activeTab === "market" && (
                        <div className="space-y-6 max-w-4xl">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Section 02</span>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Market Sizing & Industry Demand</h2>
                            </div>

                            {financials?.needs_review && financials?.warnings && financials.warnings.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2 text-xs text-amber-900">
                                    <div className="font-bold flex items-center gap-1.5">
                                        <span>⚠️</span> Cross-Section Consistency Notice (Needs Review)
                                    </div>
                                    <ul className="list-disc pl-4 space-y-1 text-slate-600 font-sans font-medium">
                                        {financials.warnings.map((warn: string, i: number) => (
                                            <li key={i}>{warn}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-2 shadow-sm">
                                <h3 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Demand Summary</h3>
                                <p className="text-slate-600 text-xs leading-relaxed font-medium">{market?.demand || market?.market_demand || "N/A"}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white border border-slate-200 p-6 rounded-2xl border-l-4 border-l-indigo-600 shadow-sm">
                                    <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Addressable (TAM)</h3>
                                    <p className="text-lg font-black text-slate-900 tracking-tight">{market?.tam || "N/A"}</p>
                                </div>
                                <div className="bg-white border border-slate-200 p-6 rounded-2xl border-l-4 border-l-pink-500 shadow-sm">
                                    <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Serviceable Addressable (SAM)</h3>
                                    <p className="text-lg font-black text-slate-900 tracking-tight">{market?.sam || "N/A"}</p>
                                </div>
                                <div className="bg-white border border-slate-200 p-6 rounded-2xl border-l-4 border-l-blue-500 shadow-sm">
                                    <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Obtainable Share (SOM)</h3>
                                    <p className="text-lg font-black text-slate-900 tracking-tight">{market?.som || "N/A"}</p>
                                </div>
                            </div>

                            {/* Graphical Sizing Comparison */}
                            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-sm">
                                <h3 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Market Sizing Comparative Graph</h3>
                                <div className="space-y-3 font-mono text-[10px] text-slate-500 font-medium">
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span>SOM (Target Segment)</span>
                                            <span className="text-blue-600 font-bold">{market?.som || "N/A"}</span>
                                        </div>
                                        <div className="w-full bg-slate-50 border border-slate-200 h-2.5 rounded-full overflow-hidden">
                                            <div className="bg-blue-500 h-full rounded-full" style={{ width: '12%' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span>SAM (Addressable Audience)</span>
                                            <span className="text-pink-650 font-bold">{market?.sam || "N/A"}</span>
                                        </div>
                                        <div className="w-full bg-slate-50 border border-slate-200 h-2.5 rounded-full overflow-hidden">
                                            <div className="bg-pink-500 h-full rounded-full" style={{ width: '38%' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span>TAM (Global Market Capacity)</span>
                                            <span className="text-indigo-650 font-bold">{market?.tam || "N/A"}</span>
                                        </div>
                                        <div className="w-full bg-slate-50 border border-slate-200 h-2.5 rounded-full overflow-hidden">
                                            <div className="bg-indigo-600 h-full rounded-full" style={{ width: '100%' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-2 shadow-sm">
                                <h3 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Emerging Industry Trends</h3>
                                <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-line font-medium">{market?.trends || market?.market_trends || "N/A"}</p>
                            </div>
                        </div>
                    )}

                    {activeTab === "competitors" && (
                        <div className="space-y-6 max-w-4xl">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Section 03</span>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Competitor Positioning & Opportunities</h2>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                        <tr>
                                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-[9px]">Competitor Name</th>
                                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-[9px]">Pricing Model</th>
                                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-[9px]">Market Positioning / Gaps</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {(competitors?.list || competitors?.competitors || []).map((comp: Competitor, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4.5 font-bold text-slate-900 text-xs">{comp.name}</td>
                                                <td className="px-6 py-4.5 text-indigo-600 font-semibold text-xs">
                                                    <div>{comp.pricing}</div>
                                                    {(comp.last_verified || comp.source_url) && (
                                                        <div className="text-[10px] text-slate-400 mt-1 font-normal space-y-0.5">
                                                            {comp.last_verified && <div>Verified: {comp.last_verified}</div>}
                                                            {comp.source_url && comp.source_url !== "data not found" && (
                                                                <div>
                                                                    <a href={comp.source_url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-700 underline break-all">
                                                                        Source Link
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4.5 text-slate-600 leading-relaxed text-xs font-medium">{comp.positioning}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-2 shadow-sm">
                                    <h3 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Our Positioning Strategy</h3>
                                    <p className="text-slate-600 text-xs leading-relaxed font-medium">{competitors?.positioning || "N/A"}</p>
                                </div>
                                <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-2 shadow-sm">
                                    <h3 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Identified Market Gaps</h3>
                                    <p className="text-slate-600 text-xs leading-relaxed font-medium">{competitors?.opportunities || "N/A"}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "reality_check" && (
                        <div className="space-y-6 max-w-4xl">
                            {/* Header */}
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Reality Check Audit</span>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Assumptions Stress-Test & Viability Audit</h2>
                            </div>

                            {/* Core Dashboard Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Viability Card */}
                                <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group shadow-sm">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                                    <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-4">Overall Viability Score</h3>
                                    
                                    {/* SVG Ring */}
                                    <div className="relative w-28 h-28 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-95">
                                            <circle cx="56" cy="56" r="46" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
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
                                            <span className="text-2xl font-black text-slate-900 tracking-tight">{reality_check?.viability_score || 0}</span>
                                            <span className="text-[8px] font-bold text-slate-500 uppercase">Grade {reality_check?.viability_grade || "F"}</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-[9px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
                                        Fundable Target: 70+
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-4 leading-relaxed italic font-medium">
                                        &ldquo;{reality_check?.reality_validator_report?.viability?.summary || reality_check?.summary || "No validation summary."}&rdquo;
                                    </p>
                                    <div className="mt-4 pt-3 border-t border-slate-100 w-full text-center">
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Grade Scale</p>
                                        <p className="text-[8px] text-slate-500 font-medium">A: ≥85 | B: ≥70 | C: ≥55 | D: ≥40 | F: &lt;40</p>
                                    </div>
                                </div>

                                {/* Failure Probability Card */}
                                <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group shadow-sm">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-600" />
                                    <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-4">Failure Probability</h3>
                                    
                                    {/* SVG Ring */}
                                    <div className="relative w-28 h-28 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-95">
                                            <circle cx="56" cy="56" r="46" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
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
                                            <span className="text-2xl font-black text-rose-600 tracking-tight">{reality_check?.failure_probability || 0}%</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase">Confidence {reality_check?.reality_validator_report?.failure_probability_engine?.confidence || 0}%</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-4 leading-relaxed font-mono font-medium">
                                        Critically assessed based on timing, competitor strength, and CAC complexity.
                                    </p>
                                </div>

                                {/* Quick Risks & Assumptions Card */}
                                <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 flex flex-col justify-between shadow-sm">
                                    <div className="space-y-3">
                                        <h4 className="text-[9px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                                            <span>💀</span> Critical Failure Risks
                                        </h4>
                                        <ul className="space-y-1.5 text-[10px] text-slate-600 leading-relaxed list-none pl-0 font-medium">
                                            {(reality_check?.top_failure_reasons || reality_check?.reality_validator_report?.failure_probability_engine?.top_failure_reasons || []).slice(0, 3).map((reason: string, i: number) => (
                                                <li key={i} className="flex gap-2">
                                                    <span className="text-rose-500 font-bold">•</span>
                                                    <span>{reason}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="space-y-1.5">
                                        <h4 className="text-[9px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                                            <span>⚠️</span> Challenged Assumptions
                                        </h4>
                                        <ul className="space-y-1.5 text-[10px] text-slate-600 leading-relaxed list-none pl-0 font-medium">
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
                            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-5 shadow-sm">
                                <h3 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
                                    <span>🔄</span> Recommended Pivot Directions & Repositioning
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-2 relative shadow-sm">
                                        <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full m-3" />
                                        <h4 className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pivoting Strategy</h4>
                                        <ul className="space-y-1.5 text-[10px] text-slate-600 list-disc pl-4 leading-relaxed font-medium">
                                            {(reality_check?.recommended_pivots?.recommended_pivots || []).map((pivot: string, i: number) => (
                                                <li key={i}>{pivot}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-2 relative shadow-sm">
                                        <div className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-full m-3" />
                                        <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Market Repositioning</h4>
                                        <ul className="space-y-1.5 text-[10px] text-slate-600 list-disc pl-4 leading-relaxed font-medium">
                                            {(reality_check?.recommended_pivots?.market_repositioning || []).map((repos: string, i: number) => (
                                                <li key={i}>{repos}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-2 relative shadow-sm">
                                        <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full m-3" />
                                        <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Scope Reductions (Lean MVP)</h4>
                                        <ul className="space-y-1.5 text-[10px] text-slate-600 list-disc pl-4 leading-relaxed font-medium">
                                            {(reality_check?.recommended_pivots?.scope_reduction_suggestions || []).map((red: string, i: number) => (
                                                <li key={i}>{red}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed 6-Category Stress Tests */}
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Category Stress Test Breakdowns</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* 1. Founder-Market Fit */}
                                    <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">1. Founder-Market Fit</span>
                                            <span className="text-[10px] font-bold text-slate-800 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">Score: {reality_check?.reality_validator_report?.founder_market_fit?.score || 0}/10</span>
                                        </div>
                                        <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                                            {reality_check?.reality_validator_report?.founder_market_fit?.analysis || "N/A"}
                                        </p>
                                    </div>

                                    {/* 2. Market Timing */}
                                    <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">2. Market Timing</span>
                                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                                                {reality_check?.reality_validator_report?.market_timing?.timing || "N/A"} ({reality_check?.reality_validator_report?.market_timing?.confidence || 0}% Conf.)
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                                            {reality_check?.reality_validator_report?.market_timing?.analysis || "N/A"}
                                        </p>
                                    </div>

                                    {/* 3. Competition Pressure */}
                                    <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">3. Competition Pressure</span>
                                            <span className="text-[10px] font-bold text-slate-800 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">Score: {reality_check?.reality_validator_report?.competition_pressure?.competition_score || 0}/10</span>
                                        </div>
                                        <div className="flex gap-4 text-[9px] text-slate-500 font-medium">
                                            <span>Switching Costs: <b className="text-slate-700 font-bold">{reality_check?.reality_validator_report?.competition_pressure?.switching_cost || "N/A"}</b></span>
                                            <span>Differentiation: <b className="text-slate-700 font-bold">{reality_check?.reality_validator_report?.competition_pressure?.differentiation_strength || "N/A"}</b></span>
                                        </div>
                                        <ul className="space-y-1 text-[10px] text-slate-600 list-disc pl-4 font-medium">
                                            {(reality_check?.reality_validator_report?.competition_pressure?.risks || []).slice(0, 2).map((risk: string, i: number) => (
                                                <li key={i}>{risk}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* 4. Customer Acquisition Difficulty */}
                                    <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">4. Customer Acquisition</span>
                                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                                                Difficulty: {reality_check?.reality_validator_report?.customer_acquisition?.difficulty || "N/A"}
                                            </span>
                                        </div>
                                        <div className="text-[9px] text-slate-500 font-medium">
                                            <span>Estimated CAC: <b className="text-slate-700 font-bold">{reality_check?.reality_validator_report?.customer_acquisition?.estimated_cac || "N/A"}</b></span>
                                        </div>
                                        <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                                            {reality_check?.reality_validator_report?.customer_acquisition?.analysis || "N/A"}
                                        </p>
                                    </div>

                                    {/* 5. Revenue Assumption Validation */}
                                    <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">5. Revenue Realism</span>
                                            <span className="text-[10px] font-bold text-slate-800 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">Score: {reality_check?.reality_validator_report?.revenue_validation?.realism_score || 0}/10</span>
                                        </div>
                                        <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                                            {reality_check?.reality_validator_report?.revenue_validation?.adjusted_expectations || "N/A"}
                                        </p>
                                    </div>

                                    {/* 6. Technical Execution Risk */}
                                    <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">6. Technical & Regulatory Risk</span>
                                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                                                Risk: {reality_check?.reality_validator_report?.technical_execution?.risk_level || "N/A"}
                                            </span>
                                        </div>
                                        <div className="text-[9px] text-slate-500 font-medium">
                                            <span>Complexity: <b className="text-slate-700 font-bold">{reality_check?.reality_validator_report?.technical_execution?.complexity || "N/A"}</b></span>
                                        </div>
                                        <ul className="space-y-1 text-[10px] text-slate-600 list-disc pl-4 font-medium">
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
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Section 04</span>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Technical Stack & Architectural Blueprint</h2>
                            </div>
                            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-2 shadow-sm">
                                <h3 className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Recommended Tech Stack</h3>
                                <p className="text-slate-800 text-xs font-mono bg-slate-55 px-4 py-3 border border-slate-200 rounded-xl leading-relaxed whitespace-pre-wrap font-medium">{technical?.tech_stack || "N/A"}</p>
                            </div>
                            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-3 shadow-sm">
                                <h3 className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Architecture Details</h3>
                                <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-line font-mono bg-slate-55 p-4 border border-slate-200 rounded-xl font-medium">{technical?.architecture || "N/A"}</p>
                            </div>
                            <div className="bg-white border border-slate-200 p-6 rounded-2xl border-l-4 border-l-pink-500 shadow-sm">
                                <h3 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Starting Infrastructure Cost Target</h3>
                                <p className="text-pink-600 text-sm font-bold font-mono">{technical?.infra_costs || "N/A"}</p>
                            </div>
                        </div>
                    )}

                    {activeTab === "mvp" && (
                        <div className="space-y-6 max-w-4xl">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Section 05</span>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">MVP Prioritization Backlog</h2>
                            </div>
                            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-sm">
                                <h3 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Core Feature Specs</h3>
                                <div className="space-y-3">
                                    {(mvp?.features || mvp?.mvp_features || []).map((feat: FeatureItem, idx: number) => (
                                        <div key={idx} className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl flex items-center justify-between shadow-sm hover:border-slate-350 transition-colors">
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-xs">{feat.name}</h4>
                                                <p className="text-slate-500 text-[10px] mt-1 leading-relaxed font-medium">{feat.description}</p>
                                            </div>
                                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl border ${
                                                feat.priority === "High" ? "bg-indigo-50 border-indigo-150 text-indigo-700 font-semibold" :
                                                feat.priority === "Medium" ? "bg-pink-50 border-pink-150 text-pink-700 font-semibold" :
                                                "bg-slate-100 border-slate-200 text-slate-500 font-medium"
                                            }`}>
                                                {feat.priority}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-sm">
                                    <h3 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Release Timeline</h3>
                                    <div className="space-y-4 relative pl-4 border-l border-slate-200">
                                        {(mvp?.roadmap || []).map((phase: PhaseItem, idx: number) => (
                                            <div key={idx} className="space-y-1 relative">
                                                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-650 border border-indigo-400/30 shadow-md shadow-indigo-500/20" />
                                                <div className="text-[10px] text-indigo-650 font-bold">{phase.phase} ({phase.time})</div>
                                                <div className="text-xs text-slate-700 leading-relaxed font-medium">{phase.description}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-sm">
                                    <h3 className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Prioritized Scrum Backlog</h3>
                                    <div className="space-y-1.5 text-xs font-mono text-slate-700 bg-slate-50 p-4 border border-slate-200 rounded-xl max-h-60 overflow-y-auto font-medium">
                                        {(mvp?.backlog || mvp?.priority_backlog || []).map((item: string, idx: number) => (
                                            <p key={idx} className="border-b border-slate-150 pb-1 last:border-b-0">{item}</p>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "finance" && (
                        <div className="space-y-6 max-w-4xl">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Section 06</span>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Financial Forecasts & Projections</h2>
                            </div>

                            {financials?.needs_review && financials?.warnings && financials.warnings.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2 text-xs text-amber-900 shadow-sm">
                                    <div className="font-bold flex items-center gap-1.5">
                                        <span>⚠️</span> Cross-Section Consistency Notice (Needs Review)
                                    </div>
                                    <ul className="list-disc pl-4 space-y-1 text-slate-600 font-sans font-medium">
                                        {financials.warnings.map((warn: string, i: number) => (
                                            <li key={i}>{warn}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-2 shadow-sm">
                                <h3 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Revenue Model & Monetization</h3>
                                <p className="text-slate-600 text-xs leading-relaxed font-medium">{financials?.revenue_model || "N/A"}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-sm">
                                    <h3 className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Yearly Projections (INR)</h3>
                                    <div className="space-y-2 bg-slate-50 p-4 border border-slate-200 rounded-xl font-mono text-xs font-medium">
                                        {Object.entries(financials?.projections || {}).map(([key, val], idx) => (
                                            <div key={idx} className="flex justify-between py-1.5 border-b border-slate-200 last:border-b-0">
                                                <span className="text-slate-500 font-medium">{key}</span>
                                                <span className="text-slate-900 font-bold">{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-white border border-slate-200 p-6 rounded-2xl border-l-4 border-l-indigo-600 shadow-sm space-y-2">
                                    <h3 className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Cash Flow Break-Even Point</h3>
                                    <p className="text-slate-750 text-xs leading-relaxed font-sans font-medium">{financials?.break_even || "N/A"}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "marketing" && (
                        <div className="space-y-6 max-w-4xl">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Section 07</span>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Go-To-Market Growth Loop</h2>
                            </div>
                            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-2 shadow-sm">
                                <h3 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Launch Strategy</h3>
                                <p className="text-slate-600 text-xs leading-relaxed font-medium">{marketing?.launch || marketing?.launch_strategy || "N/A"}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-3 shadow-sm">
                                    <h3 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Customer Acquisition Channels</h3>
                                    <ul className="space-y-2 text-xs text-slate-600 font-sans font-medium">
                                        {(marketing?.channels || marketing?.acquisition_channels || []).map((ch: string, idx: number) => (
                                            <li key={idx} className="flex gap-2 items-start">
                                                <span className="text-indigo-650">•</span> <span>{ch}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-3 shadow-sm">
                                    <h3 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Viral Growth Hacks</h3>
                                    <ul className="space-y-2 text-xs text-slate-600 font-sans font-medium">
                                        {(marketing?.growth || marketing?.growth_hacks || []).map((gh: string, idx: number) => (
                                            <li key={idx} className="flex gap-2 items-start">
                                                <span className="text-pink-650">•</span> <span>{gh}</span>
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
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Section 08</span>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Risk Matrix & Mitigation Plans</h2>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                        <tr>
                                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-[9px]">Category</th>
                                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-[9px]">Severity</th>
                                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-[9px]">Failure Description</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {(risks?.list || risks?.risks || []).map((risk: RiskItem, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4.5 font-bold text-slate-900 text-xs">{risk.category}</td>
                                                <td className="px-6 py-4.5">
                                                    <span className={`text-[9px] font-bold px-2.5 py-1 rounded-xl border ${
                                                        risk.severity === "High" 
                                                            ? "bg-rose-50 border-rose-150 text-rose-700 font-semibold" 
                                                            : "bg-amber-50 border-amber-150 text-amber-700 font-semibold"
                                                    }`}>
                                                        {risk.severity}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4.5 text-slate-600 leading-relaxed text-xs font-medium">{risk.description}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-sm">
                                <h3 className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Mitigation Catalog</h3>
                                <div className="space-y-3">
                                    {(risks?.mitigations || []).map((mit: MitigationItem, idx: number) => (
                                        <div key={idx} className="p-4 bg-slate-50/55 border border-slate-200 rounded-xl space-y-1 hover:border-slate-350 transition-colors shadow-sm font-medium">
                                            <div className="text-xs font-bold text-slate-900">Risk Point: {mit.risk_description}</div>
                                            <div className="text-xs text-indigo-650 font-semibold">AI Recommended Action: {mit.mitigation_plan}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "pitch" && (
                        <div className="space-y-6 max-w-4xl pb-10">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Section 09</span>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">10-Slide Investor Pitch Deck Outline</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {slideItems.map((slide: SlideItem, idx: number) => {
                                    const slideNum = String(idx + 1).padStart(2, "0");
                                    return (
                                        <div key={idx} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-3 relative group overflow-hidden">
                                            {/* Aspect Ratio Slide preview marker */}
                                            <div className="absolute top-4 right-4 text-[10px] bg-indigo-50 border border-indigo-150 text-indigo-700 font-mono font-bold px-2 py-0.5 rounded-xl">
                                                SLIDE {slideNum}
                                            </div>
                                            <h4 className="font-bold text-slate-900 text-sm max-w-[80%] pr-4">{slide.title}</h4>
                                            <ul className="space-y-2 text-xs text-slate-600 pl-2 pt-2 leading-relaxed font-medium">
                                                {slide.points.map((pt: string, pIdx: number) => (
                                                    <li key={pIdx} className="flex gap-2 items-start">
                                                        <span className="text-indigo-600 select-none">•</span>
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

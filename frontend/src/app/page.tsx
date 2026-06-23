"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

// Predefined startup concept datasets for simulator output
const PRESETS = [
  {
    name: "AI Pizza Delivery Drone",
    industry: "Logistics / FoodTech",
    desc: "Autonomous drone delivery fleet targeting urban pizza franchises with heated compartments and AI route optimization.",
    reports: {
      market: { tam: "$12.4B", competitors: "Starship, Wing, Domino's Custom", score: 78, recommendation: "Moderate risk. High hardware capex, strong localized demand." },
      tech: { stack: "ROS 2, C++, Python, Next.js, WebSockets, Redis", infra: "AWS IoT Core, Kubernetes edge clusters, GCP Pub/Sub", cost: "$4,500/mo" },
      finance: { yr1: "$420,000", yr2: "$1.8M", breakeven: "$22,000/mo" },
      slides: [
        { title: "The Problem", text: "Urban pizza delivery is slow, expensive, and dependent on traffic/human drivers." },
        { title: "The Solution", text: "Autonomous micro-drones delivering fresh, piping-hot pizzas in under 7 minutes." },
        { title: "Market Niche", text: "Targeting mid-sized local chains unable to afford custom robotic delivery divisions." }
      ]
    }
  },
  {
    name: "Micro-SaaS for Dog Walkers",
    industry: "Gig Economy / SaaS",
    desc: "A highly tailored business manager for local dog walking companies featuring automated scheduling, GPS track share, and billing.",
    reports: {
      market: { tam: "$480M", competitors: "Rover, Wag!, generic calendar apps", score: 89, recommendation: "Highly viable. Extremely low operating costs, fragmented customer base." },
      tech: { stack: "Next.js, Tailwind CSS, PostgreSQL, Stripe integration", infra: "Vercel serverless, Supabase database, AWS S3", cost: "$120/mo" },
      finance: { yr1: "$85,000", yr2: "$290,000", breakeven: "$1,800/mo" },
      slides: [
        { title: "The Problem", text: "Dog walking services waste 10+ hours a week on manual client scheduling and payment collection." },
        { title: "The Solution", text: "A dedicated scheduler and live GPS tracking dashboard for pet parents." },
        { title: "Market Niche", text: "Hyper-focused on boutique agencies with 2-10 walkers." }
      ]
    }
  },
  {
    name: "Real Estate Zoning Auditor",
    industry: "PropTech / LegalTech",
    desc: "AI auditor trained on municipal real estate zoning codes and standard B2B transaction clauses to flag legal risks in contract drafts.",
    reports: {
      market: { tam: "$2.1B", competitors: "DocuSign Analyzer, LawGeex", score: 94, recommendation: "Strong demand. High transaction value, clear cost savings for law firms." },
      tech: { stack: "FastAPI, Next.js, Python, Qdrant Vector DB, LlamaIndex", infra: "Docker, ECS Fargate, AWS RDS PostgreSQL", cost: "$850/mo" },
      finance: { yr1: "$210,000", yr2: "$950,000", breakeven: "$6,200/mo" },
      slides: [
        { title: "The Problem", text: "Real estate zoning audits take 5-7 days and cost thousands in billable lawyer hours." },
        { title: "The Solution", text: "RAG-powered zoning auditor that analyzes contracts in 90 seconds." },
        { title: "Market Niche", text: "Mid-market commercial brokerages and real estate legal boutiques." }
      ]
    }
  }
];

// Grouped Swarm Phases
const SWARM_PHASES = [
  {
    id: "market-swarm",
    title: "Market Crawl Phase",
    num: "01",
    agents: "Market Researcher, Competitor Crawler, SLA Auditor",
    details: "Crawls live pages, pulls census registers, compiles competitor gap charts, and calculates TAM size estimates."
  },
  {
    id: "system-swarm",
    title: "System Design Phase",
    num: "02",
    agents: "Lead Architect, Cost Estimator",
    details: "Assembles frontend/backend stack recommendations, specifies database relations, and charts monthly cloud hosting fees."
  },
  {
    id: "financial-swarm",
    title: "Financial Model Phase",
    num: "03",
    agents: "Financial Forecaster, Break-Even Modeler",
    details: "Projects Year 1/2 growth paths, calculates runway scenarios, and identifies Required MRR break-even goals."
  },
  {
    id: "gtm-swarm",
    title: "GTM & Pitch Output",
    num: "04",
    agents: "Growth Marketer, Pitch Designer, Risk Analyst",
    details: "Outlines cold campaign sequences, designs investor slide decks, and drafts SEC/GDPR compliance risks."
  }
];

export default function Home() {
  // Hero and Search State
  const [typedIdea, setTypedIdea] = useState(PRESETS[1].desc);
  const [selectedIdeaIdx, setSelectedIdeaIdx] = useState(1);
  const [activePhaseIdx, setActivePhaseIdx] = useState(0);

  // Simulator Execution State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [simulationComplete, setSimulationComplete] = useState(true);
  const [activeReportTab, setActiveReportTab] = useState("market");

  // Subscriber Slider State
  const [sliderClients, setSliderClients] = useState(30);
  const [activeFeatureTab, setActiveFeatureTab] = useState("market-intel");

  // FAQs Accordion State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const consoleBottomRef = useRef<HTMLDivElement>(null);
  const simulatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [simLogs, isSimulating]);

  const currentIdea = PRESETS[selectedIdeaIdx];
  const currentIdeaReports = currentIdea.reports;

  // Select pre-set template
  const handleSelectPreset = (idx: number) => {
    if (isSimulating) return;
    setSelectedIdeaIdx(idx);
    setTypedIdea(PRESETS[idx].desc);
    setSimulationComplete(false);
  };

  // Launch Simulated Agent Chain
  const handleLaunchValidation = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSimulating) return;

    setIsSimulating(true);
    setSimulationComplete(false);
    setSimLogs([]);

    // Scroll to the console section smoothly
    if (simulatorRef.current) {
      simulatorRef.current.scrollIntoView({ behavior: "smooth" });
    }

    const timeline = [
      { text: "Coordinating 11 specialized validation agents...", delay: 500 },
      { text: "Routing shared thread context to Market Swarm...", delay: 1200 },
      { text: "[Researcher] Gaining competitor records... calculating TAM metrics...", delay: 2000 },
      { text: `[Researcher] Market size identified: ${currentIdea.reports.market.tam} TAM.`, delay: 2850 },
      { text: "[Crawler] Processing active domains with crawlers... compiling gaps...", delay: 3500 },
      { text: `[Crawler] Competitor gaps cataloged: Found alternative platforms.`, delay: 4200 },
      { text: "[Architect] Designing container framework and DB schema...", delay: 5000 },
      { text: `[Architect] Selected stack: ${currentIdea.reports.tech.stack}.`, delay: 5800 },
      { text: "[Estimator] Accessing server sizing charts... mapping costs...", delay: 6500 },
      { text: `[Estimator] Compute costing projection finished: ${currentIdea.reports.tech.cost}.`, delay: 7200 },
      { text: "[Forecaster] Projecting net ARR growth and cash flow curves...", delay: 8000 },
      { text: "📊 [Forecaster] Yielded Year 1 and Year 2 revenue targets.", delay: 8800 },
      { text: "[Breakeven] Calculating burn/runway rates & required MRR...", delay: 9600 },
      { text: `[Breakeven] Baseline MRR target calculated at ${currentIdea.reports.finance.breakeven}.`, delay: 10400 },
      { text: "[Pitch Swarm] Compiling slide summaries & checking compliance rules...", delay: 11200 },
      { text: "Verification complete. Generating dashboard workspace outputs...", delay: 12000 }
    ];

    timeline.forEach((item, index) => {
      setTimeout(() => {
        setSimLogs(prev => [...prev, item.text]);
        if (index === timeline.length - 1) {
          setTimeout(() => {
            setIsSimulating(false);
            setSimulationComplete(true);
          }, 500);
        }
      }, item.delay);
    });
  };

  const faqs = [
    {
      q: "How does the multi-agent validation process work?",
      a: "When you enter a concept, we trigger an orchestration thread in LangGraph. Eleven specialized agents (crawlers, architects, financial modellers) retrieve current web API listings and competitor domains via vector indices in Qdrant, examine regulations, and cross-evaluate math spreadsheets. The SLA Auditor signs off only when calculations are verified."
    },
    {
      q: "Can I download the technical docker maps and codes directly?",
      a: "Yes. The System Design swarm outputs standard Docker Compose scripts, database setups, and Terraform layouts. Once compiled in your active workspace, you can download them directly as raw files."
    },
    {
      q: "Are my ideas safe and private?",
      a: "Entirely. We utilize zero-data-retention endpoints with OpenAI. None of your startup ideas, market outputs, or metrics are used to train future model versions. All files are encrypted in your workspace."
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#f8fafc] bg-grid-pattern text-slate-800 flex flex-col justify-between overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Background soft ambient design */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-500/5 blur-[120px] pointer-events-none z-0" />

      {/* Floating navigation header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6 py-4.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-slate-900">
              cofounder<span className="text-slate-400">.ai</span>
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <a href="#simulator" className="hover:text-indigo-600 transition-colors">Sandbox Demo</a>
            <a href="#swarm" className="hover:text-indigo-650 transition-colors">Swarm Pillars</a>
            <a href="#workspace" className="hover:text-indigo-650 transition-colors">Dashboard Widgets</a>
            <a href="#faq" className="hover:text-indigo-650 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wider px-2 py-2">
              Sign In
            </Link>
            <Link href="/register" className="text-xs font-bold bg-slate-900 hover:bg-slate-850 text-white px-4.5 py-2.5 rounded-xl transition-all shadow-sm">
              Start Workspace
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-grow">
        
        {/* Simple & Dynamic Hero Section */}
        <section className="max-w-6xl mx-auto px-6 pt-24 pb-12 text-center relative">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-250 text-slate-600 text-xs font-semibold mb-6">
            Validate ideas instantly using 11 orchestrated AI agents
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl leading-[1.14] mb-6 text-slate-900 mx-auto">
            Evaluate Startup Concepts <br />
            <span className="text-indigo-600">Before Writing Code</span>
          </h1>

          <p className="text-sm md:text-base text-slate-500 max-w-2xl leading-relaxed mb-8 mx-auto font-normal">
            Input a concept below. Our autonomous agent swarms will crawl competitor niches, generate software stack mappings, and project break-even models.
          </p>

          {/* Eye-catching Hero Input Box */}
          <form onSubmit={handleLaunchValidation} className="max-w-2xl mx-auto mb-6 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10">
            <input
              type="text"
              required
              value={typedIdea}
              onChange={(e) => setTypedIdea(e.target.value)}
              placeholder="e.g. B2B scheduling software for boutique dog walking agencies..."
              className="flex-1 bg-transparent px-3 py-2.5 text-xs text-slate-850 focus:outline-none placeholder-slate-400 font-medium"
            />
            <button
              type="submit"
              disabled={isSimulating}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4.5 py-3 rounded-lg transition-all whitespace-nowrap shadow-sm disabled:opacity-60"
            >
              {isSimulating ? "Running Swarm..." : "Validate Idea"}
            </button>
          </form>

          {/* Preset templates selector */}
          <div className="flex flex-wrap gap-2.5 justify-center items-center text-xs">
            <span className="text-slate-400 font-medium">Or select a blueprint:</span>
            {PRESETS.map((preset, pIdx) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleSelectPreset(pIdx)}
                className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                  selectedIdeaIdx === pIdx
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold"
                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </section>

        {/* Refened Sandbox Console Container */}
        <section id="simulator" ref={simulatorRef} className="max-w-6xl mx-auto px-6 py-12 scroll-mt-24">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm grid grid-cols-1 lg:grid-cols-12">
            
            {/* Left: Terminal Output (5 cols) in clean light mode */}
            <div className="lg:col-span-5 bg-slate-50 p-6 flex flex-col justify-between min-h-[300px] border-b lg:border-b-0 lg:border-r border-slate-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">swarm_runner.log</span>
                </div>
                
                <div className="space-y-2 font-mono text-[10.5px] text-slate-650 h-56 overflow-y-auto">
                  {simLogs.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-10">
                      <p>Console ready. Click &quot;Validate Idea&quot; to inspect progress logs.</p>
                    </div>
                  )}
                  {simLogs.map((log, index) => (
                    <p
                      key={index}
                      className={`leading-relaxed ${
                        log.includes("complete") || log.includes("PASS") ? "text-emerald-700 font-semibold" : "text-slate-600"
                      }`}
                    >
                      &gt; {log}
                    </p>
                  ))}
                  {isSimulating && (
                    <div className="flex items-center gap-1 text-indigo-600 animate-pulse font-bold">
                      <span>&gt;</span>
                      <span>Executing Graph Nodes...</span>
                    </div>
                  )}
                  <div ref={consoleBottomRef} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                <span>Task: {isSimulating ? "RUNNING" : "IDLE"}</span>
                <span>Swarm ID: LG-0x4c2</span>
              </div>
            </div>

            {/* Right: Premium Light-themed Report Summary (7 cols) */}
            <div className="lg:col-span-7 p-6 bg-white flex flex-col justify-between min-h-[300px]">
              
              {!simulationComplete && !isSimulating ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-400 py-16">
                  <h3 className="font-bold text-sm text-slate-700">Audit report pending</h3>
                  <p className="text-xs text-slate-450 mt-1 max-w-xs">Run validation to compile metrics.</p>
                </div>
              ) : isSimulating ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-400 py-16">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
                  <h3 className="font-bold text-xs text-slate-700">Evaluating concept...</h3>
                  <p className="text-xs text-slate-450 mt-1">Collecting telemetry outputs from 11 specialized agent scripts.</p>
                </div>
              ) : (
                <div className="flex-grow flex flex-col justify-between">
                  <div>
                    {/* Header Details */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-4">
                      <div>
                        <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-150 px-2 py-0.5 rounded uppercase tracking-wider">
                          Summary Report
                        </span>
                        <h3 className="font-bold text-slate-900 text-base mt-1.5 truncate">
                          {currentIdea.name}
                        </h3>
                      </div>
                      
                      {/* Tab Navigation */}
                      <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 max-w-fit">
                        {["market", "tech", "finance", "pitch"].map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveReportTab(tab)}
                            className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase transition-all ${
                              activeReportTab === tab
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Report Output Box */}
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 min-h-[190px]">
                      {activeReportTab === "market" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 bg-white rounded-lg border border-slate-100">
                              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">TAM Volume</span>
                              <div className="text-sm font-bold text-slate-800 mt-0.5">{currentIdeaReports.market.tam}</div>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-slate-100">
                              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Key Competitor</span>
                              <div className="text-xs font-bold text-slate-700 mt-0.5 truncate">{currentIdeaReports.market.competitors.split(",")[0]}</div>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-slate-100">
                              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Viability Score</span>
                              <div className="text-sm font-bold text-indigo-650 mt-0.5">{currentIdeaReports.market.score}%</div>
                            </div>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Audit Rationale</span>
                            <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-lg border border-slate-100">
                              {currentIdeaReports.market.recommendation}
                            </p>
                          </div>
                        </div>
                      )}

                      {activeReportTab === "tech" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white rounded-lg border border-slate-100">
                              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Architecture</span>
                              <p className="text-xs font-mono text-slate-700 leading-relaxed">{currentIdeaReports.tech.stack}</p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-slate-100">
                              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Hosting setup</span>
                              <p className="text-xs font-mono text-slate-700 leading-relaxed">{currentIdeaReports.tech.infra}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg text-xs font-semibold">
                            <span className="text-slate-500">Infrastructure cloud costs</span>
                            <span className="text-slate-900 font-bold">{currentIdeaReports.tech.cost}</span>
                          </div>
                        </div>
                      )}

                      {activeReportTab === "finance" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white rounded-lg border border-slate-100">
                              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Year 1 Net Target</span>
                              <div className="text-sm font-bold text-slate-900 mt-0.5">{currentIdeaReports.finance.yr1}</div>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-slate-100">
                              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Year 2 Revenue</span>
                              <div className="text-sm font-bold text-slate-800 mt-0.5">{currentIdeaReports.finance.yr2}</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg text-xs font-semibold">
                            <span className="text-slate-500">Break-Even Threshold (MRR)</span>
                            <span className="text-indigo-600 font-bold">{currentIdeaReports.finance.breakeven}</span>
                          </div>
                        </div>
                      )}

                      {activeReportTab === "pitch" && (
                        <div className="space-y-3">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pitch Outline Slides</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {currentIdeaReports.slides.map((slide, sIdx) => (
                              <div key={sIdx} className="p-3 bg-white border border-slate-100 rounded-lg flex flex-col justify-between min-h-[90px]">
                                <div className="text-[9px] font-bold text-indigo-650 uppercase">Slide {sIdx + 1}: {slide.title}</div>
                                <p className="text-[10px] text-slate-500 leading-normal mt-1">{slide.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-450">Validate code structures and download models.</span>
                    <Link href="/register" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                      Configure Workspace →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Validation Swarm Pillars */}
        <section id="swarm" className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-200/80 scroll-mt-24">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mb-2">
              Validation Swarm Phases
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-xs">
              Agent coordination occurs step-by-step across 4 validation pillars. Select a stage to view metrics.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left: 4 horizontal tracks */}
            <div className="lg:col-span-6 space-y-3 flex flex-col justify-between">
              {SWARM_PHASES.map((phase, pIdx) => {
                const isActive = activePhaseIdx === pIdx;
                return (
                  <button
                    key={phase.id}
                    onClick={() => setActivePhaseIdx(pIdx)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      isActive
                        ? "bg-white border-slate-350 shadow-sm text-slate-950"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold bg-slate-100 text-slate-650 px-2 py-1 rounded">
                        {phase.num}
                      </span>
                      <div>
                        <h3 className="font-bold text-xs text-slate-950">{phase.title}</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">{phase.agents}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: Active Phase Details */}
            <div className="lg:col-span-6">
              <div className="bg-white p-7 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full min-h-[300px]">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <span className="text-xs font-mono font-bold bg-slate-900 text-white px-2 py-1 rounded">
                      {SWARM_PHASES[activePhaseIdx].num}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900">{SWARM_PHASES[activePhaseIdx].title}</h3>
                  </div>

                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Process Execution</span>
                    <p className="text-xs text-slate-600 leading-relaxed">{SWARM_PHASES[activePhaseIdx].details}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Swarm Agents</span>
                  <div className="flex flex-wrap gap-1">
                    {SWARM_PHASES[activePhaseIdx].agents.split(", ").map((agent) => (
                      <span key={agent} className="text-[10px] bg-slate-50 border border-slate-150 text-slate-600 px-2.5 py-1 rounded">
                        {agent}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Workspace Feature Overview Sections with Tabs */}
        <section id="workspace" className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-200/80 scroll-mt-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: Info details */}
            <div className="lg:col-span-5 space-y-5">
              <span className="text-xs font-bold text-indigo-650 uppercase tracking-widest block">Platform Widgets</span>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                Review Artifacts Live
              </h2>
              <p className="text-slate-500 leading-relaxed text-xs">
                Each validator output maps into a clean dashboard container. Adjust targets, simulate user volume levels, and export models instantly.
              </p>

              <div className="space-y-2">
                {[
                  { id: "market-intel", title: "Market Niche & Competitor Intel", desc: "Maps competitor domains and searches positioning gaps." },
                  { id: "tech-arch", title: "Technical Stack Architecture", desc: "Compiles system layers, DB schemas, and cloud deployment scripts." },
                  { id: "finance-model", title: "Financial Projection Modeler", desc: "Interactive MRR forecast tools with active slider calculations." }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFeatureTab(f.id)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-all ${
                      activeFeatureTab === f.id
                        ? "bg-white border-slate-350 text-slate-950 shadow-sm"
                        : "bg-transparent border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <h3 className="font-bold text-xs">{f.title}</h3>
                    {activeFeatureTab === f.id && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{f.desc}</p>}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Premium Interactive Mockup Dashboard (7 cols) */}
            <div className="lg:col-span-7">
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm p-6 relative">
                
                {/* Active Tab Screen: Market Intel */}
                {activeFeatureTab === "market-intel" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="text-xs font-bold text-slate-500 font-mono">market_intelligence_schema</h4>
                      <span className="text-[9px] bg-slate-100 text-slate-650 px-2 py-0.5 rounded border border-slate-200 font-bold uppercase">Passed</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Competitors Index</span>
                        <span className="text-lg font-bold text-slate-800 mt-1 block">14 Domains</span>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Niche Gaps</span>
                        <span className="text-lg font-bold text-indigo-650 mt-1 block">82% Gap</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-1.5">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Scraper Logs</span>
                      <div className="space-y-1 text-[10px] font-mono text-slate-500">
                        <p className="text-indigo-650">✓ Checked competitor pricing models</p>
                        <p className="text-indigo-650">✓ Identified gap: lack of customizable edge configurations</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Active Tab Screen: Tech Arch */}
                {activeFeatureTab === "tech-arch" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="text-xs font-bold text-slate-500 font-mono">system_layout_blueprints</h4>
                      <span className="text-[9px] bg-slate-100 text-slate-650 px-2 py-0.5 rounded border border-slate-200 font-bold uppercase">Ready</span>
                    </div>

                    <div className="space-y-2">
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <h5 className="text-xs font-bold text-slate-800">Frontend Presentation Layer</h5>
                            <p className="text-[9px] text-slate-450">Next.js App Router + Tailwind CSS</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono bg-slate-200/60 text-slate-650 px-2 py-0.5 rounded">Vercel</span>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <h5 className="text-xs font-bold text-slate-800">Stateful Graph Runner</h5>
                            <p className="text-[9px] text-slate-450">FastAPI + LangGraph + Uvicorn</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono bg-slate-200/60 text-slate-655 px-2 py-0.5 rounded">ECS Fargate</span>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <h5 className="text-xs font-bold text-slate-800">Databases & RAG Nodes</h5>
                            <p className="text-[9px] text-slate-450">Qdrant Vector DB + PostgreSQL</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono bg-slate-200/60 text-slate-650 px-2 py-0.5 rounded">RDS Serverless</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Active Tab Screen: Finance Model */}
                {activeFeatureTab === "finance-model" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="text-xs font-bold text-slate-500 font-mono">finance_modelling_matrix</h4>
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-150 font-bold uppercase">Dynamic</span>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Paying Clients Count:</span>
                        <span className="text-slate-800 font-bold">{sliderClients} clients</span>
                      </div>
                      
                      {/* Interactive Slider Input */}
                      <input
                        type="range"
                        min="5"
                        max="200"
                        value={sliderClients}
                        onChange={(e) => setSliderClients(Number(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                          <span className="text-[9px] text-slate-400 block font-bold uppercase">MRR target</span>
                          <span className="text-sm font-bold text-slate-800">${(sliderClients * 500).toLocaleString()}</span>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                          <span className="text-[9px] text-slate-400 block font-bold uppercase">Annualized ARR</span>
                          <span className="text-sm font-bold text-indigo-650">${(sliderClients * 500 * 12).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof / Live Activity Ticker */}
        <section className="bg-white border-y border-slate-200 py-6 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Validator Swarm Feed</h3>
              <p className="text-[11px] text-slate-450 mt-0.5">Live activities logged from active client workspaces.</p>
            </div>
            
            <div className="flex flex-wrap gap-4 items-center">
              {[
                { name: "LegalDoc AI", ind: "B2B SaaS", score: "92%", cost: "$450/mo" },
                { name: "MediSchedule", ind: "HealthTech", score: "88%", cost: "$1,200/mo" },
                { name: "EduFlash Card", ind: "EdTech", score: "79%", cost: "$80/mo" }
              ].map((item, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 border border-slate-150 rounded-lg flex items-center gap-3 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <div>
                    <div className="font-bold text-slate-800">{item.name} <span className="font-normal text-slate-400">({item.ind})</span></div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Validation: <span className="text-indigo-600 font-bold">{item.score}</span> | Host: <span className="text-slate-700 font-bold">{item.cost}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="max-w-4xl mx-auto px-6 py-20 scroll-mt-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mb-2">
              Platform FAQ
            </h2>
            <p className="text-slate-500 text-xs">
              Answers regarding models, metrics, data privacy, and pipelines.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between text-slate-800 font-bold hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-xs font-semibold">{faq.q}</span>
                    <span className="text-slate-400 text-[10px]">
                      {isOpen ? "Hide" : "Show"}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-500 leading-relaxed font-normal">{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* Sleek Enterprise Trust Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-950 text-base">cofounder.ai</span>
            </div>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Stateful LLM multi-agent workspace engine. Crawl competitors, formulate tech blueprints, and compile financial plans instantly.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Swarm Engine</h4>
            <div className="flex flex-col gap-2 text-xs text-slate-500">
              <span className="hover:text-slate-900 cursor-pointer">LangGraph Pipeline Config</span>
              <span className="hover:text-slate-900 cursor-pointer">Qdrant RAG Details</span>
              <span className="hover:text-slate-900 cursor-pointer">Compliance Matrix</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Workspace Security</h4>
            <div className="flex flex-col gap-2 text-xs text-slate-500">
              <span className="hover:text-slate-900 cursor-pointer">Zero Data Retention</span>
              <span className="hover:text-slate-900 cursor-pointer">API Keys Encrypting</span>
              <span className="hover:text-slate-900 cursor-pointer">Workspace Terms</span>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-6 border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between text-slate-400 text-xs gap-4">
          <span>&copy; 2026 AI Startup Co-Founder Inc. All rights reserved.</span>
          <div className="flex gap-5">
            <span className="hover:text-slate-900 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-900 cursor-pointer">Privacy Protocol</span>
            <span className="hover:text-slate-900 cursor-pointer">Status</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

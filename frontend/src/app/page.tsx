"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

// Preset ideas for the landing page interactive simulation sandbox
const PRESET_IDEAS = [
  {
    name: "AI Pizza Delivery Drone",
    industry: "Logistics / FoodTech",
    desc: "Autonomous drone delivery fleet targeting urban pizza franchises with heated compartments and AI route optimization.",
    reports: {
      market: { tam: "$12.4B", competitors: "Starship, Wing, Domino's Custom", score: "78%", recommendation: "Moderate risk. High hardware capex, strong localized demand." },
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
      market: { tam: "$480M", competitors: "Rover, Wag!, generic calendar apps", score: "89%", recommendation: "Highly viable. Extremely low operating costs, fragmented customer base." },
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
      market: { tam: "$2.1B", competitors: "DocuSign Analyzer, LawGeex", score: "94%", recommendation: "Strong demand. High transaction value, clear cost savings for law firms." },
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

// 11 Specialized AI Agents Definition
const AGENTS_LIST = [
  {
    id: "lead",
    name: "Lead Coordinator",
    role: "Orchestrator",
    emoji: "👑",
    color: "from-purple-500 to-indigo-500",
    desc: "Manages state transitions in the LangGraph chain, reviews outputs from child agents, and flags conflicts.",
    tools: ["LangGraph State Engine", "OpenAI GPT-4o"],
    deliverable: "Global Workspace JSON Schema"
  },
  {
    id: "market",
    name: "Market Researcher",
    role: "Demand Profiler",
    emoji: "🔍",
    color: "from-blue-500 to-cyan-500",
    desc: "Calculates total addressable market size (TAM/SAM/SOM) based on localized business registry databases.",
    tools: ["Google Search API", "Custom Census Scraper"],
    deliverable: "Market Size Estimates & Metrics"
  },
  {
    id: "competitor",
    name: "Competitor Crawler",
    role: "Intel Gatherer",
    emoji: "🕷️",
    color: "from-cyan-500 to-teal-500",
    desc: "Crawls live landing pages of alternative services, extracts feature matrices, and highlights marketing gaps.",
    tools: ["Firecrawl", "Qdrant Vector Index"],
    deliverable: "Competitor Positioning Matrix"
  },
  {
    id: "architect",
    name: "Lead Architect",
    role: "System Designer",
    emoji: "🛠️",
    color: "from-pink-500 to-rose-500",
    desc: "Recommends technology stacks, structural layout, database schemas, and designs the Docker compose cluster architecture.",
    tools: ["Qdrant Knowledge Base", "Terraform generator"],
    deliverable: "Technical Architecture Markdown Map"
  },
  {
    id: "estimator",
    name: "Cost Estimator",
    role: "Cloud Accountant",
    emoji: "⚙️",
    color: "from-amber-500 to-orange-500",
    desc: "Calculates cloud resource, bandwidth, API inference, and database pricing tiers based on user scaling load assumptions.",
    tools: ["AWS Pricing API", "HuggingFace Cost Models"],
    deliverable: "Infrastructure Line-Item Costing"
  },
  {
    id: "forecaster",
    name: "Financial Forecaster",
    role: "Revenue Analyst",
    emoji: "📊",
    color: "from-emerald-500 to-teal-500",
    desc: "Simulates revenue lines (SaaS subscriptions, transaction cut, license sales) across Year 1 and Year 2.",
    tools: ["Financial Modeling Engine", "Monte Carlo Simulator"],
    deliverable: "Year 1 & Year 2 Income Forecast"
  },
  {
    id: "breakeven",
    name: "Break-Even Modeler",
    role: "Risk & Burn Assessor",
    emoji: "📈",
    color: "from-red-500 to-orange-500",
    desc: "Identifies required MRR targets, runway survival in months, and baseline pricing targets to break even.",
    tools: ["Burn Calculations Engine"],
    deliverable: "Break-Even MRR Target & Timeline Chart"
  },
  {
    id: "risk",
    name: "Risk Analyst",
    role: "Compliance & Safety",
    emoji: "⚠️",
    color: "from-rose-500 to-red-500",
    desc: "Audits plan for regulatory pitfalls, compliance hurdles (GDPR/HIPAA/SEC), and cybersecurity vulnerabilities.",
    tools: ["SEC/GDPR Database Lookup", "RAG Rationale Engine"],
    deliverable: "Risk Assessment & Mitigation Matrix"
  },
  {
    id: "marketer",
    name: "Growth Marketer",
    role: "Distribution Architect",
    emoji: "🚀",
    color: "from-fuchsia-500 to-pink-500",
    desc: "Formulates GTM (Go-to-Market) strategies, cold outreach sequences, paid acquisition hooks, and SEO playbooks.",
    tools: ["SERP Trends Engine", "LLM Hook Generator"],
    deliverable: "Go-to-Market Strategy Document"
  },
  {
    id: "pitch",
    name: "Pitch Designer",
    role: "Storyteller",
    emoji: "🎴",
    color: "from-violet-500 to-purple-500",
    desc: "Compiles validation outputs into a structural slides outline tailored to venture seed parameters.",
    tools: ["Pitch Structure Schema", "Deck Optimizer"],
    deliverable: "10-Slide Investor Outline"
  },
  {
    id: "sla",
    name: "SLA Auditor",
    role: "Quality Assurance",
    emoji: "⚖️",
    color: "from-zinc-500 to-slate-500",
    desc: "Validates system outputs against quality guidelines. Reruns agent validation loops if facts or calculations don't align.",
    tools: ["Fact-checking RAG", "Mathematical Parser"],
    deliverable: "Compliance Audit Pass Certification"
  }
];

export default function Home() {
  // Simulator State
  const [selectedIdeaIdx, setSelectedIdeaIdx] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState("market");
  
  // Custom interactive mock slider for financial projections
  const [sliderCustomers, setSliderCustomers] = useState(25);
  const [activeFeatureTab, setActiveFeatureTab] = useState("market-intel");
  const [activeAgent, setActiveAgent] = useState<typeof AGENTS_LIST[0]>(AGENTS_LIST[0]);
  
  // Expandable FAQ State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Auto-scroll logic for simulation logs console
  const consoleBottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [simLogs, isSimulating]);

  // Selected Idea Object
  const currentIdea = PRESET_IDEAS[selectedIdeaIdx];

  // Run Simulation Simulation Loop
  const handleStartSimulation = () => {
    setIsSimulating(true);
    setSimulationComplete(false);
    setSimLogs([]);
    
    const logsTimeline = [
      { text: "🤖 Initializing 11-agent validator swarm for validation workspace...", delay: 600 },
      { text: "⚡ [LangGraph] Thread initialized. Routing to Market Researcher...", delay: 1200 },
      { text: "🔍 [Market Researcher] Estimating target industry volume... Calculating TAM...", delay: 2000 },
      { text: `🔍 [Market Researcher] Calculated TAM: ${currentIdea.reports.market.tam}. Sector: ${currentIdea.industry}.`, delay: 2800 },
      { text: "🕷️ [Competitor Crawler] Fetching competitive entities from Qdrant vectors...", delay: 3500 },
      { text: `🕷️ [Competitor Crawler] Found key rivals: ${currentIdea.reports.market.competitors}. Extracted positioning roadmap gaps.`, delay: 4200 },
      { text: "🛠️ [Lead Architect] Designing infrastructure layout and node topology...", delay: 5000 },
      { text: `🛠️ [Lead Architect] Technical Stack chosen: ${currentIdea.reports.tech.stack}. Designing databases.`, delay: 5800 },
      { text: "⚙️ [Cost Estimator] Pricing compute and monthly API rates...", delay: 6500 },
      { text: `⚙️ [Cost Estimator] Baseline hosting projection: ${currentIdea.reports.tech.cost} using scalable clusters.`, delay: 7200 },
      { text: "📊 [Financial Forecaster] Simulating revenue lines... running Monte Carlo model...", delay: 8000 },
      { text: `📊 [Financial Forecaster] Projected revenues: Yr 1: ${currentIdea.reports.finance.yr1}, Yr 2: ${currentIdea.reports.finance.yr2}.`, delay: 8800 },
      { text: "📈 [Break-Even Modeler] Calculating MRR breakeven threshold...", delay: 9500 },
      { text: `📈 [Break-Even Modeler] Break-even target calculated at ${currentIdea.reports.finance.breakeven}.`, delay: 10200 },
      { text: "🎴 [Pitch Designer] Organizing slide outlines for investors...", delay: 11000 },
      { text: "⚖️ [SLA Auditor] Validating logical formulas, pricing math, and safety regulations...", delay: 11800 },
      { text: "✅ [SLA Auditor] Audit PASS. Compiling results, writing artifacts to workspace database...", delay: 12500 },
    ];

    logsTimeline.forEach((item, index) => {
      setTimeout(() => {
        setSimLogs(prev => [...prev, item.text]);
        if (index === logsTimeline.length - 1) {
          setTimeout(() => {
            setIsSimulating(false);
            setSimulationComplete(true);
          }, 600);
        }
      }, item.delay);
    });
  };

  const handleSelectIdea = (idx: number) => {
    if (isSimulating) return;
    setSelectedIdeaIdx(idx);
    setSimulationComplete(false);
  };

  const currentIdeaReports = currentIdea.reports;

  const faqs = [
    {
      q: "What actually happens behind the scenes when I validate an idea?",
      a: "Our core engine runs an autonomous multi-agent chain implemented using LangGraph. Each of the 11 specialized agents executes in a stateful sandbox. They perform web searches, write architecture designs, pull cloud service pricing databases, solve financial balance sheets, and cross-examine each other's outputs. The SLA Auditor verifies all outputs to prevent hallucinations before generating reports."
    },
    {
      q: "Can I deploy the generated technical architectures directly?",
      a: "Yes. The Lead Architect agent compiles standard Docker Compose files, database schemas (PostgreSQL / Qdrant), and infrastructure-as-code configuration scripts (Terraform/Pulumi templates) based on the generated architecture specs, which you can download directly from the project workspace."
    },
    {
      q: "How accurate are the market research and financial estimations?",
      a: "The calculations leverage live web crawlers, census reports, and active cloud provider APIs (like AWS/GCP pricing). The financial model utilizes real industry standard baselines (MRR SaaS averages, cloud compute profiles). However, these are designed to serve as high-fidelity validation scaffolds, not as a replacement for human legal or financial council."
    },
    {
      q: "Is my idea private? Does the AI train on my inputs?",
      a: "Absolutely. We enforce a zero-data-retention policy with LLM providers. Your startup ideas, project parameters, and agent outputs are encrypted end-to-end and stored securely in your private workspace. We never train models on your proprietary startup data."
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#070709] bg-grid-pattern text-zinc-100 flex flex-col justify-between overflow-x-hidden selection:bg-purple-600/30 selection:text-purple-200">
      
      {/* Background ambient glowing nodes */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-purple-900/10 blur-[150px] animate-pulse-glow z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-pink-900/10 blur-[130px] animate-pulse-glow z-0" />
      <div className="absolute top-1/2 left-[-10%] w-[300px] h-[300px] rounded-full bg-blue-900/5 blur-[100px] z-0" />

      {/* Floating navigation header */}
      <header className="sticky top-0 z-40 w-full bg-[#070709]/80 backdrop-blur-md border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-rose-400 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20">
              co
            </div>
            <span className="font-bold text-xl tracking-tight text-white flex items-center gap-1.5">
              cofounder<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">.ai</span>
              <span className="text-[10px] uppercase font-semibold bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">v2.0</span>
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#simulator" className="hover:text-white transition-colors">Interactive Demo</a>
            <a href="#agents" className="hover:text-white transition-colors">Specialized Swarm</a>
            <a href="#features" className="hover:text-white transition-colors">Workspace Features</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors px-3 py-2">
              Sign In
            </Link>
            <Link href="/register" className="relative group overflow-hidden text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-600/25 hover:shadow-purple-600/35 hover:scale-[1.03]">
              <span className="relative z-10">Start Free Workspace</span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-pink-500 to-purple-600 transition-transform duration-300" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-grow">
        
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-semibold mb-8 animate-float">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
            ⚡ Enterprise Multi-Agent LangGraph Engine
          </div>

          <h1 className="text-5xl md:text-8xl font-black tracking-tight max-w-5xl leading-[1.08] mb-8 text-white mx-auto">
            Your Autonomous Virtual <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-rose-400">
              Startup Co-Founder
            </span>
          </h1>

          <p className="text-lg md:text-2xl text-zinc-400 max-w-3xl leading-relaxed mb-12 mx-auto font-light">
            Validate concepts, draft robust tech architectures, build custom financial sheets, and create investor decks in minutes with a synchronized network of 11 AI Agents.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center mb-24 max-w-md mx-auto">
            <Link href="/register" className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-4.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-2xl text-lg transition-all shadow-2xl shadow-purple-500/25 hover:scale-[1.02] hover:-translate-y-0.5">
              Launch Workspace
            </Link>
            <a href="#simulator" className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-4.5 bg-zinc-950/80 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white font-semibold rounded-2xl text-lg transition-all backdrop-blur-sm">
              Simulate Validation
            </a>
          </div>
        </section>

        {/* Interactive Demo Simulator Sandbox */}
        <section id="simulator" className="max-w-6xl mx-auto px-6 py-12 scroll-mt-24">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
              Test Drive the AI Swarm
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto text-base">
              Select one of our blueprint startup ideas below, then trigger the validator to watch the agents execute the LangGraph chain in real time.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Input Selection (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">Choose a Startup Concept</span>
              <div className="space-y-3">
                {PRESET_IDEAS.map((idea, idx) => (
                  <button
                    key={idea.name}
                    disabled={isSimulating}
                    onClick={() => handleSelectIdea(idx)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      selectedIdeaIdx === idx
                        ? "bg-purple-950/20 border-purple-500/40 shadow-lg shadow-purple-500/5 text-white"
                        : "bg-zinc-950/40 border-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedIdeaIdx === idx 
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" 
                          : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                      }`}>
                        {idea.industry}
                      </span>
                      {selectedIdeaIdx === idx && <span className="text-purple-400 text-xs font-bold">● Active</span>}
                    </div>
                    <h3 className="font-bold text-sm text-zinc-100">{idea.name}</h3>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{idea.desc}</p>
                  </button>
                ))}
              </div>

              <div className="p-5 rounded-2xl bg-zinc-950/40 border border-zinc-900">
                <h4 className="text-xs font-bold text-zinc-400 mb-2">💡 Want Custom Scenarios?</h4>
                <p className="text-xs text-zinc-500 leading-relaxed mb-4">
                  Full custom idea entries require live search keys and a vector catalog space. Create a free account to enter any concept you desire.
                </p>
                <Link href="/register" className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1">
                  Create Account to Customize →
                </Link>
              </div>
            </div>

            {/* Right: Console & Visual Output (8 cols) */}
            <div className="lg:col-span-8">
              <div className="rounded-3xl border border-zinc-850 bg-zinc-950/80 overflow-hidden shadow-2xl relative">
                
                {/* Console Header */}
                <div className="px-6 py-4 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <span className="text-xs font-mono text-zinc-500 ml-2">langgraph-engine-runner.js</span>
                  </div>
                  {!isSimulating && !simulationComplete && (
                    <button
                      onClick={handleStartSimulation}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-purple-600/20"
                    >
                      🚀 Launch Swarm Validator
                    </button>
                  )}
                  {isSimulating && (
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
                      Swarm Executing...
                    </div>
                  )}
                  {simulationComplete && (
                    <button
                      onClick={handleStartSimulation}
                      className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
                    >
                      🔄 Re-Run Simulation
                    </button>
                  )}
                </div>

                {/* Console Log Stream */}
                <div className="p-6 bg-[#09090b] font-mono text-xs text-zinc-300 h-64 overflow-y-auto relative console-scanline flex flex-col justify-start">
                  
                  {simLogs.length === 0 && (
                    <div className="flex-grow flex flex-col items-center justify-center text-center text-zinc-500 py-10">
                      <div className="text-3xl mb-3">🖥️</div>
                      <p className="font-mono text-zinc-400">Swarm console idle. Select a startup idea and run the simulation.</p>
                      <button
                        onClick={handleStartSimulation}
                        className="mt-4 border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-purple-400 text-xs px-4 py-2 rounded-xl font-mono transition-all"
                      >
                        Run validation_swarm.sh
                      </button>
                    </div>
                  )}

                  {simLogs.map((log, index) => (
                    <div
                      key={index}
                      className={`py-1.5 border-b border-zinc-900/30 last:border-b-0 leading-relaxed ${
                        log.includes("✅")
                          ? "text-emerald-400 font-bold"
                          : log.includes("⚡") || log.includes("🤖")
                          ? "text-purple-300"
                          : "text-zinc-300"
                      }`}
                    >
                      <span className="text-zinc-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                      {log}
                    </div>
                  ))}
                  
                  {isSimulating && (
                    <div className="py-2 flex items-center gap-1.5 text-purple-400">
                      <span className="font-bold animate-pulse">&gt;</span>
                      <span className="animate-pulse">Agent thinking... updating shared graph state</span>
                    </div>
                  )}
                  
                  <div ref={consoleBottomRef} />
                </div>

                {/* Visual Report Output (Fades in on Complete) */}
                {simulationComplete && (
                  <div className="border-t border-zinc-900 bg-zinc-950 p-6 transition-all duration-500 animate-gradient-bg">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <span className="text-[10px] font-bold bg-green-500/10 text-emerald-400 border border-green-500/25 px-2.5 py-1 rounded-full">
                          ✓ Artifacts Compiled
                        </span>
                        <h3 className="font-extrabold text-white text-lg mt-2">
                          Simulation Results: {currentIdea.name}
                        </h3>
                      </div>
                      
                      {/* Report Tabs Headers */}
                      <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                        {["market", "tech", "finance", "pitch"].map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveReportTab(tab)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                              activeReportTab === tab
                                ? "bg-purple-600 text-white shadow"
                                : "text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tab Details */}
                    <div className="bg-[#09090b] rounded-2xl border border-zinc-900 p-6 min-h-[200px] flex flex-col justify-between">
                      {activeReportTab === "market" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900">
                              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Estimated TAM</span>
                              <div className="text-xl font-extrabold text-white mt-1">{currentIdeaReports.market.tam}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900">
                              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Identified Rivals</span>
                              <div className="text-sm font-bold text-zinc-300 mt-1 truncate">{currentIdeaReports.market.competitors}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900">
                              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Validation Score</span>
                              <div className="text-xl font-extrabold text-purple-400 mt-1">{currentIdeaReports.market.score}</div>
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-zinc-400 block mb-1">RAG Recommendation Rationale</span>
                            <p className="text-xs text-zinc-400 leading-relaxed bg-purple-950/10 p-3 rounded-lg border border-purple-500/10">
                              {currentIdeaReports.market.recommendation}
                            </p>
                          </div>
                        </div>
                      )}

                      {activeReportTab === "tech" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900">
                              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1.5">Stack Proposal</span>
                              <p className="text-xs font-mono text-zinc-300 leading-relaxed">{currentIdeaReports.tech.stack}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900">
                              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1.5">Hosting & Infrastructure</span>
                              <p className="text-xs font-mono text-zinc-300 leading-relaxed">{currentIdeaReports.tech.infra}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3.5 bg-zinc-950 border border-zinc-900 rounded-xl">
                            <span className="text-xs text-zinc-400 font-semibold">Estimated Monthly Cloud Costs</span>
                            <span className="text-sm font-extrabold text-pink-400">{currentIdeaReports.tech.cost} / mo</span>
                          </div>
                        </div>
                      )}

                      {activeReportTab === "finance" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900">
                              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Year 1 Net Target</span>
                              <div className="text-lg font-extrabold text-white mt-1">{currentIdeaReports.finance.yr1}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900">
                              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Year 2 Growth Target</span>
                              <div className="text-lg font-extrabold text-emerald-400 mt-1">{currentIdeaReports.finance.yr2}</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3.5 bg-zinc-950 border border-zinc-900 rounded-xl">
                            <span className="text-xs text-zinc-400 font-semibold">Survival Break-Even Threshold (MRR)</span>
                            <span className="text-sm font-extrabold text-purple-400">{currentIdeaReports.finance.breakeven}</span>
                          </div>
                        </div>
                      )}

                      {activeReportTab === "pitch" && (
                        <div className="space-y-3">
                          <span className="text-xs font-bold text-zinc-400 block mb-1">Generated Slide deck Skeleton</span>
                          <div className="grid grid-cols-3 gap-3">
                            {currentIdeaReports.slides.map((slide, sIdx) => (
                              <div key={sIdx} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col justify-between min-h-[90px]">
                                <div className="text-[10px] font-bold text-purple-400 uppercase">Slide {sIdx + 1}: {slide.title}</div>
                                <p className="text-[10px] text-zinc-500 leading-normal mt-1.5">{slide.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-zinc-900/60 flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Want to generate the code files & download slide decks?</span>
                        <Link href="/register" className="text-xs font-bold text-purple-400 hover:text-purple-300">
                          Configure workspace now →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* The 11 Specialized AI Agents Network Grid */}
        <section id="agents" className="max-w-7xl mx-auto px-6 py-20 border-t border-zinc-900 scroll-mt-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
              Meet Your Orchestrated AI Swarm
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto text-base">
              A multi-agent design running on LangGraph. Click on any of the 11 specialized roles to see what tools they run and their output.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left: Interactive Grid of 11 Nodes (8 cols) */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {AGENTS_LIST.map((agent) => {
                const isActive = activeAgent.id === agent.id;
                return (
                  <button
                    key={agent.id}
                    onClick={() => setActiveAgent(agent)}
                    className={`p-4 rounded-2xl border text-left transition-all hover:scale-[1.02] ${
                      isActive
                        ? "bg-purple-950/20 border-purple-500/50 shadow-lg shadow-purple-500/10 text-white"
                        : "bg-zinc-950/40 border-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-850"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{agent.emoji}</span>
                      <span className={`w-2 h-2 rounded-full ${isActive ? "bg-purple-400" : "bg-transparent"}`} />
                    </div>
                    <h3 className="font-bold text-xs text-zinc-200">{agent.name}</h3>
                    <p className="text-[10px] text-zinc-500 mt-1 uppercase font-semibold">{agent.role}</p>
                  </button>
                );
              })}
            </div>

            {/* Right: Active Agent Details Inspector (5 cols) */}
            <div className="lg:col-span-5">
              <div className="glass-panel p-8 rounded-3xl border border-zinc-800 shadow-2xl relative overflow-hidden flex flex-col justify-between h-full min-h-[350px]">
                
                {/* Visual accent glow corresponding to agent */}
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-purple-500/10 blur-xl pointer-events-none" />
                
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-3xl">
                      {activeAgent.emoji}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/25 px-2.5 py-0.5 rounded-full uppercase">
                        {activeAgent.role}
                      </span>
                      <h3 className="font-extrabold text-xl text-white mt-1.5">{activeAgent.name}</h3>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Primary Mandate</span>
                    <p className="text-sm text-zinc-300 leading-relaxed font-light">{activeAgent.desc}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Tool Stack Integrations</span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeAgent.tools.map((t) => (
                        <span key={t} className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-1 rounded-md">
                          🛠️ {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-zinc-900 flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Generates File Artifact</span>
                  <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center gap-2">
                    <span className="text-lg">📄</span>
                    <span className="text-xs font-mono text-zinc-300">{activeAgent.deliverable}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Workspace Feature Overview Sections with Tabs */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-zinc-900 scroll-mt-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: Info details (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-widest block">Dashboard Preview</span>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Enterprise Workspace Controls
              </h2>
              <p className="text-zinc-400 leading-relaxed font-light">
                Every project is divided into actionable dashboard widgets. Inspect the details compiled by the AI agents and export them to PDF, Markdown, or JSON.
              </p>

              <div className="space-y-2.5">
                {[
                  { id: "market-intel", title: "Market Niche & Competitor Intel", desc: "Estimates global demand volumes and highlights gaps in rival positions." },
                  { id: "tech-arch", title: "Technical Stack Architecture", desc: "Selects stack frameworks, designs schemas, and estimates compute costs." },
                  { id: "finance-model", title: "Financial Projection Modeling", desc: "Interactive MRR forecast logs and cash-flow break-even timelines." }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFeatureTab(f.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      activeFeatureTab === f.id
                        ? "bg-zinc-900 border-zinc-800 text-white"
                        : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <h3 className="font-bold text-sm">{f.title}</h3>
                    {activeFeatureTab === f.id && <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{f.desc}</p>}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Premium Interactive Mockup Dashboard (7 cols) */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-zinc-800 bg-[#09090b] overflow-hidden shadow-2xl p-6 relative">
                
                {/* Decorative glows */}
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[80px]" />
                
                {/* Active Tab Screen: Market Intel */}
                {activeFeatureTab === "market-intel" && (
                  <div className="space-y-5 animate-float">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <h4 className="text-xs font-bold text-zinc-400 font-mono">WORKSPACE_MARKET_INTELLIGENCE.json</h4>
                      <span className="text-[10px] bg-blue-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-blue-500/20 font-bold uppercase">RAG Crawl Ok</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl">
                        <span className="text-[10px] text-zinc-500 block font-bold uppercase tracking-wider">Indexed Competitors</span>
                        <span className="text-2xl font-extrabold text-white mt-1 block">14 Sites</span>
                        <p className="text-[10px] text-zinc-500 mt-1.5">Crawled with Firecrawl API</p>
                      </div>

                      <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl">
                        <span className="text-[10px] text-zinc-500 block font-bold uppercase tracking-wider">Unsatisfied Needs Gaps</span>
                        <span className="text-2xl font-extrabold text-purple-400 mt-1 block">82% Gaps</span>
                        <p className="text-[10px] text-zinc-500 mt-1.5">No direct API solutions found</p>
                      </div>
                    </div>

                    <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2">
                      <span className="text-[10px] text-zinc-500 block font-bold uppercase tracking-wider">Crawl Summary Logs</span>
                      <div className="space-y-1.5 text-[10px] font-mono text-zinc-400">
                        <p className="text-cyan-400">✓ Checked starship.xyz: target price model $1.99/delivery</p>
                        <p className="text-cyan-400">✓ Found gap in Domino&apos;s drone tech: limited to corporate nodes</p>
                        <p className="text-zinc-500">&gt; Compiled alternative marketing positioning rationale</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Active Tab Screen: Tech Arch */}
                {activeFeatureTab === "tech-arch" && (
                  <div className="space-y-5 animate-float">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <h4 className="text-xs font-bold text-zinc-400 font-mono">TECHNICAL_ARCHITECTURE_BLUEPRINT.md</h4>
                      <span className="text-[10px] bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded-full border border-pink-500/20 font-bold uppercase">Docker Compose v3</span>
                    </div>

                    <div className="space-y-3.5">
                      <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">💻</span>
                          <div>
                            <h5 className="text-xs font-bold text-white">Frontend Webapp Layer</h5>
                            <p className="text-[10px] text-zinc-500">Next.js App Router + Tailwind CSS</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono bg-zinc-900 text-zinc-400 px-2 py-1 rounded">Vercel Edge</span>
                      </div>

                      <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">⚙️</span>
                          <div>
                            <h5 className="text-xs font-bold text-white">Async Agentic Chains Backend</h5>
                            <p className="text-[10px] text-zinc-500">FastAPI + LangGraph + Uvicorn</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono bg-zinc-900 text-zinc-400 px-2 py-1 rounded">ECS Fargate</span>
                      </div>

                      <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">🗄️</span>
                          <div>
                            <h5 className="text-xs font-bold text-white">Databases & RAG Storage</h5>
                            <p className="text-[10px] text-zinc-500">Qdrant Vector DB + PostgreSQL Cache</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono bg-zinc-900 text-zinc-400 px-2 py-1 rounded">RDS Serverless</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Active Tab Screen: Finance Model */}
                {activeFeatureTab === "finance-model" && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <h4 className="text-xs font-bold text-zinc-400 font-mono">FINANCIAL_MODELER_INTERACTIVE.calc</h4>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/25 font-bold uppercase">Dynamic Slider</span>
                    </div>

                    <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl space-y-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Simulate Paying Clients:</span>
                        <span className="text-white font-bold">{sliderCustomers} enterprise clients</span>
                      </div>
                      
                      {/* Interactive Slider Input */}
                      <input
                        type="range"
                        min="5"
                        max="200"
                        value={sliderCustomers}
                        onChange={(e) => setSliderCustomers(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-850">
                          <span className="text-[10px] text-zinc-500 block">MRR (@ $500/mo base)</span>
                          <span className="text-lg font-bold text-white">${(sliderCustomers * 500).toLocaleString()}</span>
                        </div>
                        <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-850">
                          <span className="text-[10px] text-zinc-500 block">Annualized Run Rate</span>
                          <span className="text-lg font-bold text-purple-400">${(sliderCustomers * 500 * 12).toLocaleString()}</span>
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
        <section className="bg-zinc-950/40 border-y border-zinc-900 py-10 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-extrabold text-white text-md">Live Validation Ticker</h3>
              <p className="text-xs text-zinc-500">Real-time stats from sandbox workspaces across the platform.</p>
            </div>
            
            <div className="flex flex-wrap gap-4 items-center">
              {[
                { name: "LegalDoc AI", ind: "B2B SaaS", score: "92%", cost: "$450/mo" },
                { name: "MediSchedule", ind: "HealthTech", score: "88%", cost: "$1,200/mo" },
                { name: "EduFlash Card", ind: "EdTech", score: "79%", cost: "$80/mo" }
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-[#09090b] border border-zinc-850 rounded-xl flex items-center gap-3.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <div className="font-bold text-white">{item.name} <span className="font-normal text-zinc-500">({item.ind})</span></div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Score: <span className="text-purple-400 font-bold">{item.score}</span> | Hosting: <span className="text-pink-400 font-bold">{item.cost}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* modern FAQ Section */}
        <section id="faq" className="max-w-4xl mx-auto px-6 py-24 scroll-mt-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-zinc-400 text-base">
              Clear answers to queries about the swarm architecture and validation logic.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div key={idx} className="bg-zinc-950/40 border border-zinc-900 rounded-2xl overflow-hidden transition-all">
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full text-left px-6 py-5 flex items-center justify-between text-white font-bold hover:bg-zinc-900/30 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className={`text-zinc-500 text-lg transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                      ▼
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 pt-1 border-t border-zinc-900/30">
                      <p className="text-sm text-zinc-450 leading-relaxed font-light">{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* Sleek Enterprise Trust Footer */}
      <footer className="relative z-10 border-t border-zinc-900 bg-zinc-950/60 py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg">
                co
              </div>
              <span className="font-bold text-lg text-white">cofounder.ai</span>
            </div>
            <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
              An enterprise-grade validation engine running stateful LLM multi-agent graphs. Formulate plans, mock financial runways, and inspect competitive niches in seconds.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Core Engine</h4>
            <div className="flex flex-col gap-2.5 text-xs text-zinc-500">
              <span className="hover:text-zinc-300 cursor-pointer">LangGraph Swarm Configuration</span>
              <span className="hover:text-zinc-300 cursor-pointer">Qdrant RAG Pipelines</span>
              <span className="hover:text-zinc-300 cursor-pointer">Agent API Tiers</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Security & Compliance</h4>
            <div className="flex flex-col gap-2.5 text-xs text-zinc-500">
              <span className="hover:text-zinc-300 cursor-pointer">Zero Data Retention</span>
              <span className="hover:text-zinc-300 cursor-pointer">API Keys Security Protocol</span>
              <span className="hover:text-zinc-300 cursor-pointer">Workspace SLA Guarantees</span>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-6 border-t border-zinc-900/60 pt-6 flex flex-col sm:flex-row items-center justify-between text-zinc-500 text-xs gap-4">
          <span>&copy; 2026 AI Startup Co-Founder Inc. All rights reserved.</span>
          <div className="flex gap-6">
            <span className="hover:text-zinc-300 cursor-pointer">Terms of Service</span>
            <span className="hover:text-zinc-300 cursor-pointer">Privacy Protocol</span>
            <span className="hover:text-zinc-300 cursor-pointer">System Status</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

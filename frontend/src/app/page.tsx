import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-grid-pattern flex flex-col justify-between">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[150px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-900/10 blur-[150px]" />

      {/* Header Navigation */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20">
            co
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            cofounder.<span className="text-purple-400">ai</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link href="/register" className="text-sm font-medium bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-purple-500/20 hover:scale-[1.02]">
            Start Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-16 flex flex-col items-center justify-center text-center flex-grow">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-6 animate-pulse">
          ⚡ Powered by LangGraph & Qdrant RAG
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.15] mb-8">
          Your Virtual <span className="neon-text-gradient">Startup Co-Founder</span>
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed mb-10">
          An enterprise-grade multi-agent validation engine. Draft technical architectures, evaluate market size, prioritize roadmaps, and generate financial models in minutes.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20 w-full sm:w-auto">
          <Link href="/register" className="inline-flex justify-center items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl text-md transition-all shadow-xl shadow-purple-500/25 hover:scale-[1.02]">
            Launch Validation Workspaces
          </Link>
          <Link href="/login" className="inline-flex justify-center items-center px-8 py-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold rounded-xl text-md transition-all">
            Explore Demo Project
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <section className="w-full max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-12 text-white text-center">
            Orchestrated Network of 11 Specialized AI Agents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-8 rounded-2xl text-left">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 text-xl font-bold mb-6">
                🔍
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Market & Competitor Intel</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Estimates global TAM/SAM/SOM demand volumes and crawls positioning gaps of active competitive entities automatically.
              </p>
            </div>

            <div className="glass-card p-8 rounded-2xl text-left">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 text-xl font-bold mb-6">
                🛠️
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Technical Architecture</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Recommends modern development tech stacks, writes infrastructure layouts, and forecasts startup operating cost models.
              </p>
            </div>

            <div className="glass-card p-8 rounded-2xl text-left">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xl font-bold mb-6">
                📊
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Financial Forecasts</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Projects revenues and costs across Year 1 and Year 2. Calculates MRR targets required to hit cash flow break-even.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900 bg-zinc-950/60 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:row items-center justify-between text-zinc-500 text-xs gap-4 text-center">
          <span>&copy; 2026 AI Startup Co-Founder Inc. All rights reserved.</span>
          <div className="flex gap-6">
            <span className="hover:text-zinc-300 cursor-pointer">Security Protocol</span>
            <span className="hover:text-zinc-300 cursor-pointer">API Keys Terms</span>
            <span className="hover:text-zinc-300 cursor-pointer">SLA Details</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

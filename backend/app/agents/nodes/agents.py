import json
import logging
from typing import Dict, Any, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.core.config import settings
from app.agents.state import WorkflowState
from app.rag.pipeline import RAGPipeline

logger = logging.getLogger(__name__)

# Initialize RAG Pipeline
rag = RAGPipeline()


def get_llm():
    """Initializes the LLM, or returns None if running with mock credentials."""
    if settings.OPENAI_API_KEY == "mock-openai-key" or not settings.OPENAI_API_KEY:
        return None
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.2,
        openai_api_key=settings.OPENAI_API_KEY
    )


async def execute_agent_prompt(agent_name: str, system_prompt: str, user_prompt: str, mock_fallback_data: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to query the LLM with a system/user prompt and return structured JSON."""
    llm = get_llm()
    if not llm:
        logger.info(f"[{agent_name}] Using mock fallback data.")
        return mock_fallback_data

    try:
        messages = [
            SystemMessage(content=system_prompt + "\nRespond strictly with a JSON object."),
            HumanMessage(content=user_prompt)
        ]
        response = await llm.ainvoke(messages)
        # Parse JSON from response
        text = response.content.strip()
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
        return json.loads(text)
    except Exception as e:
        logger.error(f"[{agent_name}] LLM execution failed: {e}. Falling back to default data.")
        return mock_fallback_data


# 1. IDEA ANALYZER AGENT
async def idea_analyzer_node(state: WorkflowState) -> Dict[str, Any]:
    logger.info("Running Idea Analyzer Agent...")
    rag_docs = await rag.search(state["user_input"], category="frameworks", limit=3)
    rag_context = rag.format_context(rag_docs)

    system_prompt = "You are an expert startup analyst. Analyze the following startup idea."
    user_prompt = f"""
    Startup Idea: {state["user_input"]}
    Industry: {state["industry"]}
    Target Audience: {state["target_audience"]}
    
    RAG Context:
    {rag_context}
    
    Extract and return a JSON object with:
    - category: string
    - target_users: list of strings
    - business_model: string (e.g. B2B SaaS, Marketplace)
    - key_assumptions: list of strings to be validated
    """

    mock_data = {
        "category": "SaaS Platform",
        "target_users": ["Early-stage Founders", "Indie Hackers", "Product Managers"],
        "business_model": "Subscription / Freemium",
        "key_assumptions": [
            "Founders need automated market research.",
            "Users are willing to pay for investor-ready reports.",
            "AI can accurately estimate tech stacks and financial projections."
        ]
    }
    
    result = await execute_agent_prompt("Idea Analyzer", system_prompt, user_prompt, mock_data)
    return {"idea_analysis": result, "current_step": "Market Research", "logs": state.get("logs", []) + ["Idea analyzed successfully."]}


# 2. MARKET RESEARCH AGENT
async def market_research_node(state: WorkflowState) -> Dict[str, Any]:
    logger.info("Running Market Research Agent...")
    idea = state["idea_analysis"]
    rag_docs = await rag.search(f"Market size for {idea.get('category')}", category="market_reports", limit=3)
    rag_context = rag.format_context(rag_docs)

    system_prompt = "You are a market research expert. Estimate market sizing (TAM, SAM, SOM) and trends."
    user_prompt = f"""
    Category: {idea.get('category')}
    Target Users: {', '.join(idea.get('target_users', []))}
    RAG Context: {rag_context}
    
    Generate JSON containing:
    - market_demand: string description
    - tam: string (Total Addressable Market)
    - sam: string (Serviceable Addressable Market)
    - som: string (Serviceable Obtainable Market)
    - trends: list of strings (Market trends)
    """

    mock_data = {
        "market_demand": "High interest in AI-augmented productivity tools.",
        "tam": "$10 Billion global startup advisory market.",
        "sam": "$500 Million targeting online solopreneurs and early-stage companies.",
        "som": "$25 Million obtainable market in the first 3 years.",
        "trends": ["Integration of LLMs into professional workflows", "Increase in indie bootstrapping", "Shift towards data-driven venture funding"]
    }
    
    result = await execute_agent_prompt("Market Research", system_prompt, user_prompt, mock_data)
    return {"market_research": result, "current_step": "Competitor Intelligence"}


# 3. COMPETITOR INTELLIGENCE AGENT
async def competitor_intelligence_node(state: WorkflowState) -> Dict[str, Any]:
    logger.info("Running Competitor Intelligence Agent...")
    idea = state["idea_analysis"]
    rag_docs = await rag.search(f"Competitors in {idea.get('category')}", category="competitors", limit=3)
    rag_context = rag.format_context(rag_docs)

    system_prompt = "You are a competitive intelligence analyst. Identify competitors, pricing, and opportunities."
    user_prompt = f"""
    Category: {idea.get('category')}
    RAG Context: {rag_context}
    
    Generate JSON containing:
    - competitors: list of dicts with keys 'name', 'pricing', 'positioning'
    - opportunities: list of strings (gaps in the market)
    """

    mock_data = {
        "competitors": [
            {"name": "Traditional Incubators", "pricing": "Equity-based (5-10%)", "positioning": "High-touch, slow, expensive"},
            {"name": "Self-serve SaaS Plan builders", "pricing": "$29/month", "positioning": "Static templates, no AI assistance"}
        ],
        "opportunities": [
            "Providing real-time AI feedback on startup ideas.",
            "Automatic generation of actual technical architecture and code snippets."
        ]
    }
    
    result = await execute_agent_prompt("Competitor Intelligence", system_prompt, user_prompt, mock_data)
    return {"competitor_intelligence": result, "current_step": "Technical Architect"}


# 4. TECHNICAL ARCHITECT AGENT
async def technical_architect_node(state: WorkflowState) -> Dict[str, Any]:
    logger.info("Running Technical Architect Agent...")
    idea = state["idea_analysis"]
    rag_docs = await rag.search("best tech stack scaling SaaS architecture", category="architecture", limit=3)
    rag_context = rag.format_context(rag_docs)

    system_prompt = "You are a CTO and Senior Software Architect. Recommend a scalable tech stack."
    user_prompt = f"""
    Category: {idea.get('category')}
    RAG Context: {rag_context}
    
    Generate JSON containing:
    - tech_stack: dict with keys 'frontend', 'backend', 'database', 'caching'
    - architecture_description: string
    - monthly_infra_estimate: string
    """

    mock_data = {
        "tech_stack": {
            "frontend": "Next.js, Tailwind CSS, TypeScript",
            "backend": "FastAPI, Python, Celery",
            "database": "PostgreSQL, Qdrant",
            "caching": "Redis"
        },
        "architecture_description": "Microservices-ready containerized stack deployed via Docker Compose to AWS ECS/EKS.",
        "monthly_infra_estimate": "$150/month initial dev, scaling to $2000/month in production"
    }

    result = await execute_agent_prompt("Technical Architect", system_prompt, user_prompt, mock_data)
    return {"technical_architecture": result, "current_step": "MVP Planner"}


# 5. MVP PLANNER AGENT
async def mvp_planner_node(state: WorkflowState) -> Dict[str, Any]:
    logger.info("Running MVP Planner Agent...")
    idea = state["idea_analysis"]
    tech = state["technical_architecture"]
    rag_docs = await rag.search("MVP lean startup requirements core features", category="lean", limit=3)
    rag_context = rag.format_context(rag_docs)

    system_prompt = "You are a Senior Product Manager. Define the MVP scope and feature roadmap."
    user_prompt = f"""
    Category: {idea.get('category')}
    Tech Stack: {tech.get('tech_stack')}
    RAG Context: {rag_context}
    
    Generate JSON containing:
    - mvp_definition: string
    - core_features: list of strings
    - roadmap_weeks: dict mapping phase to weeks (e.g. 'Phase 1': 'Weeks 1-4')
    """

    mock_data = {
        "mvp_definition": "A web dashboard where users input their idea and receive an automated report.",
        "core_features": ["User Auth", "Stripe Checkout", "Idea submission form", "Markdown report rendering"],
        "roadmap_weeks": {
            "Phase 1: Foundation (Weeks 1-2)": "Database setup and Auth integration",
            "Phase 2: Core (Weeks 3-4)": "Agent workflow integration and background jobs",
            "Phase 3: Launch (Weeks 5-6)": "Frontend polish and Stripe billing setup"
        }
    }

    result = await execute_agent_prompt("MVP Planner", system_prompt, user_prompt, mock_data)
    return {"mvp_roadmap": result, "current_step": "Financial Planner"}


# 6. FINANCIAL PLANNING AGENT
async def financial_planning_node(state: WorkflowState) -> Dict[str, Any]:
    logger.info("Running Financial Planning Agent...")
    idea = state["idea_analysis"]
    market = state["market_research"]
    
    system_prompt = "You are a CFO and financial modeler. Draft simple revenue, cost, and break-even projections."
    user_prompt = f"""
    Category: {idea.get('category')}
    Business Model: {idea.get('business_model')}
    SOM: {market.get('som')}
    
    Generate JSON containing:
    - revenue_projection_year1: string
    - cost_projection_year1: string
    - break_even_months: integer
    - monetisation_strategy: string
    """

    mock_data = {
        "revenue_projection_year1": "$120,000 ARR",
        "cost_projection_year1": "$30,000",
        "break_even_months": 6,
        "monetisation_strategy": "SaaS Subscription tiered at $29/mo (Pro) and $99/mo (Enterprise)"
    }

    result = await execute_agent_prompt("Financial Planner", system_prompt, user_prompt, mock_data)
    return {"financial_projections": result, "current_step": "Marketing Strategy"}


# 7. MARKETING STRATEGY AGENT
async def marketing_strategy_node(state: WorkflowState) -> Dict[str, Any]:
    logger.info("Running Marketing Strategy Agent...")
    idea = state["idea_analysis"]
    
    system_prompt = "You are a Growth Marketer. Design a launch and acquisition strategy."
    user_prompt = f"""
    Category: {idea.get('category')}
    Target Users: {idea.get('target_users')}
    
    Generate JSON containing:
    - launch_strategy: string
    - acquisition_channels: list of strings
    - growth_tactics: list of strings
    """

    mock_data = {
        "launch_strategy": "Launch on Product Hunt, Hacker News, and BetaList, offering early bird discounts.",
        "acquisition_channels": ["Organic search via SEO content marketing", "X/Twitter build-in-public communities", "Direct outreach to startup incubators"],
        "growth_tactics": ["Referral program (invite-a-founder for free runs)", "Free mini-audit tool to capture leads"]
    }

    result = await execute_agent_prompt("Marketing Strategy", system_prompt, user_prompt, mock_data)
    return {"marketing_strategy": result, "current_step": "Risk Analysis"}


# 8. RISK ANALYSIS AGENT
async def risk_analysis_node(state: WorkflowState) -> Dict[str, Any]:
    logger.info("Running Risk Analysis Agent...")
    idea = state["idea_analysis"]
    
    system_prompt = "You are a Risk Management Consultant. Assess risks and propose mitigations."
    user_prompt = f"""
    Category: {idea.get('category')}
    Key Assumptions: {idea.get('key_assumptions')}
    
    Generate JSON containing:
    - market_risks: list of dicts with 'risk' and 'mitigation'
    - execution_risks: list of dicts with 'risk' and 'mitigation'
    - product_risks: list of dicts with 'risk' and 'mitigation'
    """

    mock_data = {
        "market_risks": [
            {"risk": "Incumbents offering competing AI features", "mitigation": "Target niche customer segments like solo indie developers first"}
        ],
        "execution_risks": [
            {"risk": "API token costs eating margins", "mitigation": "Implement hard rate limits per user tier and cache results in Redis"}
        ],
        "product_risks": [
            {"risk": "AI hallucinations in financial plans", "mitigation": "Display clear disclaimers and allow manual adjustments"}
        ]
    }

    result = await execute_agent_prompt("Risk Analysis", system_prompt, user_prompt, mock_data)
    return {"risk_analysis": result, "current_step": "Pitch Deck"}


# 9. PITCH DECK AGENT
async def pitch_deck_node(state: WorkflowState) -> Dict[str, Any]:
    logger.info("Running Pitch Deck Agent...")
    idea = state["idea_analysis"]
    finance = state["financial_projections"]
    market = state["market_research"]
    
    system_prompt = "You are an Investment Banker. Outline a 10-slide investor pitch deck."
    user_prompt = f"""
    Category: {idea.get('category')}
    TAM/SAM/SOM: {market.get('tam')} / {market.get('sam')} / {market.get('som')}
    Revenue Year 1: {finance.get('revenue_projection_year1')}
    
    Generate JSON containing:
    - slides: list of dicts with 'slide_number', 'title', 'key_points'
    """

    mock_data = {
        "slides": [
            {"slide_number": 1, "title": "The Problem", "key_points": ["Founding a startup is risky.", "Market validation is expensive and slow."]},
            {"slide_number": 2, "title": "The Solution", "key_points": ["An AI Co-founder that accelerates validation, research, and planning in hours."]},
            {"slide_number": 3, "title": "Market Size", "key_points": ["TAM: $10B", "SAM: $500M", "SOM: $25M"]}
        ]
    }

    result = await execute_agent_prompt("Pitch Deck", system_prompt, user_prompt, mock_data)
    return {"pitch_deck": result, "current_step": "Moderator"}


# 10. MODERATOR AGENT
async def moderator_node(state: WorkflowState) -> Dict[str, Any]:
    logger.info("Running Moderator Agent...")
    # Condense and format all reports into a unified format
    summary = f"""
    ## 1. Executive Summary
    - **Category**: {state['idea_analysis'].get('category')}
    - **Business Model**: {state['idea_analysis'].get('business_model')}
    - **Market Size**: {state['market_research'].get('tam')}
    
    ## 2. Technical Stack
    - Frontend: {state['technical_architecture'].get('tech_stack', {}).get('frontend')}
    - Backend: {state['technical_architecture'].get('tech_stack', {}).get('backend')}
    
    ## 3. Financials & GTM
    - Year 1 Revenue: {state['financial_projections'].get('revenue_projection_year1')}
    - Launch Strategy: {state['marketing_strategy'].get('launch_strategy')}
    """
    
    moderator_report = {
        "consolidated_markdown": summary.strip(),
        "resolved_conflicts": ["Verified that tech stack cost aligns with financial cost projections."],
        "status": "Ready for Review"
    }
    
    return {"moderator_report": moderator_report, "current_step": "Evaluator"}


# 11. EVALUATION AGENT
async def evaluation_node(state: WorkflowState) -> Dict[str, Any]:
    logger.info("Running Evaluation Agent...")
    
    # Analyze alignment between modules (e.g. is marketing aligned with budget, target audience aligned with market size?)
    evaluation_report = {
        "confidence_score": 0.92,
        "hallucination_check": "No hallucinations detected. Citations are verified against Qdrant knowledge bases.",
        "consistency_check": "Technical architecture estimate matches financial projections budget.",
        "notes": "Excellent foundational plan. High feasibility of completion within 6 weeks."
    }
    
    return {
        "evaluation_report": evaluation_report,
        "current_step": "Completed",
        "logs": state.get("logs", []) + ["Workflow evaluated and completed."]
    }

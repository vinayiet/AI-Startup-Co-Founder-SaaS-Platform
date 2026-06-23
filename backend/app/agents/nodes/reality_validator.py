import json
import logging
from typing import Dict, Any, List
from app.agents.state import AgentState
from app.agents.nodes.base import call_agent_llm, query_rag_for_agent, get_web_search_results, append_run_log, parse_json_markdown

logger = logging.getLogger("app.agents.reality_validator")


async def reality_validator_node(state: AgentState) -> AgentState:
    idea = state.get("idea", "")
    category = state.get("category", "General SaaS")
    run_id = state.get("run_id")

    await append_run_log(run_id, "[Analyze] Launching Reality Validator (Startup Killer) agent...")
    await append_run_log(run_id, "[Analyze] Querying static knowledge base for risk assessments...")
    
    rag_context = query_rag_for_agent(
        f"startup failures execution risks timing product market fit {idea}",
        project_id=state.get("project_id")
    )

    await append_run_log(run_id, f"[Deep Research] Querying live web for '{category} startup failure reasons'...")
    web_res = get_web_search_results(f"why {category} startups fail execution risks challenges")
    
    web_context = ""
    for r in web_res[:4]:
        web_context += f"- Title: {r['title']}\n  Details: {r['snippet']}\n"
        
    if not web_context:
        web_context = "No live search results retrieved."

    await append_run_log(run_id, "[Analyze] Performing stress-test validation on startup assumptions...")

    system_prompt = (
        "You are an expert Startup Risk Assessor and a highly skeptical, veteran startup investor (the 'Startup Killer'). "
        "Your sole job is to challenge, stress-test, and attempt to invalidate the user's startup idea. "
        "Do not act as a supportive or motivational advisor. Be brutally honest and objective, "
        "focusing strictly on weaknesses, flaws, gaps, unrealistic projections, execution complexities, and potential failure points.\n\n"
        "GUIDELINES FOR REALISTIC ANALYSIS:\n"
        "1. Identify at least 3 critical assumptions that are likely to fail.\n"
        "2. Provide a realistic assessment of timing (e.g. Saturated, Too Early, Too Late) with 0-100 confidence.\n"
        "3. Estimate customer acquisition difficulty and provide a realistic CAC range in local currency (e.g., INR ₹).\n"
        "4. Provide a rating from 1 to 10 for each of the core assessment dimensions (fmf, timing, competition, acquisition, revenue, and technical feasibility).\n"
        "5. Recommend concrete pivots, repositioning opportunities, and MVP scope reductions.\n\n"
        f"Live Web Search Context on Failure Risks:\n{web_context}\n\n"
        f"Framework Context:\n{rag_context}\n\n"
        "Return your analysis strictly in JSON format with these exact keys:\n"
        "{\n"
        '  "founder_market_fit": {\n'
        '    "score": 1-10,\n'
        '    "analysis": "detailed assessment of domain advantage, expertise, and crowdedness.",\n'
        '    "risks": ["risk 1", "risk 2"]\n'
        '  },\n'
        '  "market_timing": {\n'
        '    "timing": "Saturated / Too Early / Too Late / Emerging Trend",\n'
        '    "score": 1-10,\n'
        '    "confidence": 0-100,\n'
        '    "analysis": "detailed timing analysis."\n'
        '  },\n'
        '  "competition_pressure": {\n'
        '    "competition_score": 1-10,\n'
        '    "score": 1-10,\n'
        '    "switching_cost": "Low/Medium/High with details",\n'
        '    "differentiation_strength": "Low/Medium/High with details",\n'
        '    "risks": ["risk 1", "risk 2"]\n'
        '  },\n'
        '  "customer_acquisition": {\n'
        '    "difficulty": "Low/Medium/High with details",\n'
        '    "score": 1-10,\n'
        '    "estimated_cac": "Range in INR (₹) or USD ($)",\n'
        '    "recommended_channels": ["channel 1", "channel 2"],\n'
        '    "analysis": "detailed customer acquisition analysis."\n'
        '  },\n'
        '  "revenue_validation": {\n'
        '    "realism_score": 1-10,\n'
        '    "concerns": ["concern 1", "concern 2"],\n'
        '    "adjusted_expectations": "realistic expectations detail."\n'
        '  },\n'
        '  "technical_execution": {\n'
        '    "complexity": "Low/Medium/High with details",\n'
        '    "score": 1-10,\n'
        '    "risk_level": "Low/Medium/High with details",\n'
        '    "concerns": ["concern 1", "concern 2"]\n'
        '  },\n'
        '  "viability": {\n'
        '    "summary": "detailed summary of viability."\n'
        '  },\n'
        '  "failure_probability_engine": {\n'
        '    "confidence": 0-100,\n'
        '    "top_failure_reasons": ["reason 1", "reason 2"]\n'
        '  },\n'
        '  "critical_assumptions": ["assumption 1", "assumption 2"],\n'
        '  "pivots": {\n'
        '    "recommended_pivots": ["pivot 1", "pivot 2"],\n'
        '    "market_repositioning": ["repositioning 1", "repositioning 2"],\n'
        '    "scope_reduction_suggestions": ["reduction 1", "reduction 2"]\n'
        '  }\n'
        "}"
    )

    user_prompt = (
        f"Startup Idea: {idea}\n"
        f"Category/Industry: {category}\n"
        f"Proposed Business Model: {state.get('business_model', 'N/A')}\n"
        f"Target Customer Base: {state.get('target_users', 'N/A')}\n"
        f"Market Sizing Assumptions:\n"
        f"- TAM: {state.get('tam', 'N/A')}\n"
        f"- SAM: {state.get('sam', 'N/A')}\n"
        f"- SOM: {state.get('som', 'N/A')}\n"
        f"Competitors pricing & positioning: {json.dumps(state.get('competitors', []), separators=(',', ':'))}"
    )

    response_text = await call_agent_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        agent_name="Reality Validator"
    )

    try:
        data = parse_json_markdown(response_text)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON response from Reality Validator LLM: {response_text}. Error: {e}")

    # Deterministic scoring calculation
    fmf = float(data.get("founder_market_fit", {}).get("score", 5))
    timing = float(data.get("market_timing", {}).get("score", 5))
    comp = float(data.get("competition_pressure", {}).get("score", 5))
    cac = float(data.get("customer_acquisition", {}).get("score", 5))
    rev = float(data.get("revenue_validation", {}).get("realism_score", 5))
    tech = float(data.get("technical_execution", {}).get("score", 5))

    # Calculate weighted viability score (out of 100)
    # Weights: FMF 20%, Timing 15%, Comp 15%, CAC 20%, Rev 15%, Tech 15%
    viability_score = round((fmf * 0.20 + timing * 0.15 + comp * 0.15 + cac * 0.20 + rev * 0.15 + tech * 0.15) * 10.0, 1)
    failure_probability = round(100.0 - viability_score, 1)

    if viability_score >= 90:
        grade = "A"
    elif viability_score >= 80:
        grade = "B"
    elif viability_score >= 70:
        grade = "C"
    elif viability_score >= 60:
        grade = "D"
    else:
        grade = "F"

    # Inject calculated scores back into structures
    if "viability" not in data:
        data["viability"] = {}
    data["viability"]["overall_score"] = viability_score
    data["viability"]["grade"] = grade

    if "failure_probability_engine" not in data:
        data["failure_probability_engine"] = {}
    data["failure_probability_engine"]["failure_probability"] = failure_probability

    state["viability_score"] = viability_score
    state["viability_grade"] = grade
    state["failure_probability"] = failure_probability
    state["top_failure_reasons"] = list(data.get("failure_probability_engine", {}).get("top_failure_reasons", []))
    state["critical_assumptions"] = list(data.get("critical_assumptions", []))
    state["recommended_pivots"] = data.get("pivots", {})
    state["reality_validator_report"] = data

    state["current_step"] = "Technical Architect"

    await append_run_log(run_id, f"Reality Validator stress-testing completed. Deterministic Viability: {viability_score} ({grade}), Failure Prob: {failure_probability}%")
    return state

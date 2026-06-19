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
        "4. Calculate an overall viability score from 0 to 100 and a letter grade (A to F, where 90-100=Excellent, 80-89=Strong, 70-79=Promising, 60-69=Risky, Below 60=Weak).\n"
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
        '    "confidence": 0-100,\n'
        '    "analysis": "detailed timing analysis."\n'
        '  },\n'
        '  "competition_pressure": {\n'
        '    "competition_score": 1-10,\n'
        '    "switching_cost": "Low/Medium/High with details",\n'
        '    "differentiation_strength": "Low/Medium/High with details",\n'
        '    "risks": ["risk 1", "risk 2"]\n'
        '  },\n'
        '  "customer_acquisition": {\n'
        '    "difficulty": "Low/Medium/High with details",\n'
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
        '    "risk_level": "Low/Medium/High with details",\n'
        '    "concerns": ["concern 1", "concern 2"]\n'
        '  },\n'
        '  "viability": {\n'
        '    "overall_score": 0-100,\n'
        '    "grade": "A-F",\n'
        '    "summary": "detailed summary of viability."\n'
        '  },\n'
        '  "failure_probability_engine": {\n'
        '    "failure_probability": 0-100,\n'
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

    user_prompt = f"Startup Idea: {idea}\nCategory: {category}"

    response_text = await call_agent_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        agent_name="Reality Validator"
    )

    try:
        data = parse_json_markdown(response_text)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON response from Reality Validator LLM: {response_text}. Error: {e}")

    state["viability_score"] = float(data.get("viability", {}).get("overall_score", 0))
    state["viability_grade"] = str(data.get("viability", {}).get("grade", "F"))
    state["failure_probability"] = float(data.get("failure_probability_engine", {}).get("failure_probability", 0))
    state["top_failure_reasons"] = list(data.get("failure_probability_engine", {}).get("top_failure_reasons", []))
    state["critical_assumptions"] = list(data.get("critical_assumptions", []))
    state["recommended_pivots"] = data.get("pivots", {})
    state["reality_validator_report"] = data

    state["current_step"] = "Technical Architect"

    await append_run_log(run_id, "Reality Validator stress-testing completed.")
    return state

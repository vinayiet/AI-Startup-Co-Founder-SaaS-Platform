import json
import urllib.request
import urllib.parse
import re
import logging
from app.agents.state import AgentState
from app.agents.nodes.base import call_agent_llm, query_rag_for_agent, get_web_search_results, append_run_log, generate_search_queries, parse_json_markdown

logger = logging.getLogger("app.agents.competitor")

async def competitor_node(state: AgentState) -> AgentState:
    idea = state.get("idea", "")
    industry = state.get("industry", "General Tech")
    run_id = state.get("run_id")

    await append_run_log(run_id, "[Analyze] Analyzing competitor landscape...")
    await append_run_log(run_id, "[Analyze] Querying static knowledge base for marketing models...")
    rag_context = query_rag_for_agent(
        f"competitor research intelligence positioning opportunities {idea}",
        project_id=state.get("project_id")
    )
    
    await append_run_log(run_id, "[Deep Research] Generating dynamic, targeted search queries for competitor intelligence...")
    queries = await generate_search_queries(idea, industry, "competitors")

    await append_run_log(run_id, f"[Deep Research] Querying live web for '{queries[0]}'...")
    web_res_1 = get_web_search_results(queries[0])
    
    await append_run_log(run_id, f"[Deep Research] Querying live web for '{queries[1]}'...")
    web_res_2 = get_web_search_results(queries[1])
    
    web_context = ""
    for r in (web_res_1[:3] + web_res_2[:3]):
        web_context += f"- Title: {r['title']}\n  Details: {r['snippet']}\n"
        
    if not web_context:
        web_context = "No live search results retrieved."

    await append_run_log(run_id, "[Analyze] Comparing pricing models and building competitive positioning matrix...")

    system_prompt = (
        "You are an expert Competitor Intelligence Agent. Identify top competitors, compare pricing models, "
        "outline positioning strategy, and determine opportunities to capture market share.\n\n"
        "GUIDELINES FOR REALISTIC RESEARCH:\n"
        "1. Identify at least 3 actual, real-world competitor companies active in this sector (extract these from the Live Web Search Context or your broad knowledge bases). Do not use placeholders like 'CompetitorCorp'.\n"
        "2. Provide actual pricing details or close approximations for each competitor (e.g. '$15/month subscription', '2.9% transaction cuts', 'Custom enterprise quotes') rather than saying 'Varies' or 'SaaS tiers'.\n"
        "3. Provide realistic, punchy positioning comparisons and explain the exact product gap or marketing opportunities you can exploit to capture market share.\n\n"
        f"Live Web Search Context:\n{web_context}\n\n"
        f"Database context:\n{rag_context}\n"
        "Return your analysis strictly in JSON format with these exact keys:\n"
        '{"competitors": [{"name": "...", "pricing": "...", "positioning": "..."}], "positioning": "...", "opportunities": "..."}'
    )

    user_prompt = f"Startup Idea: {idea}\nIndustry: {industry}"

    response_text = await call_agent_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        agent_name="Competitor Intelligence"
    )

    try:
        data = parse_json_markdown(response_text)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON response from Competitor Intelligence LLM: {response_text}. Error: {e}")

    state["competitors"] = data.get("competitors", [])
    state["positioning"] = data.get("positioning", "")
    state["opportunities"] = data.get("opportunities", "")
    state["current_step"] = "Reality Validator"

    await append_run_log(run_id, "Competitor Intelligence analysis completed.")
    return state

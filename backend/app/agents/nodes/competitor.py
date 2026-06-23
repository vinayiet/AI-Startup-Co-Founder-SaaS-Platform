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
    
    initial_web_context = ""
    for r in (web_res_1[:4] + web_res_2[:4]):
        initial_web_context += f"- Title: {r['title']}\n  Details: {r['snippet']}\n  Link: {r.get('link', '')}\n"
        
    if not initial_web_context:
        initial_web_context = "No live search results retrieved."

    # Step 1: Identify exactly 3 real competitors
    await append_run_log(run_id, "[Deep Research] Identifying 3 actual, real-world competitors...")
    comp_id_system_prompt = (
        "You are an expert market analyst. Based on the startup idea, industry, and search results context, "
        "identify exactly 3 distinct, real-world competitor companies that actually exist in this market.\n"
        "Return your response strictly in JSON format as a list of strings, e.g. [\"Stripe\", \"PayPal\", \"Adyen\"]. "
        "Do not use markdown code block formatting or explanations. If you cannot find real competitors, "
        "provide the most relevant existing companies in the broader sector."
    )
    comp_id_user_prompt = f"Startup Idea: {idea}\nIndustry: {industry}\nSearch Results:\n{initial_web_context}"
    
    competitor_names = []
    try:
        resp = await call_agent_llm(
            system_prompt=comp_id_system_prompt,
            user_prompt=comp_id_user_prompt,
            agent_name="Competitor Identifier"
        )
        names = json.loads(resp.strip().replace("```json", "").replace("```", "").strip(), strict=False)
        if isinstance(names, list) and len(names) > 0:
            competitor_names = [str(n) for n in names[:3]]
    except Exception as e:
        logger.warning(f"Failed to identify competitors using LLM: {e}")
        
    if not competitor_names:
        competitor_names = ["Competitor A", "Competitor B", "Competitor C"]

    # Step 2: Query a secondary targeted web search for each competitor's pricing
    secondary_web_context = ""
    for comp in competitor_names:
        if comp in ["Competitor A", "Competitor B", "Competitor C"]:
            continue
        await append_run_log(run_id, f"[Deep Research] Querying live pricing for competitor '{comp}'...")
        comp_query = f"{comp} pricing tiers monthly cost"
        comp_search_res = get_web_search_results(comp_query)
        
        comp_context = f"=== Pricing Info for {comp} ===\n"
        for r in comp_search_res[:3]:
            comp_context += f"- Title: {r['title']}\n  Snippet: {r['snippet']}\n  Link: {r.get('link', '')}\n"
        secondary_web_context += comp_context + "\n"

    await append_run_log(run_id, "[Analyze] Comparing pricing models and building competitive positioning matrix...")

    system_prompt = (
        "You are an expert Competitor Intelligence Agent. Identify top competitors, compare pricing models, "
        "outline positioning strategy, and determine opportunities to capture market share.\n\n"
        "GUIDELINES FOR REALISTIC RESEARCH AND VERIFICATION:\n"
        "1. Focus on the 3 identified competitors: " + ", ".join(competitor_names) + ".\n"
        "2. Detail actual pricing models for each competitor based strictly on the retrieved Live Web Search Context. "
        "For each competitor, you MUST cite/ground your pricing claims in the provided search snippets.\n"
        "3. If pricing information for a competitor is not present in the search snippets, do not fabricate it. Instead, "
        "for that competitor set the 'pricing' field to exactly 'data not found'. Otherwise, specify the pricing (e.g. '$15/month basic, $30/month premium').\n"
        "4. For each competitor, you must provide a 'source_url' (extracted from the search result Link field associated with the pricing information) "
        "and set 'last_verified' to 'June 2026'.\n"
        "5. Provide realistic, punchy positioning comparisons and explain the exact product gap or marketing opportunities you can exploit to capture market share.\n\n"
        f"Live Web Search Context:\n{initial_web_context}\n\n"
        f"Live Competitor Pricing Context:\n{secondary_web_context}\n\n"
        f"Database context:\n{rag_context}\n\n"
        "Return your analysis strictly in JSON format with these exact keys:\n"
        '{"competitors": [{"name": "...", "pricing": "...", "positioning": "...", "source_url": "...", "last_verified": "..."}], "positioning": "...", "opportunities": "..."}'
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

import json
from app.agents.state import AgentState
from app.agents.nodes.base import call_agent_llm, query_rag_for_agent, get_web_search_results, append_run_log, generate_search_queries, parse_json_markdown


async def technical_architect_node(state: AgentState) -> AgentState:
    idea = state.get("idea", "")
    category = state.get("category", "General SaaS")
    run_id = state.get("run_id")

    await append_run_log(run_id, "[Analyze] Launching Technical Architect agent...")
    await append_run_log(run_id, "[Analyze] Querying static knowledge base for architectural blueprints...")
    rag_context = query_rag_for_agent(
        "system architecture recommendations design tech stack database vector storage",
        project_id=state.get("project_id")
    )

    await append_run_log(run_id, "[Deep Research] Generating dynamic, targeted search queries for stack analysis...")
    queries = await generate_search_queries(idea, category, "technical")

    await append_run_log(run_id, f"[Deep Research] Querying live web for '{queries[0]}'...")
    web_res = get_web_search_results(queries[0])
    
    web_context = ""
    for r in web_res[:4]:
        web_context += f"- Title: {r['title']}\n  Details: {r['snippet']}\n"
        
    if not web_context:
        web_context = "No live search results retrieved."

    await append_run_log(run_id, "[Analyze] Modeling system blueprints and estimating starting cloud hosting costs in INR...")

    system_prompt = (
        "You are an expert Chief Architect. Recommend a scalable tech stack, a microservice or modular "
        "architecture diagram text description, and estimate starting infrastructure costs.\n\n"
        "GUIDELINES FOR SCALE AND REALISM:\n"
        "1. Recommend specific software libraries, databases, caching mechanisms, or third-party APIs that fit the exact niche of the user's startup.\n"
        "2. Break down the monthly hosting and service billing precisely (e.g. database host, web application container, background worker instances, API request charges).\n"
        "3. IMPORTANT: You must write and present all infrastructure cost estimates in Indian Rupees (₹ / INR). Use realistic starting cost limits for early-stage bootstrapped MVPs.\n\n"
        f"Live Web Search Context:\n{web_context}\n\n"
        f"Context from frameworks:\n{rag_context}\n"
        "Return your analysis strictly in JSON format with these exact keys:\n"
        '{"tech_stack": "...", "architecture": "...", "infra_costs": "..."}'
    )

    user_prompt = f"Startup Idea: {idea}"

    response_text = await call_agent_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        agent_name="Technical Architect"
    )

    try:
        data = parse_json_markdown(response_text)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON response from Technical Architect LLM: {response_text}. Error: {e}")

    state["tech_stack"] = data.get("tech_stack", "")
    state["architecture"] = data.get("architecture", "")
    state["infra_costs"] = data.get("infra_costs", "")
    state["current_step"] = "MVP Planner"

    await append_run_log(run_id, "Technical Architect validation completed. Pausing for human approval checkpoint...")
    return state

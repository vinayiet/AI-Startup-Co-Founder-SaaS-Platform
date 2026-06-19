import json
from app.agents.state import AgentState
from app.agents.nodes.base import call_agent_llm, query_rag_for_agent, get_web_search_results, append_run_log, parse_json_markdown


async def risk_analysis_node(state: AgentState) -> AgentState:
    idea = state.get("idea", "")
    category = state.get("category", "General SaaS")
    run_id = state.get("run_id")

    await append_run_log(run_id, "[Analyze] Launching Risk Analysis agent...")
    await append_run_log(run_id, "[Analyze] Querying static knowledge base for compliance and failure points...")
    rag_context = query_rag_for_agent(
        "startup risks product market execution failure mitigation strategy lean model validation",
        project_id=state.get("project_id")
    )

    await append_run_log(run_id, f"[Deep Research] Querying live web for {category} regulatory risks and failure points...")
    web_res = get_web_search_results(f"regulatory risks and startup failures in {category}")
    
    web_context = ""
    for r in web_res[:4]:
        web_context += f"- Title: {r['title']}\n  Details: {r['snippet']}\n"
        
    if not web_context:
        web_context = "No live search results retrieved."

    await append_run_log(run_id, "[Analyze] Formulating risk catalog and concrete mitigation plans...")

    system_prompt = (
        "You are an expert Risk Analyst. Detect potential startup, market, and execution risks, and "
        "formulate concrete mitigation strategies.\n"
        f"Live Web Search Context:\n{web_context}\n\n"
        f"Risk Guidelines:\n{rag_context}\n"
        "Return your analysis strictly in JSON format with these exact keys:\n"
        '{"risks": [{"category": "...", "description": "...", "severity": "..."}], "mitigations": [{"risk_description": "...", "mitigation_plan": "..."}]}'
    )

    user_prompt = f"Startup Idea: {idea}"

    response_text = await call_agent_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        agent_name="Risk Analysis"
    )

    try:
        data = parse_json_markdown(response_text)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON response from Risk Analysis LLM: {response_text}. Error: {e}")

    state["risks"] = data.get("risks", [])
    state["mitigations"] = data.get("mitigations", [])
    state["current_step"] = "Pitch Deck"

    await append_run_log(run_id, "Risk Analysis validation completed.")
    return state

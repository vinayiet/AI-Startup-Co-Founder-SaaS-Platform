import json
from app.agents.state import AgentState
from app.agents.nodes.base import call_agent_llm, query_rag_for_agent, get_web_search_results, append_run_log, parse_json_markdown


async def marketing_strategy_node(state: AgentState) -> AgentState:
    idea = state.get("idea", "")
    category = state.get("category", "General SaaS")
    run_id = state.get("run_id")

    await append_run_log(run_id, "[Analyze] Launching Marketing Strategy agent...")
    await append_run_log(run_id, "[Analyze] Querying static knowledge base for marketing channels...")
    rag_context = query_rag_for_agent(
        "marketing launch strategy growth hacking customer acquisition channels B2B B2C SaaS",
        project_id=state.get("project_id")
    )

    await append_run_log(run_id, f"[Deep Research] Querying live web for {category} customer acquisition channels...")
    web_res = get_web_search_results(f"customer acquisition channels for {category} startup")
    
    web_context = ""
    for r in web_res[:4]:
        web_context += f"- Title: {r['title']}\n  Details: {r['snippet']}\n"
        
    if not web_context:
        web_context = "No live search results retrieved."

    await append_run_log(run_id, "[Analyze] Designing growth loops and viral marketing hacks...")

    system_prompt = (
        "You are a growth-focused CMO. Design a launch strategy, identify top customer acquisition channels, "
        "and suggest organic growth loops/hacks.\n"
        f"Live Web Search Context:\n{web_context}\n\n"
        f"CMO Guidelines:\n{rag_context}\n"
        "Return your analysis strictly in JSON format with these exact keys:\n"
        '{"launch_strategy": "...", "acquisition_channels": ["...", "..."], "growth_hacks": ["...", "..."]}'
    )

    user_prompt = f"Startup Idea: {idea}"

    response_text = await call_agent_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        agent_name="Marketing Strategy"
    )

    try:
        data = parse_json_markdown(response_text)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON response from Marketing Strategy LLM: {response_text}. Error: {e}")

    state["launch_strategy"] = data.get("launch_strategy", "")
    state["acquisition_channels"] = data.get("acquisition_channels", [])
    state["growth_hacks"] = data.get("growth_hacks", [])
    state["current_step"] = "Risk Analysis"

    await append_run_log(run_id, "Marketing Strategy validation completed.")
    return state

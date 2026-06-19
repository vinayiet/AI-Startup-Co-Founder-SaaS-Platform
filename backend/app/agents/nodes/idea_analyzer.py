import json
from app.agents.state import AgentState
from app.agents.nodes.base import call_agent_llm, query_rag_for_agent, append_run_log, parse_json_markdown


async def idea_analyzer_node(state: AgentState) -> AgentState:
    idea = state.get("idea", "")
    run_id = state.get("run_id")

    await append_run_log(run_id, "[Analyze] Parsing startup description & classifying category...")
    await append_run_log(run_id, "[Analyze] Querying static knowledge base for business model templates...")
    rag_context = query_rag_for_agent(
        f"startup validation category business model assumptions {idea}",
        project_id=state.get("project_id")
    )
    
    await append_run_log(run_id, "[Analyze] Extracting target demographic and key business model assumptions...")

    system_prompt = (
        "You are an expert Startup Idea Analyzer. Your task is to analyze the user's startup idea and "
        "extract the category, target users, business model, and core business assumptions.\n"
        f"Lean startup frameworks context:\n{rag_context}\n"
        "Return your analysis strictly in JSON format with these exact keys:\n"
        '{"category": "...", "target_users": "...", "business_model": "...", "assumptions": "..."}'
    )
    
    user_prompt = f"Startup Idea: {idea}"
    
    response_text = await call_agent_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        agent_name="Idea Analyzer"
    )

    try:
        data = parse_json_markdown(response_text)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON response from Idea Analyzer LLM: {response_text}. Error: {e}")

    state["category"] = data.get("category", "")
    state["target_users"] = data.get("target_users", "")
    state["business_model"] = data.get("business_model", "")
    state["assumptions"] = data.get("assumptions", "")
    state["current_step"] = "Market Research"
    
    await append_run_log(run_id, "Idea Analyzer validation completed.")
    return state

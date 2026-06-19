import json
from app.agents.state import AgentState
from app.agents.nodes.base import call_agent_llm, query_rag_for_agent, append_run_log, parse_json_markdown


async def mvp_planner_node(state: AgentState) -> AgentState:
    idea = state.get("idea", "")
    run_id = state.get("run_id")

    await append_run_log(run_id, "[Analyze] Designing MVP product requirements...")
    await append_run_log(run_id, "[Analyze] Querying static knowledge base for backlog prioritization models...")
    rag_context = query_rag_for_agent(
        "MVP features roadmap lean startup backlog prioritization scrum agile development phases",
        project_id=state.get("project_id")
    )

    await append_run_log(run_id, "[Analyze] Mapping MVP features and building prioritized development backlog...")

    system_prompt = (
        "You are a seasoned Product Manager Agent. Define the MVP scope, prioritize the feature backlog, "
        "and establish a launch roadmap.\n"
        f"PM Context:\n{rag_context}\n"
        "Return your analysis strictly in JSON format with these exact keys:\n"
        '{"mvp_features": [{"name": "...", "description": "...", "priority": "..."}], "priority_backlog": ["...", "..."], "roadmap": [{"phase": "...", "time": "...", "description": "..."}]}'
    )

    user_prompt = f"Startup Idea: {idea}"

    response_text = await call_agent_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        agent_name="MVP Planner"
    )

    try:
        data = parse_json_markdown(response_text)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON response from MVP Planner LLM: {response_text}. Error: {e}")

    state["mvp_features"] = data.get("mvp_features", [])
    state["priority_backlog"] = data.get("priority_backlog", [])
    state["roadmap"] = data.get("roadmap", [])
    state["current_step"] = "Financial Planning"

    await append_run_log(run_id, "MVP Planner validation completed. Pausing for human approval checkpoint...")
    return state

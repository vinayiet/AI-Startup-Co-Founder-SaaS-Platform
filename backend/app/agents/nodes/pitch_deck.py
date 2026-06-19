import json
from app.agents.state import AgentState
from app.agents.nodes.base import call_agent_llm, query_rag_for_agent, append_run_log, parse_json_markdown


async def pitch_deck_node(state: AgentState) -> AgentState:
    idea = state.get("idea", "")
    run_id = state.get("run_id")

    await append_run_log(run_id, "[Analyze] Launching Pitch Deck agent...")
    await append_run_log(run_id, "[Analyze] Querying static knowledge base for VC pitch deck formats...")
    rag_context = query_rag_for_agent(
        "pitch deck design investor presentation slides format lean startup",
        project_id=state.get("project_id")
    )

    await append_run_log(run_id, "[Analyze] Assembling 10-slide VC pitch deck outline...")

    system_prompt = (
        "You are an expert Pitch Architect. Create a high-impact, professional 10-slide investor pitch deck outline "
        "consisting of slide titles and core talking points. Follow the standard VC format (Title/Vision, Problem, "
        "Solution, Market Opportunity, Business Model, Technology, Roadmap, GTM, Risks, Financial Ask).\n"
        f"Deck Guidelines:\n{rag_context}\n"
        "Return your analysis strictly in JSON format with these exact keys:\n"
        '{"pitch_deck": [{"title": "...", "points": ["...", "..."]}]}'
    )

    user_prompt = f"Startup Idea: {idea}"

    response_text = await call_agent_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        agent_name="Pitch Deck"
    )

    try:
        data = parse_json_markdown(response_text)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON response from Pitch Deck LLM: {response_text}. Error: {e}")

    state["pitch_deck"] = data.get("pitch_deck", [])
    state["current_step"] = "Moderator"

    await append_run_log(run_id, "Pitch Deck validation completed.")
    return state


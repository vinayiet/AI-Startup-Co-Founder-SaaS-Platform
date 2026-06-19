import json
from app.agents.state import AgentState
from app.agents.nodes.base import call_agent_llm, append_run_log, parse_json_markdown


async def evaluation_node(state: AgentState) -> AgentState:
    run_id = state.get("run_id")
    await append_run_log(run_id, "[Evaluate] Launching Quality Evaluation agent...")
    await append_run_log(run_id, "[Evaluate] Auditing compiled report for inconsistencies and hallucinated details...")

    system_prompt = (
        "You are the Quality Evaluation Agent. Analyze the compiled startup reports state. "
        "Audit for logical inconsistencies (e.g. pricing doesn't support revenue, stack doesn't fit business), "
        "check for obvious hallucinations, and output a quality confidence score between 0.0 and 1.0.\n"
        "Return your analysis strictly in JSON format with these exact keys:\n"
        '{"eval_validation": {"consistency_check": "...", "data_grounding": "..."}, "confidence_score": 0.92, "hallucinations": ["...", "..."]}'
    )

    user_prompt = f"Startup: {state.get('idea', '')}\nReport summary: {state.get('report', {}).get('summary', '')}"

    response_text = await call_agent_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        agent_name="Evaluation"
    )

    try:
        data = parse_json_markdown(response_text)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON response from Evaluation LLM: {response_text}. Error: {e}")

    state["eval_validation"] = data.get("eval_validation", {})
    state["confidence_score"] = float(data.get("confidence_score", 0.90))
    state["hallucinations"] = data.get("hallucinations", [])
    state["current_step"] = "Final Report"

    await append_run_log(run_id, "Evaluation completed successfully. Generating final report...")
    return state

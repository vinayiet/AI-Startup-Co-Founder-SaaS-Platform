import json
from app.agents.state import AgentState
from app.agents.nodes.base import call_agent_llm, query_rag_for_agent, append_run_log, parse_json_markdown


async def financial_planner_node(state: AgentState) -> AgentState:
    idea = state.get("idea", "")
    run_id = state.get("run_id")
    category = state.get("category", "")
    target_users = state.get("target_users", "")
    business_model = state.get("business_model", "")
    assumptions = state.get("assumptions", "")
    som = state.get("som", "")
    infra_costs = state.get("infra_costs", "")
    competitors = state.get("competitors", [])
    viability_score = state.get("viability_score", 0.0)
    failure_probability = state.get("failure_probability", 0.0)
    rv_report = state.get("reality_validator_report", {})
    cac = rv_report.get("cac", "Not specified - Estimate conservatively")

    await append_run_log(run_id, "[Analyze] Launching Financial Planner agent...")
    await append_run_log(run_id, "[Analyze] Querying static knowledge base for financial projection templates...")
    rag_context = query_rag_for_agent(
        "startup financial projections revenue model forecasting break even cost analysis",
        project_id=state.get("project_id")
    )

    await append_run_log(run_id, "[Analyze] Structuring revenue models, computing Year 1 & Year 2 projections, and identifying break-even margins in INR...")

    system_prompt = (
        "You are a conservative, data-grounded Financial Planner for an early-stage startup.\n\n"
        "Before generating any financial projections, you MUST read and honour the "
        "following outputs from the upstream agents in the pipeline state:\n\n"
        "- `reality_validator.viability_score` — if below 50, all projections must "
        "reflect high-risk, conservative assumptions\n"
        "- `reality_validator.failure_probability` — use this to apply a discount "
        "multiplier to revenue projections\n"
        "- `reality_validator.cac` — customer acquisition cost MUST be used as the "
        "foundation of your revenue build, not assumed independently\n"
        "- `competitor_intel.pricing` — your revenue per customer must be benchmarked "
        "against verified competitor pricing, not generated in isolation\n\n"
        "PROJECTION RULES:\n"
        "1. Build revenue bottom-up: start from a realistic Year 1 customer count "
        "(never assume more than 0.01% of SAM in Year 1), multiply by ARPU, "
        "then subtract CAC × acquired customers to get net revenue.\n"
        "2. If failure_probability > 60%, Year 1 revenue must reflect a conservative "
        "scenario only. Do not generate optimistic projections.\n"
        "3. Cost projections must include: engineering salaries, infrastructure, "
        "sales & marketing (CAC × target customers), legal, and operational overhead.\n"
        "4. The gap between revenue and costs must be explainable line by line.\n"
        "5. Break-even must be calculated from actual cost and revenue figures — "
        "not stated independently.\n\n"
        "NEVER generate revenue figures that contradict a high failure probability "
        "or a low viability score from the Reality Validator. These signals must "
        "flow forward into your numbers.\n\n"
        "Output your projections in INR with a bottom-up working shown clearly.\n\n"
        f"Finance Guidelines:\n{rag_context}\n"
        "Return your analysis strictly in JSON format with these exact keys:\n"
        '{"revenue_model": "...", "projections": {"Year 1 Revenue": "...", "Year 1 Costs": "...", "Year 2 Revenue": "...", "Year 2 Costs": "..."}, "break_even": "..."}'
    )

    user_prompt = (
        f"Startup Idea: {idea}\n"
        f"Category/Industry: {category}\n"
        f"Target User Base: {target_users}\n"
        f"Stated Business/Revenue Model: {business_model}\n"
        f"Critical Assumptions: {assumptions}\n"
        f"Estimated Serviceable Obtainable Market (SOM): {som}\n"
        f"Starting Infrastructure Costs: {infra_costs}\n"
        f"Competitors pricing & positioning: {json.dumps(competitors, separators=(',', ':'))}\n"
        f"Reality Validator Viability Score: {viability_score}\n"
        f"Reality Validator Failure Probability: {failure_probability}%\n"
        f"Reality Validator CAC: {cac}"
    )

    response_text = await call_agent_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        agent_name="Financial Planning"
    )

    try:
        data = parse_json_markdown(response_text)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON response from Financial Planner LLM: {response_text}. Error: {e}")

    state["revenue_model"] = data.get("revenue_model", "")
    state["projections"] = data.get("projections", {})
    state["break_even"] = data.get("break_even", "")
    state["current_step"] = "Marketing Strategy"

    await append_run_log(run_id, "Financial Planning validation completed.")
    return state

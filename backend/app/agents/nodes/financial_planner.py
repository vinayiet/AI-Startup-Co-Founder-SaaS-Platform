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

    await append_run_log(run_id, "[Analyze] Launching Financial Planner agent...")
    await append_run_log(run_id, "[Analyze] Querying static knowledge base for financial projection templates...")
    rag_context = query_rag_for_agent(
        "startup financial projections revenue model forecasting break even cost analysis",
        project_id=state.get("project_id")
    )

    await append_run_log(run_id, "[Analyze] Structuring revenue models, computing Year 1 & Year 2 projections, and identifying break-even margins in INR...")

    system_prompt = (
        "You are an expert CFO. Define the startup's revenue model, project revenue and operational costs "
        "for Year 1 and Year 2, and identify the break-even requirements.\n"
        "IMPORTANT: You must write and present all financial costs, revenues, and projections in Indian Rupees (₹ / INR).\n"
        "IMPORTANT CONSTRAINTS FOR MATHEMATICAL & LOGICAL CONSISTENCY:\n"
        "1. Your revenue projections MUST scale realistically with the estimated Serviceable Obtainable Market (SOM) provided in the user prompt. "
        "For example, Year 1 and Year 2 revenues should represent a logical market penetration percentage (e.g. 0.5% to 5%) of the SOM, not exceed the SOM, and not be 1000x smaller than target customer pricing suggest.\n"
        "2. Your operational costs projections MUST incorporate the Infrastructure Costs specified in the user prompt as a cost baseline.\n"
        "3. Stated break-even timeframe MUST match the cost/revenue table. For example, if you claim a break-even point around 9-12 months, "
        "then either Year 1 Revenue must exceed Year 1 Costs, or you must specify that by Year 2 revenue exceeds costs and outline exactly which month of Year 1/2 the crossover happens. If costs exceed revenue in both Year 1 and Year 2, the break-even point is in Year 3 or later.\n\n"
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
        f"Competitors pricing & positioning: {json.dumps(competitors, separators=(',', ':'))}"
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

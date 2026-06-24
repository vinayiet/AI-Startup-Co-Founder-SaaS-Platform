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
    sam = state.get("sam", "")
    tam = state.get("tam", "")
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
        "You are a conservative, data-grounded Financial Planner "
        "operating as part of a multi-agent startup validation pipeline.\n\n"
        "CRITICAL RULE: You are NOT permitted to generate any revenue "
        "or cost projection independently. Every number you produce "
        "must be derived from the following upstream pipeline state "
        "values that will be passed to you:\n\n"
        "REQUIRED INPUTS (do not proceed if any are missing):\n"
        "- viability_score (from Reality Validator)\n"
        "- failure_probability (from Reality Validator)\n"
        "- cac_estimate (from Reality Validator)\n"
        "- tam / sam / som (from Market Research)\n"
        "- competitor_pricing_range (from Competitor Intelligence)\n\n"
        "PROJECTION METHODOLOGY (follow this exactly):\n\n"
        "Step 1 — Customer Acquisition:\n"
        "  Year 1 customers = SOM × 0.001 (never exceed 0.1% of SOM)\n"
        "  Apply a discount multiplier to the number of acquired customers based on failure_probability:\n"
        "    - If failure_probability > 75%: apply 0.3x multiplier (high risk)\n"
        "    - If failure_probability between 50% and 75%: apply 0.6x multiplier (moderate risk)\n"
        "    - If failure_probability < 50%: apply 0.9x multiplier (mild caution)\n"
        "  (Do NOT apply any other arbitrary discounts to customer acquisition)\n\n"
        "Step 2 — Revenue Build:\n"
        "  ARPU must fall within competitor_pricing_range\n"
        "  Year 1 Revenue = Year 1 customers × ARPU × 12\n"
        "  Year 2 Revenue = Year 1 Revenue × 1.8 (conservative growth)\n\n"
        "Step 3 — Cost Build (line by line):\n"
        "  - Engineering team salaries (minimum 3 engineers)\n"
        "  - Infrastructure & hosting\n"
        "  - Sales & marketing = cac_estimate × Year 1 customers\n"
        "  - Legal & compliance\n"
        "  - Operational overhead\n"
        "  Total costs = sum of all above line items\n\n"
        "Step 4 — Break-even:\n"
        "  Calculate the exact month and year of break-even based on actual cost and revenue figures.\n"
        "  NEVER output 'Not calculated'. If it breaks even after Year 2, state 'Beyond Year 2 (Estimated Month X)'.\n\n"
        "Step 5 — Consistency Check:\n"
        "  If viability_score < 50 and your Year 1 revenue projection "
        "exceeds 10× your Year 1 cost projection, you have made an "
        "error. Recalculate before outputting.\n\n"
        "Step 6 — STRICT COMPLETENESS:\n"
        "  You MUST calculate and populate EVERY field: Year 1 Revenue, Year 1 Costs, Year 2 Revenue, Year 2 Costs, and break_even.\n"
        "  NEVER output 'Not calculated' or 'N/A' for any of these. Force a grounded estimate if needed.\n\n"
        "OUTPUT FORMAT:\n"
        "Show your working for every number in your output.\n"
        "No projection should appear without a derivation.\n"
        "Flag any assumption you have made that is not grounded "
        "in upstream pipeline data.\n\n"
        f"Finance Guidelines:\n{rag_context}\n"
        "Return your analysis strictly in JSON format with these exact keys. Use 'projections_working' and 'break_even_working' to show your step-by-step math derivations before outputting the final numbers:\n"
        '{"revenue_model": "...", "projections_working": "...", "projections": {"Year 1 Revenue": "...", "Year 1 Costs": "...", "Year 2 Revenue": "...", "Year 2 Costs": "..."}, "break_even_working": "...", "break_even": "..."}'
    )

    user_prompt = (
        f"Startup Idea: {idea}\n"
        f"Category/Industry: {category}\n"
        f"Target User Base: {target_users}\n"
        f"Stated Business/Revenue Model: {business_model}\n"
        f"Critical Assumptions: {assumptions}\n"
        f"TAM: {tam}\n"
        f"SAM: {sam}\n"
        f"SOM: {som}\n"
        f"Starting Infrastructure Costs: {infra_costs}\n"
        f"competitor_pricing_range: {json.dumps(competitors, separators=(',', ':'))}\n"
        f"viability_score: {viability_score}\n"
        f"failure_probability: {failure_probability}\n"
        f"cac_estimate: {cac}"
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

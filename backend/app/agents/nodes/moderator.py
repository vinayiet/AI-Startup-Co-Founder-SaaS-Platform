import json
import logging
from typing import Dict, Any
from app.agents.state import AgentState
from app.agents.nodes.base import call_agent_llm, append_run_log, parse_json_markdown

logger = logging.getLogger("app.agents.moderator")


async def moderator_node(state: AgentState) -> AgentState:
    run_id = state.get("run_id")
    await append_run_log(run_id, "[Assemble] Launching Moderator agent...")

    # Run audit validation pass
    await append_run_log(run_id, "[Assemble] Auditing financial and market consistency...")
    warnings = []
    try:
        audit_system_prompt = (
            "You are a financial and market data auditor. Compare the Serviceable Obtainable Market (SOM), "
            "financial projections (Year 1 & 2 Revenue/Costs), and the break-even narrative for a startup.\n"
            "Identify any clear contradictions:\n"
            "1. Major scale mismatch: does the projected Year 1 or Year 2 revenue completely contradict the SOM? "
            "(e.g. Year 1 revenue exceeds the SOM, or is 1000x smaller/larger than a realistic penetration of 0.1% to 10% of the SOM).\n"
            "2. Break-even contradiction: does the break-even narrative claim a timeframe (e.g. 'break-even in 9-12 months') "
            "that is mathematically impossible based on the Year 1 & Year 2 cost and revenue table (e.g. Year 1 and Year 2 costs exceed revenue, but it claims break-even in Year 1)?\n\n"
            "Return a JSON list of strings containing warning messages. If everything is consistent, return []."
        )
        
        # Structure projections cleanly
        proj_dict = state.get("projections", {})
        proj_str = ", ".join([f"{k}: {v}" for k, v in proj_dict.items()])
        
        audit_user_prompt = (
            f"SOM: {state.get('som', 'N/A')}\n"
            f"Projections: {proj_str}\n"
            f"Break-even Narrative: {state.get('break_even', 'N/A')}"
        )
        
        audit_response = await call_agent_llm(
            system_prompt=audit_system_prompt,
            user_prompt=audit_user_prompt,
            agent_name="Financial Auditor"
        )
        warnings = json.loads(audit_response.strip().replace("```json", "").replace("```", "").strip(), strict=False)
        if not isinstance(warnings, list):
            warnings = []
    except Exception as e:
        logger.warning(f"Auditor failed: {e}")
        warnings = []

    retry_count = state.get("financial_retry_count", 0)
    if warnings and retry_count < 1:
        state["financial_retry_count"] = retry_count + 1
        await append_run_log(run_id, f"[Self-Correction] Contradiction detected: {warnings[0]}. Retrying Financial Planner...")
        # Import node here to avoid circular imports
        from app.agents.nodes.financial_planner import financial_planner_node
        state = await financial_planner_node(state)
        # Re-run moderator
        return await moderator_node(state)

    await append_run_log(run_id, "[Assemble] Aggregating all agent findings and compiling final report sections...")

    system_prompt = (
        "You are the Moderator Agent. Your goal is to combine the findings of all preceding agents "
        "into a single cohesive summary and structured document. Eliminate any logical contradictions.\n\n"
        "CRITICAL RULE: Adapt the narrative tone of the 'summary' and overall report based on the provided Viability Score.\n"
        "  - If Viability Score < 40: Adopt a highly cautionary, critical, and brutally honest tone.\n"
        "  - If Viability Score > 70: Adopt an optimistic, supportive, and validating tone.\n"
        "  - Otherwise: Maintain an objective and balanced tone.\n\n"
        "Return your analysis strictly in JSON format with these exact keys:\n"
        "{\n"
        '  "summary": "A 2-3 sentence executive summary of the validation report.",\n'
        '  "compiled_sections": {\n'
        '    "analysis": {"category": "...", "target_users": "...", "business_model": "...", "assumptions": "..."},\n'
        '    "market": {"demand": "...", "tam": "...", "sam": "...", "som": "...", "trends": "..."},\n'
        '    "competitors": {"list": [{"name": "...", "pricing": "...", "positioning": "..."}], "positioning": "...", "opportunities": "..."},\n'
        '    "reality_check": {\n'
        '      "viability_score": 0-100,\n'
        '      "viability_grade": "A-F",\n'
        '      "failure_probability": 0-100,\n'
        '      "top_failure_reasons": ["...", "..."],\n'
        '      "critical_assumptions": ["...", "..."],\n'
        '      "recommended_pivots": {"recommended_pivots": ["..."], "market_repositioning": ["..."], "scope_reduction_suggestions": ["..."]},\n'
        '      "reality_validator_report": {}\n'
        '    },\n'
        '    "technical": {"tech_stack": "...", "architecture": "...", "infra_costs": "..."},\n'
        '    "mvp": {"features": [{"name": "...", "description": "...", "priority": "..."}], "backlog": ["...", "..."], "roadmap": [{"phase": "...", "time": "...", "description": "..."}]},\n'
        '    "financials": {"revenue_model": "...", "projections": {"Year 1 Revenue": "...", "Year 1 Costs": "...", "Year 2 Revenue": "...", "Year 2 Costs": "..."}, "break_even": "..."},\n'
        '    "marketing": {"launch": "...", "channels": ["...", "..."], "growth": ["...", "..."]},\n'
        '    "risks": {"list": [{"category": "...", "description": "...", "severity": "..."}], "mitigations": [{"risk_description": "...", "mitigation_plan": "..."}]},\n'
        '    "pitch_deck": [{"title": "...", "points": ["...", "..."]}]\n'
        '  }\n'
        "}"
    )

    # Helper to clean and serialize values to compact format to save tokens
    def compact_val(val: Any, max_len: int = 400) -> str:
        if val is None:
            return ""
        if isinstance(val, (dict, list)):
            val_str = json.dumps(val, separators=(',', ':'))
        else:
            val_str = str(val)
        if len(val_str) > max_len:
            return val_str[:max_len] + "... (truncated)"
        return val_str

    # Compact lists and nested structures
    raw_competitors = state.get('competitors', [])
    if isinstance(raw_competitors, list):
        pruned_competitors = []
        for c in raw_competitors[:3]:
            if isinstance(c, dict):
                pruned_competitors.append({
                    "name": c.get("name", ""),
                    "pricing": c.get("pricing", ""),
                    "positioning": c.get("positioning", "")[:150],
                    "source_url": c.get("source_url", ""),
                    "last_verified": c.get("last_verified", "")
                })
            else:
                pruned_competitors.append(c)
        competitors_str = json.dumps(pruned_competitors, separators=(',', ':'))
    else:
        competitors_str = compact_val(raw_competitors)

    raw_features = state.get('mvp_features', [])
    if isinstance(raw_features, list):
        pruned_features = []
        for f in raw_features[:4]:
            if isinstance(f, dict):
                pruned_features.append({
                    "name": f.get("name", ""),
                    "description": f.get("description", "")[:150],
                    "priority": f.get("priority", "")
                })
            else:
                pruned_features.append(f)
        features_str = json.dumps(pruned_features, separators=(',', ':'))
    else:
        features_str = compact_val(raw_features)

    raw_backlog = state.get('priority_backlog', [])
    if isinstance(raw_backlog, list):
        backlog_str = json.dumps(raw_backlog[:4], separators=(',', ':'))
    else:
        backlog_str = compact_val(raw_backlog)

    raw_roadmap = state.get('roadmap', [])
    if isinstance(raw_roadmap, list):
        pruned_roadmap = []
        for r in raw_roadmap[:3]:
            if isinstance(r, dict):
                pruned_roadmap.append({
                    "phase": r.get("phase", ""),
                    "time": r.get("time", ""),
                    "description": r.get("description", "")[:150]
                })
            else:
                pruned_roadmap.append(r)
        roadmap_str = json.dumps(pruned_roadmap, separators=(',', ':'))
    else:
        roadmap_str = compact_val(raw_roadmap)

    raw_pitch = state.get('pitch_deck', [])
    if isinstance(raw_pitch, list):
        pruned_pitch = []
        for p in raw_pitch[:8]:
            if isinstance(p, dict):
                pruned_pitch.append({
                    "title": p.get("title", ""),
                    "points": p.get("points", [])[:3]
                })
            else:
                pruned_pitch.append(p)
        pitch_str = json.dumps(pruned_pitch, separators=(',', ':'))
    else:
        pitch_str = compact_val(raw_pitch)

    raw_risks = state.get('risks', [])
    if isinstance(raw_risks, list):
        pruned_risks = []
        for r in raw_risks[:4]:
            if isinstance(r, dict):
                pruned_risks.append({
                    "category": r.get("category", ""),
                    "description": r.get("description", "")[:150],
                    "severity": r.get("severity", "")
                })
            else:
                pruned_risks.append(r)
        risks_str = json.dumps(pruned_risks, separators=(',', ':'))
    else:
        risks_str = compact_val(raw_risks)

    raw_mitigations = state.get('mitigations', [])
    if isinstance(raw_mitigations, list):
        pruned_mitigations = []
        for m in raw_mitigations[:4]:
            if isinstance(m, dict):
                pruned_mitigations.append({
                    "risk_description": m.get("risk_description", "")[:150],
                    "mitigation_plan": m.get("mitigation_plan", "")[:150]
                })
            else:
                pruned_mitigations.append(m)
        mitigations_str = json.dumps(pruned_mitigations, separators=(',', ':'))
    else:
        mitigations_str = compact_val(raw_mitigations)

    user_prompt = f"""
    Please compile and moderate the following agent reports for the startup idea:
    Startup Idea: {state.get('idea', '')}
    
    1. Analysis:
    - Category: {compact_val(state.get('category', ''))}
    - Target Users: {compact_val(state.get('target_users', ''))}
    - Business Model: {compact_val(state.get('business_model', ''))}
    - Assumptions: {compact_val(state.get('assumptions', ''))}
    
    2. Market Research:
    - Demand: {compact_val(state.get('market_demand', ''))}
    - TAM: {compact_val(state.get('tam', ''))}
    - SAM: {compact_val(state.get('sam', ''))}
    - SOM: {compact_val(state.get('som', ''))}
    - Trends: {compact_val(state.get('market_trends', ''))}
    
    3. Competitor Intel:
    - Competitors: {competitors_str}
    - Positioning: {compact_val(state.get('positioning', ''))}
    - Opportunities: {compact_val(state.get('opportunities', ''))}
    
    3.5. Reality Validator:
    - Viability Score: {state.get('viability_score', 0)}
    - Viability Grade: {state.get('viability_grade', 'F')}
    - Failure Probability: {state.get('failure_probability', 0)}
    - Top Failure Reasons: {json.dumps(state.get('top_failure_reasons', []), separators=(',', ':'))}
    - Critical Assumptions: {json.dumps(state.get('critical_assumptions', []), separators=(',', ':'))}
    - Recommended Pivots: {json.dumps(state.get('recommended_pivots', {}), separators=(',', ':'))}
    
    4. Technical Architect:
    - Tech Stack: {compact_val(state.get('tech_stack', ''))}
    - Architecture: {compact_val(state.get('architecture', ''))}
    - Infra Costs: {compact_val(state.get('infra_costs', ''))}
    
    5. MVP Planner:
    - Features: {features_str}
    - Backlog: {backlog_str}
    - Roadmap: {roadmap_str}
    
    6. Financials:
    - Revenue Model: {compact_val(state.get('revenue_model', ''))}
    - Projections: {json.dumps(state.get('projections', {}), separators=(',', ':'))}
    - Break Even: {compact_val(state.get('break_even', ''))}
    
    7. Marketing:
    - Launch Strategy: {compact_val(state.get('launch_strategy', ''))}
    - Channels: {compact_val(state.get('acquisition_channels', []))}
    - Growth Hacks: {compact_val(state.get('growth_hacks', []))}
    
    8. Risks & Mitigations:
    - Risks: {risks_str}
    - Mitigations: {mitigations_str}
    
    9. Pitch Deck:
    - Slides: {pitch_str}
    """

    response_text = await call_agent_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        agent_name="Moderator"
    )

    try:
        data = parse_json_markdown(response_text)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON response from Moderator LLM: {response_text}. Error: {e}")

    # Ensure structured sections match exactly what the frontend requires
    if "compiled_sections" not in data:
        data["compiled_sections"] = {}
        
    compiled = data["compiled_sections"]
    if "reality_check" not in compiled:
        compiled["reality_check"] = {}
        
    rc = compiled["reality_check"]
    # Re-inject/fallback to precise state items to ensure Python integrity & frontend compatibility
    rc["viability_score"] = rc.get("viability_score") or state.get("viability_score", 0)
    rc["viability_grade"] = rc.get("viability_grade") or state.get("viability_grade", "F")
    rc["failure_probability"] = rc.get("failure_probability") or state.get("failure_probability", 0)
    rc["top_failure_reasons"] = rc.get("top_failure_reasons") or state.get("top_failure_reasons", [])
    rc["critical_assumptions"] = rc.get("critical_assumptions") or state.get("critical_assumptions", [])
    rc["recommended_pivots"] = rc.get("recommended_pivots") or state.get("recommended_pivots", {})
    rc["reality_validator_report"] = state.get("reality_validator_report", {})

    # Re-inject/ensure competitor link tags and sources remain intact
    if "competitors" not in compiled:
        compiled["competitors"] = {}
    compiled["competitors"]["list"] = raw_competitors

    if "financials" not in compiled:
        compiled["financials"] = {}
    compiled["financials"]["warnings"] = warnings
    compiled["financials"]["needs_review"] = len(warnings) > 0

    state["report"] = data
    state["current_step"] = "Evaluation"

    await append_run_log(run_id, "Moderator compilation completed.")
    return state

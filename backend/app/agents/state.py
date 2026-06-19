from typing import Dict, Any, List, Optional
from typing_extensions import TypedDict


class AgentState(TypedDict):
    # Base Inputs
    project_id: str
    run_id: Optional[str]
    idea: str
    industry: Optional[str]
    target_audience: Optional[str]
    
    # Run Control
    current_step: str
    human_feedbacks: List[Dict[str, Any]]
    
    # 1. Idea Analyzer outputs
    category: str
    target_users: str
    business_model: str
    assumptions: str
    
    # 2. Market Research outputs
    market_demand: str
    tam: str
    sam: str
    som: str
    market_trends: str
    
    # 3. Competitor Intelligence outputs
    competitors: List[Dict[str, Any]]
    positioning: str
    opportunities: str
    
    # 4. Technical Architect outputs
    tech_stack: str
    architecture: str
    infra_costs: str
    
    # 5. MVP Planner outputs
    mvp_features: List[Dict[str, Any]]
    priority_backlog: List[str]
    roadmap: List[Dict[str, Any]]
    
    # 6. Financial Planning outputs
    revenue_model: str
    projections: Dict[str, Any]
    break_even: str
    
    # 7. Marketing Strategy outputs
    launch_strategy: str
    acquisition_channels: List[str]
    growth_hacks: List[str]
    
    # 8. Risk Analysis outputs
    risks: List[Dict[str, Any]]
    mitigations: List[Dict[str, Any]]
    
    # 9. Pitch Deck outputs
    pitch_deck: List[Dict[str, Any]]

    # Reality Validator outputs
    viability_score: float
    viability_grade: str
    failure_probability: float
    top_failure_reasons: List[str]
    critical_assumptions: List[str]
    recommended_pivots: Dict[str, Any]
    reality_validator_report: Dict[str, Any]
    
    # 10. Moderator outputs
    report: Dict[str, Any]
    
    # 11. Evaluation outputs
    eval_validation: Dict[str, Any]
    confidence_score: float
    hallucinations: List[str]


class BoardMeetingState(TypedDict):
    project_id: str
    meeting_id: str
    topic: str
    startup_profile: Dict[str, Any]
    report_context: Dict[str, Any]
    current_round: int
    max_rounds: int
    debate_history: List[Dict[str, Any]]  # {"agent_name": str, "content": str, "stance": str, "agreements": list, "disagreements": list}
    votes: Dict[str, Dict[str, Any]]      # Agent -> {"vote": str, "confidence": float, "rationale": str}
    current_agent: str
    consensus_metrics: Dict[str, Any]
    action_items: List[str]
    summary: str


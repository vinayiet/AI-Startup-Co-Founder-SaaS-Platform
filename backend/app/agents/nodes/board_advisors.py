import json
import logging
import uuid
from typing import Dict, Any, List
from sqlalchemy import text
from app.db.session import AsyncSessionLocal
from app.agents.state import BoardMeetingState
from app.agents.nodes.base import call_agent_llm, parse_json_markdown, append_run_log

logger = logging.getLogger("app.agents.board_advisors")

ADVISOR_PROMPTS = {
    "CEO Advisor": (
        "You are the CEO Advisor on the Virtual Board of Directors. You focus on strategic alignment, "
        "execution velocity, customer validation, and organizational growth. Protect the startup's speed and vision. "
        "Always push back on over-engineering, unnecessary operational delays, or excessive legal friction."
    ),
    "CTO Advisor": (
        "You are the CTO Advisor on the Virtual Board of Directors. You assess technological feasibility, "
        "complexity, infrastructure costs, and architectural debt. Ensure engineering integrity. "
        "Always challenge unrealistic PM features or high scaling complexity that does not match early MVP stages."
    ),
    "CFO Advisor": (
        "You are the CFO Advisor on the Virtual Board of Directors. You manage financial planning, burn rate, "
        "runway metrics, and pricing models. Protect unit economics. Always query CAC ratios and pricing margins, "
        "and push back on expensive marketing plans or headcount additions that deplete the runway."
    ),
    "Investor Advisor": (
        "You are the Investor Advisor representing venture capital views. You evaluate market size (TAM/SAM/SOM), "
        "investment readiness, ROI, and fundraising timelines. Push back on local market models that lack scaling potential "
        "or ideas with weak defensive moats."
    ),
    "Marketing Advisor": (
        "You are the Marketing Advisor on the Virtual Board of Directors. You focus on customer acquisition channels, "
        "CAC limits, growth loops, and brand positioning. Always look for creative partnerships and viral mechanisms "
        "to reduce spending."
    ),
    "Product Advisor": (
        "You are the Product Advisor (PM) on the Virtual Board of Directors. You focus on feature priority, backlog, "
        "MVP definition, and user experience. Prevent feature creep and ensure a tight feedback loop with customers."
    ),
    "Legal Advisor": (
        "You are the Legal Advisor on the Virtual Board of Directors. You check compliance, regulatory hurdles, "
        "data privacy (GDPR, etc.), contract vulnerabilities, and IP safety. Alert the board on high-liability moves."
    ),
    "Operations Advisor": (
        "You are the Operations Advisor on the Virtual Board of Directors. You focus on operational processes, "
        "hiring models, vendor agreements, and execution logistics. Identify execution bottlenecks early."
    ),
    "Risk Advisor": (
        "You are the Risk Advisor on the Virtual Board of Directors. You stress-test system failures, competitor threats, "
        "market timing issues, and user churn. Be highly analytical and map defensive countermeasures."
    ),
    "Customer Representative": (
        "You are the Customer Representative Advisor. You advocate directly for the target user base. You challenge "
        "pricing sensitivity, product onboarding complexity, usability issues, and whether the value proposition solves actual pain."
    ),
    "Moderator Advisor": (
        "You are the Board Moderator. Your job is to facilitate the discussion, introduce the meeting topic, "
        "identify core contradictions between advisors, prompt votes, and summarize meeting actions. Remain objective."
    )
}


async def run_advisor_debate_node(state: BoardMeetingState, agent_name: str) -> BoardMeetingState:
    meeting_id = state.get("meeting_id")
    topic = state.get("topic")
    current_round = state.get("current_round", 1)
    
    # 1. Format available reports and history context
    profile = state.get("startup_profile", {})
    context = state.get("report_context", {})
    history = state.get("debate_history", [])
    
    formatted_history = ""
    for entry in history:
        formatted_history += f"\n- {entry['agent_name']} (Stance: {entry['stance']}): {entry['content']}\n"
        
    system_prompt = (
        f"{ADVISOR_PROMPTS[agent_name]}\n\n"
        "You are participating in a multi-agent board meeting debate. Your output must challenge other advisors "
        "and maintain your persona's core principles. Do not repeat what has already been said.\n\n"
        "Return your debate stance strictly in JSON format with these exact keys:\n"
        "{\n"
        '  "stance": "supportive / skeptical / neutral",\n'
        '  "content": "a 3-4 sentence detailed professional critique/opinion targeting the topic and preceding points.",\n'
        '  "agreements": ["Agent name you agree with", ...],\n'
        '  "disagreements": ["Agent name you challenge/disagree with", ...]\n'
        "}"
    )
    
    user_prompt = f"""
    Board Meeting Topic: {topic}
    Current Debate Round: {current_round}
    
    Startup Profile:
    - Description: {profile.get('description', '')}
    - Stage: {profile.get('stage', '')}
    - Budget: {profile.get('budget', 0.0)}
    - Geography: {profile.get('geography', '')}
    - Model: {profile.get('business_model', '')}
    
    Validation Context:
    - Competitors: {context.get('competitors', '')}
    - Tech Stack: {context.get('tech_stack', '')}
    - Financials: {context.get('financials', '')}
    - Risks: {context.get('risks', '')}
    
    Debate History:
    {formatted_history or "No previous discussion. You are opening the round."}
    """
    
    # Send WebSocket log to Redis
    try:
        import redis
        from app.core.config import settings
        r = redis.Redis.from_url(settings.REDIS_URL)
        r.publish(f"meeting:{meeting_id}", json.dumps({
            "status": "running",
            "log": f"[{agent_name}] Analyzing startup report context and formulating argument..."
        }))
    except Exception:
        pass

    response = await call_agent_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        agent_name=agent_name
    )
    
    data = parse_json_markdown(response)
    
    # Compile output entry
    entry = {
        "agent_name": agent_name,
        "content": data.get("content", ""),
        "stance": data.get("stance", "neutral"),
        "agreements": list(data.get("agreements", [])),
        "disagreements": list(data.get("disagreements", []))
    }
    
    # 2. Persist Round directly to PostgreSQL Database
    async with AsyncSessionLocal() as db:
        await db.execute(
            text(
                "INSERT INTO board_debate_rounds (id, meeting_id, agent_name, round_number, content, stance, agreements, disagreements, created_at) "
                "VALUES (:id, :mid, :name, :round, :content, :stance, :agreements, :disagreements, NOW())"
            ),
            {
                "id": uuid.uuid4(),
                "mid": meeting_id,
                "name": agent_name,
                "round": current_round,
                "content": entry["content"],
                "stance": entry["stance"],
                "agreements": json.dumps(entry["agreements"]),
                "disagreements": json.dumps(entry["disagreements"])
            }
        )
        await db.commit()
        
    state["debate_history"].append(entry)
    state["current_agent"] = agent_name
    
    # Broadcast argument details to UI
    try:
        r.publish(f"meeting:{meeting_id}", json.dumps({
            "status": "running",
            "agent_name": agent_name,
            "stance": entry["stance"],
            "content": entry["content"],
            "agreements": entry["agreements"],
            "disagreements": entry["disagreements"]
        }))
    except Exception:
        pass
        
    return state


async def run_advisor_vote_node(state: BoardMeetingState, agent_name: str) -> BoardMeetingState:
    meeting_id = state.get("meeting_id")
    topic = state.get("topic")
    history = state.get("debate_history", [])
    
    formatted_history = ""
    for entry in history:
        formatted_history += f"\n- {entry['agent_name']}: {entry['content']}\n"

    system_prompt = (
        f"{ADVISOR_PROMPTS[agent_name]}\n\n"
        "The board meeting debate has ended. You must cast your final vote on the topic.\n"
        "Return your vote strictly in JSON format with these exact keys:\n"
        "{\n"
        '  "vote": "Approve / Approve with Caution / Reject",\n'
        '  "confidence": 0.0-1.0,\n'
        '  "rationale": "a 2-sentence explanation of your final stance."\n'
        "}"
    )
    
    user_prompt = f"""
    Board Meeting Topic: {topic}
    
    Debate Transcript:
    {formatted_history}
    """
    
    response = await call_agent_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        agent_name=agent_name
    )
    
    data = parse_json_markdown(response)
    
    vote_entry = {
        "vote": data.get("vote", "Approve with Caution"),
        "confidence": float(data.get("confidence", 0.7)),
        "rationale": data.get("rationale", "")
    }
    
    # Persist vote directly to PostgreSQL
    async with AsyncSessionLocal() as db:
        await db.execute(
            text(
                "INSERT INTO board_votes (id, meeting_id, agent_name, vote, confidence, rationale, created_at) "
                "VALUES (:id, :mid, :name, :vote, :conf, :rat, NOW())"
            ),
            {
                "id": uuid.uuid4(),
                "mid": meeting_id,
                "name": agent_name,
                "vote": vote_entry["vote"],
                "conf": vote_entry["confidence"],
                "rat": vote_entry["rationale"]
            }
        )
        await db.commit()
        
    state["votes"][agent_name] = vote_entry
    return state

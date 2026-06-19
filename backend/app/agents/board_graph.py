import json
import logging
import uuid
from sqlalchemy import select, text
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from app.db.session import AsyncSessionLocal
from app.db.base import Project, Report, BoardMeeting, WorkflowRun
from app.agents.state import BoardMeetingState
from app.agents.nodes.base import call_agent_llm, parse_json_markdown, append_run_log
from app.agents.nodes.board_advisors import run_advisor_debate_node, run_advisor_vote_node, ADVISOR_PROMPTS

logger = logging.getLogger("app.agents.board_graph")


async def profile_ingestion_node(state: BoardMeetingState) -> BoardMeetingState:
    pid = state.get("project_id")
    meeting_id = state.get("meeting_id")
    
    async with AsyncSessionLocal() as db:
        # Load project details
        res = await db.execute(select(Project).filter(Project.id == pid))
        project = res.scalars().first()
        if not project:
            raise ValueError(f"Project {pid} not found for board context.")
            
        # Safely fetch extra profile information from the latest completed WorkflowRun if available
        business_model = "B2B SaaS"
        geography = "Global"
        stage = "Pre-seed"
        team_size = "1-10"
        budget = 0.0
        existing_revenue = 0.0
        
        res_run = await db.execute(
            select(WorkflowRun)
            .filter(WorkflowRun.project_id == pid)
            .filter(WorkflowRun.status == "completed")
            .order_by(WorkflowRun.created_at.desc())
            .limit(1)
        )
        latest_run = res_run.scalars().first()
        if latest_run and latest_run.state_snapshot:
            snap = latest_run.state_snapshot
            business_model = snap.get("business_model", business_model)
            geography = snap.get("geography", geography)
            stage = snap.get("stage", stage)
            team_size = snap.get("team_size", team_size)
            budget = float(snap.get("budget", budget))
            existing_revenue = float(snap.get("existing_revenue", existing_revenue))

        state["startup_profile"] = {
            "name": project.name,
            "description": project.description,
            "industry": project.industry or "Technology",
            "target_audience": project.target_audience or "General Users",
            "geography": geography,
            "business_model": business_model,
            "team_size": team_size,
            "stage": stage,
            "budget": budget,
            "existing_revenue": existing_revenue
        }
        
        # Load latest report
        res = await db.execute(
            select(Report)
            .filter(Report.project_id == pid)
            .order_by(Report.created_at.desc())
            .limit(1)
        )
        report = res.scalars().first()
        
        if report and report.sections:
            sections = report.sections
            state["report_context"] = {
                "competitors": json.dumps(sections.get("competitors", {}), separators=(',', ':')),
                "tech_stack": json.dumps(sections.get("technical", {}), separators=(',', ':')),
                "financials": json.dumps(sections.get("financials", {}), separators=(',', ':')),
                "risks": json.dumps(sections.get("risks", {}), separators=(',', ':'))
            }
        else:
            state["report_context"] = {
                "competitors": "No competitor reports found.",
                "tech_stack": "No architecture reports found.",
                "financials": "No financials reports found.",
                "risks": "No risks reports found."
            }
            
    # Send WebSocket update
    try:
        import redis
        from app.core.config import settings
        r = redis.Redis.from_url(settings.REDIS_URL)
        r.publish(f"meeting:{meeting_id}", json.dumps({
            "status": "running",
            "log": "[Moderator] Ingested project context and previous validation reports successfully."
        }))
    except Exception:
        pass

    return state


async def moderator_introduction_node(state: BoardMeetingState) -> BoardMeetingState:
    meeting_id = state.get("meeting_id")
    topic = state.get("topic")
    profile = state.get("startup_profile", {})
    
    system_prompt = ADVISOR_PROMPTS["Moderator Advisor"]
    user_prompt = f"""
    Please introduce the active board meeting topic to all the board members:
    Startup Name: {profile.get('name', 'The Startup')}
    Topic: {topic}
    
    Write an introductory statement framing the problem, establishing context, and inviting the CEO to propose their stance.
    Your output must be JSON formatted:
    {{
      "content": "Opening speech text..."
    }}
    """
    
    response = await call_agent_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        agent_name="Moderator Advisor"
    )
    data = parse_json_markdown(response)
    content = data.get("content", f"Welcome board members. Today we are debating: {topic}. Let's begin.")
    
    # Save round to DB
    async with AsyncSessionLocal() as db:
        await db.execute(
            text(
                "INSERT INTO board_debate_rounds (id, meeting_id, agent_name, round_number, content, stance, agreements, disagreements, created_at) "
                "VALUES (:id, :mid, 'Moderator Advisor', 1, :content, 'neutral', '[]', '[]', NOW())"
            ),
            {"id": uuid.uuid4(), "mid": meeting_id, "content": content}
        )
        await db.commit()
        
    state["debate_history"].append({
        "agent_name": "Moderator Advisor",
        "content": content,
        "stance": "neutral",
        "agreements": [],
        "disagreements": []
    })
    
    # WebSocket broadcast
    try:
        import redis
        from app.core.config import settings
        r = redis.Redis.from_url(settings.REDIS_URL)
        r.publish(f"meeting:{meeting_id}", json.dumps({
            "status": "running",
            "agent_name": "Moderator Advisor",
            "stance": "neutral",
            "content": content,
            "agreements": [],
            "disagreements": []
        }))
    except Exception:
        pass
        
    return state


async def compile_results_node(state: BoardMeetingState) -> BoardMeetingState:
    meeting_id = state.get("meeting_id")
    topic = state.get("topic")
    votes = state.get("votes", {})
    history = state.get("debate_history", [])
    
    # 1. Consensus voting metrics calculation
    weights = {
        "CEO Advisor": 2.0,
        "CTO Advisor": 2.5,
        "CFO Advisor": 2.5,
        "Investor Advisor": 2.0,
        "Marketing Advisor": 1.0,
        "Product Advisor": 1.0,
        "Legal Advisor": 1.0,
        "Operations Advisor": 1.0,
        "Risk Advisor": 1.5,
        "Customer Representative": 1.0
    }
    
    total_weight = 0.0
    weighted_sum = 0.0
    vote_distribution = {"Approve": 0, "Approve with Caution": 0, "Reject": 0}
    
    for agent, info in votes.items():
        weight = weights.get(agent, 1.0)
        total_weight += weight
        vote_str = info.get("vote", "Approve with Caution")
        
        # Map vote string to score value
        if vote_str == "Approve":
            val = 1.0
            vote_distribution["Approve"] += 1
        elif vote_str == "Approve with Caution":
            val = 0.5
            vote_distribution["Approve with Caution"] += 1
        else:
            val = -1.0
            vote_distribution["Reject"] += 1
            
        weighted_sum += (val * weight)
        
    decision_score = weighted_sum / total_weight if total_weight > 0 else 0.5
    
    if decision_score >= 0.5:
        final_decision = "Approved"
    elif decision_score >= 0.0:
        final_decision = "Approved with Caution"
    else:
        final_decision = "Rejected"
        
    # Average advisor confidence score
    confidences = [info.get("confidence", 0.7) for info in votes.values()]
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0.7
    
    # 2. Call LLM to summarize the meeting consensus & compile action items
    formatted_debate = ""
    for entry in history:
        formatted_debate += f"\n- {entry['agent_name']}: {entry['content']}\n"
        
    formatted_votes = ""
    for agent, info in votes.items():
        formatted_votes += f"- {agent}: Vote: {info['vote']}, Rationale: {info['rationale']}\n"
        
    system_prompt = ADVISOR_PROMPTS["Moderator Advisor"]
    user_prompt = f"""
    You are compiling the final board resolution summary.
    Topic: {topic}
    Final Board Decision: {final_decision} (Consensus Score: {decision_score})
    
    Debate Transcript:
    {formatted_debate}
    
    Advisor Votes:
    {formatted_votes}
    
    Write an executive summary of the meeting, highlight key concerns raised by skeptics, and list exactly 4 concrete action items.
    Your output must be JSON formatted:
    {{
      "summary": "Cohesive board meeting summary...",
      "action_items": ["Action 1", "Action 2", "Action 3", "Action 4"]
    }}
    """
    
    response = await call_agent_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        agent_name="Moderator Advisor"
    )
    data = parse_json_markdown(response)
    summary_text = data.get("summary", "Board meeting completed.")
    actions = data.get("action_items", [])
    
    # 3. Update BoardMeeting table in DB
    async with AsyncSessionLocal() as db:
        await db.execute(
            text(
                "UPDATE board_meetings SET "
                "status = 'completed', "
                "final_decision = :decision, "
                "confidence_score = :conf, "
                "summary = :summary, "
                "action_items = :actions, "
                "updated_at = NOW() "
                "WHERE id = :mid"
            ),
            {
                "mid": meeting_id,
                "decision": final_decision,
                "conf": avg_confidence,
                "summary": summary_text,
                "actions": json.dumps(actions)
            }
        )
        await db.commit()
        
    # WebSocket broadcast final completion payload
    try:
        import redis
        from app.core.config import settings
        r = redis.Redis.from_url(settings.REDIS_URL)
        r.publish(f"meeting:{meeting_id}", json.dumps({
            "status": "completed",
            "final_decision": final_decision,
            "confidence_score": avg_confidence,
            "summary": summary_text,
            "vote_distribution": vote_distribution,
            "action_items": actions
        }))
    except Exception:
        pass
        
    return state


# ----------------------------------------------------
#  Async Node Wrapper Factories
# ----------------------------------------------------
def make_debate_node(agent_name: str):
    async def node(state: BoardMeetingState) -> BoardMeetingState:
        return await run_advisor_debate_node(state, agent_name)
    return node


def make_vote_node(agent_name: str):
    async def node(state: BoardMeetingState) -> BoardMeetingState:
        return await run_advisor_vote_node(state, agent_name)
    return node


# ----------------------------------------------------
#  LangGraph Board Meeting Workflow Compilation
# ----------------------------------------------------
workflow = StateGraph(BoardMeetingState)

# Add Nodes
workflow.add_node("profile_ingestion", profile_ingestion_node)
workflow.add_node("moderator_introduction", moderator_introduction_node)

# Debate Nodes
workflow.add_node("ceo_debate", make_debate_node("CEO Advisor"))
workflow.add_node("risk_debate", make_debate_node("Risk Advisor"))
workflow.add_node("cfo_debate", make_debate_node("CFO Advisor"))
workflow.add_node("marketing_debate", make_debate_node("Marketing Advisor"))
workflow.add_node("investor_debate", make_debate_node("Investor Advisor"))
workflow.add_node("customer_debate", make_debate_node("Customer Representative"))
workflow.add_node("cto_debate", make_debate_node("CTO Advisor"))
workflow.add_node("product_debate", make_debate_node("Product Advisor"))
workflow.add_node("legal_debate", make_debate_node("Legal Advisor"))
workflow.add_node("operations_debate", make_debate_node("Operations Advisor"))

# Voting Nodes
workflow.add_node("ceo_vote", make_vote_node("CEO Advisor"))
workflow.add_node("risk_vote", make_vote_node("Risk Advisor"))
workflow.add_node("cfo_vote", make_vote_node("CFO Advisor"))
workflow.add_node("marketing_vote", make_vote_node("Marketing Advisor"))
workflow.add_node("investor_vote", make_vote_node("Investor Advisor"))
workflow.add_node("customer_vote", make_vote_node("Customer Representative"))
workflow.add_node("cto_vote", make_vote_node("CTO Advisor"))
workflow.add_node("product_vote", make_vote_node("Product Advisor"))
workflow.add_node("legal_vote", make_vote_node("Legal Advisor"))
workflow.add_node("operations_vote", make_vote_node("Operations Advisor"))

workflow.add_node("compile_results", compile_results_node)

# Set sequential edges routing debate rounds and voting turns
workflow.set_entry_point("profile_ingestion")
workflow.add_edge("profile_ingestion", "moderator_introduction")

# Debate Sequence
workflow.add_edge("moderator_introduction", "ceo_debate")
workflow.add_edge("ceo_debate", "risk_debate")
workflow.add_edge("risk_debate", "cfo_debate")
workflow.add_edge("cfo_debate", "marketing_debate")
workflow.add_edge("marketing_debate", "investor_debate")
workflow.add_edge("investor_debate", "customer_debate")
workflow.add_edge("customer_debate", "cto_debate")
workflow.add_edge("cto_debate", "product_debate")
workflow.add_edge("product_debate", "legal_debate")
workflow.add_edge("legal_debate", "operations_debate")

# Debate to Vote Transition
workflow.add_edge("operations_debate", "ceo_vote")

# Voting Sequence
workflow.add_edge("ceo_vote", "risk_vote")
workflow.add_edge("risk_vote", "cfo_vote")
workflow.add_edge("cfo_vote", "marketing_vote")
workflow.add_edge("marketing_vote", "investor_vote")
workflow.add_edge("investor_vote", "customer_vote")
workflow.add_edge("customer_vote", "cto_vote")
workflow.add_edge("cto_vote", "product_vote")
workflow.add_edge("product_vote", "legal_vote")
workflow.add_edge("legal_vote", "operations_vote")

# Compile Results
workflow.add_edge("operations_vote", "compile_results")
workflow.add_edge("compile_results", END)

# In-memory checkpointer memory saver configuration
memory = MemorySaver()
compiled_board_graph = workflow.compile(checkpointer=memory)

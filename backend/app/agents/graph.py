from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.runnables import RunnableConfig

# Import nodes
from app.agents.state import AgentState
from app.agents.nodes.idea_analyzer import idea_analyzer_node
from app.agents.nodes.market_research import market_research_node
from app.agents.nodes.competitor import competitor_node
from app.agents.nodes.reality_validator import reality_validator_node
from app.agents.nodes.technical_architect import technical_architect_node
from app.agents.nodes.mvp_planner import mvp_planner_node
from app.agents.nodes.financial_planner import financial_planner_node
from app.agents.nodes.marketing_strategy import marketing_strategy_node
from app.agents.nodes.risk_analysis import risk_analysis_node
from app.agents.nodes.pitch_deck import pitch_deck_node
from app.agents.nodes.moderator import moderator_node
from app.agents.nodes.evaluation import evaluation_node

# Define Graph builder
workflow = StateGraph(AgentState)

# Add all agent nodes
workflow.add_node("idea_analyzer", idea_analyzer_node)
workflow.add_node("market_research", market_research_node)
workflow.add_node("competitor", competitor_node)
workflow.add_node("reality_validator", reality_validator_node)
workflow.add_node("technical_architect", technical_architect_node)
workflow.add_node("mvp_planner", mvp_planner_node)
workflow.add_node("financial_planner", financial_planner_node)
workflow.add_node("marketing_strategy", marketing_strategy_node)
workflow.add_node("risk_analysis", risk_analysis_node)
workflow.add_node("pitch_deck", pitch_deck_node)
workflow.add_node("moderator", moderator_node)
workflow.add_node("evaluation", evaluation_node)

# Set starting point
workflow.set_entry_point("idea_analyzer")

# Set standard sequential routing
workflow.add_edge("idea_analyzer", "market_research")
workflow.add_edge("market_research", "competitor")
workflow.add_edge("competitor", "reality_validator")
workflow.add_edge("reality_validator", "technical_architect")

# Place interrupt checkpoints for user approvals
workflow.add_edge("technical_architect", "mvp_planner")
workflow.add_edge("mvp_planner", "financial_planner")

workflow.add_edge("financial_planner", "marketing_strategy")
workflow.add_edge("marketing_strategy", "risk_analysis")
workflow.add_edge("risk_analysis", "pitch_deck")
workflow.add_edge("pitch_deck", "moderator")
workflow.add_edge("moderator", "evaluation")

# Loop check or end
workflow.add_edge("evaluation", END)

# In-memory checkpointer for managing HITL threads
memory = MemorySaver()

# Compile the graph
compiled_graph = workflow.compile(
    checkpointer=memory,
    interrupt_before=["technical_architect", "mvp_planner"]
)

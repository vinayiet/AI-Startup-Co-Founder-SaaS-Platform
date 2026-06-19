import uuid
import json
import logging
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_db, get_current_user
from app.api.dependencies import get_auth_service
from app.db.base import User, Report, ChatSession
from app.schemas.copilot import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatMessageResponse,
    CopilotAnalyticsResponse,
    DashboardMetricsResponse
)
from app.services.copilot_service import CopilotService
from app.services.auth_service import AuthService
from app.agents.nodes.base import get_llm

logger = logging.getLogger("app.api.v1.copilot")
router = APIRouter()


@router.post("/projects/{project_id}/sessions", response_model=ChatSessionResponse)
async def create_chat_session(
    project_id: uuid.UUID,
    session_in: ChatSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    copilot_service = CopilotService(db)
    session = await copilot_service.create_session(
        user_id=current_user.id,
        project_id=project_id,
        title=session_in.title
    )
    return session


@router.get("/projects/{project_id}/sessions", response_model=List[ChatSessionResponse])
async def list_chat_sessions(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    copilot_service = CopilotService(db)
    sessions = await copilot_service.get_sessions(project_id)
    return sessions


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_session_messages(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    copilot_service = CopilotService(db)
    messages = await copilot_service.get_messages(session_id)
    return messages


@router.get("/projects/{project_id}/analytics", response_model=CopilotAnalyticsResponse)
async def get_copilot_analytics(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    copilot_service = CopilotService(db)
    analytics = await copilot_service.get_project_analytics(project_id)
    return analytics


@router.get("/projects/{project_id}/dashboard-metrics", response_model=DashboardMetricsResponse)
async def get_dashboard_metrics(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve quick statistics from the latest compiled validation report for the dashboard sidebar."""
    copilot_service = CopilotService(db)
    
    # Verify project access
    project = await copilot_service.project_repo.get_project_with_workspace(project_id)
    if not project or str(project.workspace.owner_id) != str(current_user.id):
        raise HTTPException(status_code=404, detail="Project not found or unauthorized")
    
    # Query latest report
    query = select(Report).where(Report.project_id == project_id).order_by(Report.created_at.desc())
    res = await db.execute(query)
    report = res.scalars().first()
    
    if not report or not report.sections:
        return {
            "startup_score": 0.0,
            "competitor_count": 0,
            "risk_score": 0.0,
            "financial_summary": {}
        }
    
    sections = report.sections
    
    # Calculate Competitor count
    comp_list = sections.get("competitors", {}).get("competitors", []) or sections.get("competitors", {}).get("list", [])
    competitor_count = len(comp_list)
    
    # Calculate Risk Score (100 - average of severities or count of high risks)
    risks_list = sections.get("risks", {}).get("risks", []) or sections.get("risks", {}).get("list", [])
    high_risks = len([r for r in risks_list if r.get("severity") == "High"])
    risk_score = min(100.0, max(0.0, 100.0 - (high_risks * 15.0)))
    
    # Extract Startup Confidence Score from Evaluator report
    eval_report = sections.get("evaluation_report", {}) or sections.get("evaluation", {})
    startup_score = eval_report.get("confidence_score", 0.0)
    if startup_score <= 1.0:
        startup_score *= 100.0  # normalize to 0-100 scale
    
    # Financial summary
    financials = sections.get("financials", {}) or sections.get("financial_projections", {})
    projections = financials.get("projections", {})
    break_even = financials.get("break_even", "N/A")
    financial_summary = {
        "break_even": break_even,
        "year_1_revenue": projections.get("Year 1 Total Revenue") or projections.get("Year 1 Revenue") or "N/A",
        "year_1_cost": projections.get("Year 1 Total Cost") or projections.get("Year 1 Cost") or "N/A"
    }
    
    return {
        "startup_score": round(startup_score, 1),
        "competitor_count": competitor_count,
        "risk_score": round(risk_score, 1),
        "financial_summary": financial_summary
    }


@router.websocket("/sessions/{session_id}/chat")
async def stream_copilot_chat(
    websocket: WebSocket,
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    await websocket.accept()
    copilot_service = CopilotService(db)
    
    # 1. Grab token from query parameters and authenticate user
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    auth_service = AuthService(db)
    try:
        user = await auth_service.authenticate_token(token)
    except Exception as e:
        logger.error(f"WebSocket auth failed: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 2. Verify Session belongs to user
    session = await copilot_service.session_repo.get_session_with_project(session_id)
    if not session or str(session.user_id) != str(user.id):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    try:
        while True:
            # Receive prompt from WebSocket
            data = await websocket.receive_text()
            message_payload = json.loads(data)
            user_content = message_payload.get("content", "").strip()
            
            if not user_content:
                continue

            # Track event: User asked a question
            await copilot_service.track_event(
                session.project_id, user.id, "question_asked", {"session_id": str(session.id)}
            )
            
            # Save User Message to DB
            await copilot_service.save_message(
                session_id=session.id,
                role="user",
                content=user_content
            )

            # Define variables
            citations = []
            suggestions = []
            response_content = ""
            
            # Check if this is a slash command
            if user_content.startswith("/"):
                # Track slash command event
                await copilot_service.track_event(
                    session.project_id, user.id, "slash_command_executed", {"command": user_content}
                )
                
                # Fetch latest report for direct queries
                query = select(Report).where(Report.project_id == session.project_id).order_by(Report.created_at.desc())
                res = await db.execute(query)
                report = res.scalars().first()
                
                if not report or not report.sections:
                    err_msg = "No validation reports found for this project. Please execute a validation run first to unlock advanced slash commands."
                    await websocket.send_json({"type": "token", "content": err_msg})
                    await copilot_service.save_message(
                        session_id=session.id,
                        role="assistant",
                        content=err_msg
                    )
                    await websocket.send_json({"type": "done"})
                    continue
                
                command = user_content.split()[0].lower()
                section_data = None
                system_instruction = ""
                
                if command == "/risks":
                    section_data = report.sections.get("risks", {})
                    suggestions = ["How to mitigate high severity risks?", "What are legal risks?", "Compare risk level with competitors"]
                    system_instruction = (
                        "You are an expert Risk Advisor and Investment Specialist. Summarize the following risks "
                        "and mitigation plans for this startup concept. Highlight the high-severity items, "
                        "suggest immediate defensive maneuvers, and explain how to address these risks to investors."
                    )
                elif command == "/roadmap":
                    section_data = report.sections.get("mvp", {})
                    suggestions = ["Can we cut down MVP to 4 weeks?", "Suggest user beta testing timeline", "Estimate total development hours"]
                    system_instruction = (
                        "You are an expert Product Manager and Agile Architect. Summarize the development roadmap and backlog "
                        "details below. Formulate next steps, suggest tech sprints, and describe the build priority."
                    )
                elif command == "/competitors":
                    section_data = report.sections.get("competitors", {})
                    suggestions = ["What is the pricing model strategy?", "How to exploit market gaps?", "Which competitor is the biggest threat?"]
                    system_instruction = (
                        "You are a Competitive Intelligence Lead. Analyze the competitors and pricing structures listed "
                        "below. Identify market vulnerabilities, explain how to establish a moat, and suggest positioning adjustments."
                    )
                elif command == "/financials":
                    section_data = report.sections.get("financials", {})
                    suggestions = ["What are pricing tier recommendations?", "Suggest Year 2 and Year 3 targets", "How to lower cost projections?"]
                    system_instruction = (
                        "You are an expert Startup CFO. Analyze the Year 1 projections and monetization model "
                        "described below. Assess viability, detail cost-reduction paths, and define break-even targets."
                    )
                elif command == "/market":
                    section_data = report.sections.get("market", {})
                    suggestions = ["Suggest expansion strategies", "Define ideal early adopter cohort", "What trends are accelerating?"]
                    system_instruction = (
                        "You are a Venture Capital Associate. Summarize the TAM/SAM/SOM and industry trends "
                        "below. Explain why this opportunity is viable and outline user acquisition priorities."
                    )
                elif command == "/investors":
                    section_data = report.sections
                    suggestions = ["Show pitch deck outline", "Review evaluation grades", "What are top financial stats?"]
                    system_instruction = (
                        "You are an experienced Angel Investor and Mentor. Summarize the entire startup validation report "
                        "into a concise, punchy 3-paragraph investor brief. Highlight validation grades, market size, and why an investor should care."
                    )
                else:
                    err_msg = f"Unknown command: {command}. Supported commands are `/roadmap`, `/investors`, `/competitors`, `/financials`, `/risks`, `/market`."
                    await websocket.send_json({"type": "token", "content": err_msg})
                    await copilot_service.save_message(
                        session_id=session.id,
                        role="assistant",
                        content=err_msg
                    )
                    await websocket.send_json({"type": "done"})
                    continue
                
                # Fetch LLM and execute command
                llm = get_llm()
                prompt_messages = [
                    ("system", system_instruction),
                    ("user", f"Here is the raw report data:\n{json.dumps(section_data, indent=2)}\n\nGenerate the response.")
                ]
                
                if llm:
                    async for chunk in llm.astream(prompt_messages):
                        token_content = chunk.content
                        response_content += token_content
                        await websocket.send_json({"type": "token", "content": token_content})
                else:
                    # Mock response streaming
                    mock_res = f"### [Slash Command Output: {command.upper()}]\n\nHere is a structured advisory brief generated from your project reports:\n- **Primary Status:** Report verified.\n- **Actionable Item:** Review your GTM strategy metrics.\n- **Details:** {json.dumps(section_data)[:120]}..."
                    for word in mock_res.split():
                        await websocket.send_json({"type": "token", "content": word + " "})
                        response_content += word + " "
                        await asyncio.sleep(0.05)
                        
            else:
                # General RAG query
                rag_results = await copilot_service.search_project_knowledge(session.project_id, user_content)
                
                # Format context
                context_str = ""
                for i, hit in enumerate(rag_results):
                    citations.append({
                        "source": hit["metadata"]["source"].replace("report_section_", "").replace("_", " ").title(),
                        "content": hit["content"],
                        "score": hit["score"]
                    })
                    context_str += f"\n- [Source: {citations[-1]['source']}]: {hit['content']}\n"
                
                if not context_str:
                    context_str = "No specific report sections or frameworks were found matching this query. Answer using general co-founder knowledge."

                # Get chat history for conversational memory
                history_msgs = await copilot_service.get_messages(session.id)
                formatted_history = []
                for hm in history_msgs[-6:]:  # include last 6 messages
                    formatted_history.append((hm.role, hm.content))
                
                system_prompt = (
                    "You are the AI Founder Copilot, an elite startup advisor, product architect, and investor. "
                    "You give advice that is highly practical, extremely actionable, and tailored to the founder's startup idea. "
                    "Use the provided report context as your source of truth about the startup. "
                    "Never hallucinate numbers. Answer in clear, markdown formatting. Suggest realistic next steps.\n\n"
                    f"Report Context:\n{context_str}\n"
                )
                
                prompt_messages = [("system", system_prompt)]
                for role, content in formatted_history:
                    prompt_messages.append((role, content))
                prompt_messages.append(("user", user_content))

                llm = get_llm()
                if llm:
                    async for chunk in llm.astream(prompt_messages):
                        token_content = chunk.content
                        response_content += token_content
                        await websocket.send_json({"type": "token", "content": token_content})
                else:
                    # Mock response streaming
                    mock_res = "As your Startup Copilot, based on the report data, you have solid momentum. I recommend focusing on customer validation surveys and tightening your TAM analysis. Let me know if you want to drill into `/risks` or `/roadmap`!"
                    for word in mock_res.split():
                        await websocket.send_json({"type": "token", "content": word + " "})
                        response_content += word + " "
                        await asyncio.sleep(0.05)

                # Set default suggestions
                suggestions = ["Show my top risks", "Compare competitors", "Improve pricing strategy", "Generate roadmap"]

            # Stream dynamic suggested questions and citations
            await websocket.send_json({
                "type": "suggestions",
                "content": suggestions
            })
            await websocket.send_json({
                "type": "citations",
                "content": citations
            })
            
            # Save Assistant Message to DB
            await copilot_service.save_message(
                session_id=session.id,
                role="assistant",
                content=response_content,
                citations=citations,
                suggestions=suggestions
            )
            
            # Send done signal
            await websocket.send_json({"type": "done"})

    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected from session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error in copilot session {session_id}: {e}", exc_info=True)
        try:
            await websocket.send_json({"type": "error", "content": "An internal error occurred."})
        except Exception:
            pass

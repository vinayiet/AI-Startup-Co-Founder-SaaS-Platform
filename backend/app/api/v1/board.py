import json
import uuid
import logging
import asyncio
import redis.asyncio as aioredis
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.db.session import get_db
from app.db.base import Project, BoardMeeting, BoardDebateRound, BoardVote
from app.tasks.board_tasks import run_board_meeting_task
from app.core.config import settings

logger = logging.getLogger("app.api.v1.board")
router = APIRouter()


# ----------------------------------------------------
#  Pydantic Schemas
# ----------------------------------------------------
class MeetingCreate(BaseModel):
    topic: str = Field(..., max_length=500, example="Should we raise a Seed round of ₹5 Crore?")


class DebateRoundResponse(BaseModel):
    id: uuid.UUID
    agent_name: str
    round_number: int
    content: str
    stance: str
    agreements: Optional[List[str]] = []
    disagreements: Optional[List[str]] = []
    created_at: datetime

    class Config:
        from_attributes = True


class VoteResponse(BaseModel):
    id: uuid.UUID
    agent_name: str
    vote: str
    confidence: float
    rationale: str
    created_at: datetime

    class Config:
        from_attributes = True


class MeetingResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    topic: str
    status: str
    final_decision: Optional[str] = None
    confidence_score: float
    summary: Optional[str] = None
    action_items: Optional[List[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MeetingDetailsResponse(MeetingResponse):
    rounds: List[DebateRoundResponse] = []
    votes: List[VoteResponse] = []


# ----------------------------------------------------
#  FastAPI Router Endpoints
# ----------------------------------------------------
@router.post("/projects/{project_id}/meetings", response_model=MeetingResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_board_meeting(project_id: uuid.UUID, payload: MeetingCreate, db: AsyncSession = Depends(get_db)):
    # 1. Check if project exists
    res = await db.execute(select(Project).filter(Project.id == project_id))
    project = res.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found."
        )
        
    # 2. Check if a board meeting is already running for this project
    res = await db.execute(
        select(BoardMeeting)
        .filter(BoardMeeting.project_id == project_id)
        .filter(BoardMeeting.status.in_(["pending", "running"]))
    )
    active_meeting = res.scalars().first()
    if active_meeting:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A board meeting is already running for this project. Please wait until it completes."
        )
        
    # 3. Create BoardMeeting row in DB
    meeting = BoardMeeting(
        id=uuid.uuid4(),
        project_id=project_id,
        topic=payload.topic,
        status="pending",
        confidence_score=0.0
    )
    db.add(meeting)
    await db.commit()
    await db.refresh(meeting)
    
    # 4. Trigger Celery Task Asynchronously
    run_board_meeting_task.delay(str(meeting.id))
    
    return meeting


@router.get("/projects/{project_id}/meetings", response_model=List[MeetingResponse])
async def list_board_meetings(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(BoardMeeting)
        .filter(BoardMeeting.project_id == project_id)
        .order_by(BoardMeeting.created_at.desc())
    )
    meetings = res.scalars().all()
    return meetings


@router.get("/meetings/{meeting_id}", response_model=MeetingDetailsResponse)
async def get_board_meeting_details(meeting_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(BoardMeeting).filter(BoardMeeting.id == meeting_id))
    meeting = res.scalars().first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Board meeting with ID {meeting_id} not found."
        )
        
    # Load debate rounds
    res = await db.execute(
        select(BoardDebateRound)
        .filter(BoardDebateRound.meeting_id == meeting_id)
        .order_by(BoardDebateRound.created_at.asc())
    )
    rounds = res.scalars().all()
    
    # Load final votes
    res = await db.execute(
        select(BoardVote)
        .filter(BoardVote.meeting_id == meeting_id)
        .order_by(BoardVote.created_at.asc())
    )
    votes = res.scalars().all()
    
    # Build list objects mapping formats
    rounds_list = []
    for r in rounds:
        rounds_list.append(DebateRoundResponse(
            id=r.id,
            agent_name=r.agent_name,
            round_number=r.round_number,
            content=r.content,
            stance=r.stance,
            agreements=r.agreements or [],
            disagreements=r.disagreements or [],
            created_at=r.created_at
        ))
        
    votes_list = []
    for v in votes:
        votes_list.append(VoteResponse(
            id=v.id,
            agent_name=v.agent_name,
            vote=v.vote,
            confidence=v.confidence,
            rationale=v.rationale,
            created_at=v.created_at
        ))
        
    details = MeetingDetailsResponse(
        id=meeting.id,
        project_id=meeting.project_id,
        topic=meeting.topic,
        status=meeting.status,
        final_decision=meeting.final_decision,
        confidence_score=meeting.confidence_score,
        summary=meeting.summary,
        action_items=meeting.action_items or [],
        created_at=meeting.created_at,
        rounds=rounds_list,
        votes=votes_list
    )
    return details


# ----------------------------------------------------
#  WebSocket Streaming Route
# ----------------------------------------------------
@router.websocket("/meetings/{meeting_id}/stream")
async def stream_meeting(websocket: WebSocket, meeting_id: uuid.UUID):
    await websocket.accept()
    
    # Establish async redis connection and subscribe
    r = aioredis.from_url(settings.REDIS_URL)
    pubsub = r.pubsub()
    await pubsub.subscribe(f"meeting:{meeting_id}")
    
    try:
        while True:
            # Check for Redis messages
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message:
                data = message["data"].decode("utf-8")
                await websocket.send_text(data)
                
                # If completed or failed, close the WebSocket nicely
                payload = json.loads(data)
                if payload.get("status") in ["completed", "failed"]:
                    break
            else:
                # Keepalive ping to check if client is still there
                await websocket.send_json({"ping": True})
            await asyncio.sleep(0.1)
    except Exception as e:
        logger.error(f"WebSocket client disconnected or encountered error: {e}")
    finally:
        await pubsub.unsubscribe(f"meeting:{meeting_id}")
        await websocket.close()

import asyncio
import logging
from celery.utils.log import get_task_logger
from app.tasks.celery_app import celery_app
from app.db.session import AsyncSessionLocal
from app.db.base import BoardMeeting
from app.agents.board_graph import compiled_board_graph
from sqlalchemy import select

logger = get_task_logger(__name__)


def run_async(coro):
    # Runs async coroutines inside Celery worker thread
    return asyncio.get_event_loop().run_until_complete(coro)


@celery_app.task(name="run_board_meeting_task")
def run_board_meeting_task(meeting_id_str: str):
    logger.info(f"Starting Celery board meeting task for meeting_id: {meeting_id_str}")
    run_async(_execute_board_meeting(meeting_id_str))


async def _execute_board_meeting(meeting_id_str: str):
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(BoardMeeting).filter(BoardMeeting.id == meeting_id_str))
        meeting = res.scalars().first()
        if not meeting:
            logger.error(f"Board meeting not found: {meeting_id_str}")
            return
            
        meeting.status = "running"
        await db.commit()
        
    config = {"configurable": {"thread_id": meeting_id_str}}
    
    try:
        initial_state = {
            "project_id": str(meeting.project_id),
            "meeting_id": meeting_id_str,
            "topic": meeting.topic,
            "startup_profile": {},
            "report_context": {},
            "current_round": 1,
            "max_rounds": 1,
            "debate_history": [],
            "votes": {},
            "current_agent": "",
            "consensus_metrics": {},
            "action_items": [],
            "summary": ""
        }
        
        await compiled_board_graph.ainvoke(initial_state, config=config)
        logger.info(f"Board meeting graph execution completed successfully: {meeting_id_str}")
        
    except Exception as e:
        logger.exception(f"Exception raised in board meeting workflow run {meeting_id_str}: {e}")
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(BoardMeeting).filter(BoardMeeting.id == meeting_id_str))
            meeting = res.scalars().first()
            if meeting:
                meeting.status = "failed"
                meeting.summary = f"Execution failed: {str(e)}"
                await db.commit()
                
        # Send WebSocket failure broadcast
        try:
            import redis
            import json
            from app.core.config import settings
            r = redis.Redis.from_url(settings.REDIS_URL)
            r.publish(f"meeting:{meeting_id_str}", json.dumps({
                "status": "failed",
                "summary": f"Execution failed: {str(e)}"
            }))
        except Exception:
            pass

import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from qdrant_client.http import models

from app.db.base import ChatSession, ChatMessage, CopilotAnalytics, Report
from app.repositories.copilot import ChatSessionRepository, ChatMessageRepository, CopilotAnalyticsRepository
from app.repositories.project import ProjectRepository
from app.rag.ingestion import IngestionPipeline, ingestion_pipeline
from app.rag.connection import qdrant_manager

logger = logging.getLogger("app.services.copilot_service")


class CopilotService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.session_repo = ChatSessionRepository(db)
        self.message_repo = ChatMessageRepository(db)
        self.analytics_repo = CopilotAnalyticsRepository(db)
        self.project_repo = ProjectRepository(db)
        self.qdrant_client = qdrant_manager.get_client()
        self.collection_name = qdrant_manager.collection_name

    async def get_sessions(self, project_id: uuid.UUID) -> List[ChatSession]:
        return await self.session_repo.get_by_project(str(project_id))

    async def create_session(self, user_id: uuid.UUID, project_id: uuid.UUID, title: str) -> ChatSession:
        session_data = {
            "project_id": project_id,
            "user_id": user_id,
            "title": title
        }
        session = await self.session_repo.create(session_data)
        await self.db.commit()
        await self.track_event(project_id, user_id, "chat_start", {"session_id": str(session.id)})
        return session

    async def get_messages(self, session_id: uuid.UUID) -> List[ChatMessage]:
        return await self.message_repo.get_by_session(str(session_id))

    async def save_message(
        self,
        session_id: uuid.UUID,
        role: str,
        content: str,
        citations: Optional[List[Dict[str, Any]]] = None,
        suggestions: Optional[List[str]] = None
    ) -> ChatMessage:
        message_data = {
            "session_id": session_id,
            "role": role,
            "content": content,
            "citations": citations,
            "suggestions": suggestions
        }
        msg = await self.message_repo.create(message_data)
        await self.db.commit()
        return msg

    async def track_event(self, project_id: uuid.UUID, user_id: uuid.UUID, event_type: str, payload: dict) -> CopilotAnalytics:
        analytics_data = {
            "project_id": project_id,
            "user_id": user_id,
            "event_type": event_type,
            "payload": payload
        }
        event = await self.analytics_repo.create(analytics_data)
        await self.db.commit()
        return event

    async def get_project_analytics(self, project_id: uuid.UUID) -> Dict[str, Any]:
        # Simple aggregated count metrics
        from sqlalchemy import func, select
        
        # Total chats
        chat_count_query = select(func.count(ChatSession.id)).where(ChatSession.project_id == project_id)
        chat_count_res = await self.db.execute(chat_count_query)
        total_chats = chat_count_res.scalar() or 0

        # Questions asked
        q_count_query = select(func.count(ChatMessage.id)).join(ChatSession).where(
            ChatSession.project_id == project_id, ChatMessage.role == "user"
        )
        q_count_res = await self.db.execute(q_count_query)
        total_questions = q_count_res.scalar() or 0

        # Slash commands count
        slash_query = select(func.count(CopilotAnalytics.id)).where(
            CopilotAnalytics.project_id == project_id, CopilotAnalytics.event_type == "slash_command_executed"
        )
        slash_res = await self.db.execute(slash_query)
        total_slash = slash_res.scalar() or 0

        return {
            "total_chats": total_chats,
            "questions_asked": total_questions,
            "slash_commands_used": total_slash
        }

    async def ingest_report_to_qdrant(self, report: Report) -> int:
        """Parses report sections, converts them into chunks, and indexes them in Qdrant with project_id filters."""
        try:
            sections = report.sections or {}
            total_chunks = 0
            
            for section_name, section_data in sections.items():
                if not section_data:
                    continue
                
                # Format section content into highly descriptive paragraphs
                text_blocks = []
                if isinstance(section_data, dict):
                    for key, val in section_data.items():
                        if isinstance(val, list):
                            val_str = "\n".join([f"- {str(item)}" for item in val])
                        elif isinstance(val, dict):
                            val_str = "\n".join([f"{k}: {str(v)}" for k, v in val.items()])
                        else:
                            val_str = str(val)
                        text_blocks.append(f"### {key.replace('_', ' ').title()}\n{val_str}")
                elif isinstance(section_data, list):
                    for item in section_data:
                        text_blocks.append(str(item))
                else:
                    text_blocks.append(str(section_data))
                
                combined_text = f"## {section_name.replace('_', ' ').title()}\n\n" + "\n\n".join(text_blocks)
                
                metadata = {
                    "project_id": str(report.project_id),
                    "source": f"report_section_{section_name}",
                    "category": "startup_report"
                }
                
                chunks_written = ingestion_pipeline.ingest_text(combined_text, metadata)
                total_chunks += chunks_written
                
            logger.info(f"Ingested {total_chunks} chunks to Qdrant for project {report.project_id}")
            return total_chunks
        except Exception as e:
            logger.error(f"Failed to ingest report to Qdrant: {e}", exc_info=True)
            return 0

    async def search_project_knowledge(self, project_id: uuid.UUID, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Performs vector search on Qdrant, filtered to include ONLY the target project's details."""
        try:
            # 1. Embed Query
            query_vector = ingestion_pipeline._get_embedding(query)

            # 2. Construct project_id filter
            query_filter = models.Filter(
                must=[
                    models.FieldCondition(
                        key="project_id",
                        match=models.MatchValue(value=str(project_id))
                    )
                ]
            )

            # 3. Query Qdrant
            search_results = self.qdrant_client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                query_filter=query_filter,
                limit=limit
            )

            if not search_results or not search_results.points:
                return []

            results = []
            for res in search_results.points:
                payload = res.payload
                results.append({
                    "content": payload.get("content", ""),
                    "score": res.score,
                    "metadata": {
                        "source": payload.get("source", "unknown"),
                        "category": payload.get("category", "general"),
                        "chunk_index": payload.get("chunk_index", 0)
                    }
                })
            return results
        except Exception as e:
            logger.error(f"Error searching project knowledge in Qdrant: {e}", exc_info=True)
            return []

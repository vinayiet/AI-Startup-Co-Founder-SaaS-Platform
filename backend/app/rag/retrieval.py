import logging
from typing import List, Dict, Any, Optional
import cohere
from app.core.config import settings
from app.rag.connection import qdrant_manager
from app.rag.ingestion import IngestionPipeline
from qdrant_client.http import models

logger = logging.getLogger("app.rag.retrieval")


class RAGRetriever:
    def __init__(self):
        self.qdrant_client = qdrant_manager.get_client()
        self.collection_name = qdrant_manager.collection_name
        self.ingestion = IngestionPipeline()
        
        # Setup Cohere Client
        if settings.COHERE_API_KEY and settings.COHERE_API_KEY != "mock-cohere-key":
            self.cohere_client = cohere.Client(api_key=settings.COHERE_API_KEY)
        else:
            self.cohere_client = None

    def retrieve(self, query: str, project_id: Optional[str] = None, top_k: int = 5) -> List[Dict[str, Any]]:
        try:
            # Step 1: Embed Query
            query_vector = self.ingestion._get_embedding(query)

            # Step 2: Query Qdrant with project filter if provided
            query_filter = None
            if project_id:
                query_filter = models.Filter(
                    should=[
                        models.FieldCondition(
                            key="project_id",
                            match=models.MatchValue(value=str(project_id))
                        ),
                        models.IsEmptyCondition(
                            is_empty=models.PayloadField(key="project_id")
                        )
                    ]
                )

            # Pull top 15 candidates for re-ranking
            search_results = self.qdrant_client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                query_filter=query_filter,
                limit=15
            )

            if not search_results or not search_results.points:
                return []

            # Structure retrieved items
            candidates = []
            for res in search_results.points:
                candidates.append({
                    "content": res.payload.get("content", ""),
                    "score": res.score,
                    "metadata": {
                        "source_title": res.payload.get("source_title", "Unknown Source"),
                        "chapter": res.payload.get("chapter", "N/A"),
                        "page": res.payload.get("page", "N/A"),
                        "quote": res.payload.get("quote", "")
                    }
                })

            # Step 3: Re-rank if Cohere is available
            if self.cohere_client and len(candidates) > 1:
                try:
                    docs = [c["content"] for c in candidates]
                    rerank_response = self.cohere_client.rerank(
                        model="rerank-english-v3.0",
                        query=query,
                        documents=docs,
                        top_n=top_k
                    )
                    
                    reranked_results = []
                    for item in rerank_response.results:
                        idx = item.index
                        candidate = candidates[idx]
                        candidate["re_rank_score"] = item.relevance_score
                        reranked_results.append(candidate)
                        
                    return reranked_results
                except Exception as e:
                    logger.warning(f"Cohere re-ranking failed, falling back to direct similarity: {e}")

            # Return top_k candidates directly
            return candidates[:top_k]
        except Exception as e:
            logger.error(f"RAG retrieval process encountered an error: {e}")
            return []


rag_retriever = RAGRetriever()

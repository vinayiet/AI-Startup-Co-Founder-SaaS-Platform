from langchain_openai import OpenAIEmbeddings
from qdrant_client.http import models
from app.core.config import settings
from app.rag.client import qdrant_client, COLLECTION_NAME
import cohere
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class RAGPipeline:
    def __init__(self):
        openai_key = settings.OPENAI_API_KEY if settings.OPENAI_API_KEY != "mock-openai-key" else "dummy-key"
        self.embeddings = OpenAIEmbeddings(
            openai_api_key=openai_key,
            model="text-embedding-3-small"
        )
        
        self.cohere_client = None
        if settings.COHERE_API_KEY and settings.COHERE_API_KEY != "mock-cohere-key":
            self.cohere_client = cohere.Client(settings.COHERE_API_KEY)

    async def search(self, query: str, category: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
        """Retrieves and re-ranks matching documents from Qdrant."""
        try:
            # Embed query
            query_vector = await self.embeddings.aembed_query(query)
            
            # Setup filter if category provided
            query_filter = None
            if category:
                query_filter = models.Filter(
                    must=[
                        models.FieldCondition(
                            key="category",
                            match=models.MatchValue(value=category)
                        )
                    ]
                )

            # Retrieve candidate documents (fetch extra for re-ranking)
            fetch_limit = limit * 4 if self.cohere_client else limit
            
            search_result = qdrant_client.search(
                collection_name=COLLECTION_NAME,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=fetch_limit
            )
            
            if not search_result:
                return []

            documents = [
                {
                    "text": hit.payload["text"],
                    "source": hit.payload.get("source", "unknown"),
                    "category": hit.payload.get("category", "general"),
                    "score": hit.score
                }
                for hit in search_result
            ]

            # Re-rank if Cohere client is configured
            if self.cohere_client:
                try:
                    texts = [doc["text"] for doc in documents]
                    rerank_results = self.cohere_client.rerank(
                        query=query,
                        documents=texts,
                        top_n=limit,
                        model="rerank-english-v3.0"
                    )
                    
                    reranked_docs = []
                    for result in rerank_results.results:
                        original_doc = documents[result.index]
                        original_doc["score"] = result.relevance_score  # Update with rerank score
                        reranked_docs.append(original_doc)
                    return reranked_docs
                except Exception as ex:
                    logger.error(f"Cohere re-ranking failed, falling back to vector score: {ex}")
                    return documents[:limit]
            
            return documents
        except Exception as e:
            logger.error(f"RAG search error: {e}")
            return []

    def format_context(self, docs: List[Dict[str, Any]]) -> str:
        """Formats search documents into a prompt context with citations."""
        if not docs:
            return "No relevant reference material found."
        
        context_parts = []
        for i, doc in enumerate(docs):
            source = doc.get("source", "Unknown Source")
            text = doc.get("text", "")
            context_parts.append(f"[{i+1}] Source: {source}\nContent: {text}\n")
            
        return "\n---\n".join(context_parts)

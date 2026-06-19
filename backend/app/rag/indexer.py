from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from qdrant_client.http import models
from app.core.config import settings
from app.rag.client import qdrant_client, COLLECTION_NAME
import uuid
import logging

logger = logging.getLogger(__name__)


class KnowledgeIndexer:
    def __init__(self):
        # Fallback to dummy key if not set, for build/test safety
        api_key = settings.OPENAI_API_KEY if settings.OPENAI_API_KEY != "mock-openai-key" else "dummy-key"
        self.embeddings = OpenAIEmbeddings(
            openai_api_key=api_key,
            model="text-embedding-3-small"
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=150,
            length_function=len
        )

    async def ingest_document(self, text: str, source_metadata: dict) -> int:
        """Splits, embeds, and uploads a document to Qdrant."""
        try:
            chunks = self.text_splitter.split_text(text)
            if not chunks:
                return 0

            # Generate embeddings
            # OpenAIEmbeddings.aembed_documents is async
            embedded_chunks = await self.embeddings.aembed_documents(chunks)
            
            points = []
            for i, (chunk, vector) in enumerate(zip(chunks, embedded_chunks)):
                payload = {
                    "text": chunk,
                    "source": source_metadata.get("source", "unknown"),
                    "category": source_metadata.get("category", "general"),
                    "chunk_id": i
                }
                points.append(
                    models.PointStruct(
                        id=str(uuid.uuid4()),
                        vector=vector,
                        payload=payload
                    )
                )

            # Bulk upload
            qdrant_client.upsert(
                collection_name=COLLECTION_NAME,
                wait=True,
                points=points
            )
            logger.info(f"Ingested {len(points)} chunks from document: {source_metadata.get('source')}")
            return len(points)
        except Exception as e:
            logger.error(f"Error ingesting document to Qdrant: {e}")
            return 0

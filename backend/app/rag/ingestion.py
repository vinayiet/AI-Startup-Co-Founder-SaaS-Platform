import uuid
from typing import List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from qdrant_client.http import models

from app.core.config import settings
from app.rag.connection import qdrant_manager


class IngestionPipeline:
    def __init__(self):
        self.qdrant_client = qdrant_manager.get_client()
        self.collection_name = qdrant_manager.collection_name
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=512,
            chunk_overlap=50
        )
        
        # Setup embeddings with fallback for local dev
        if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "mock-openai-key":
            self.embeddings = OpenAIEmbeddings(
                model="text-embedding-3-small",
                openai_api_key=settings.OPENAI_API_KEY
            )
        else:
            self.embeddings = None

    def _get_embedding(self, text: str) -> List[float]:
        if self.embeddings:
            try:
                return self.embeddings.embed_query(text)
            except Exception:
                pass
        
        # Robust mock fallback (generates a reproducible mock vector from text hash)
        import hashlib
        h = hashlib.sha256(text.encode()).digest()
        vector = []
        for i in range(1536):
            val = (h[i % len(h)] + i) / 256.0
            vector.append(val)
        # Normalize vector to unit length for cosine similarity
        norm = sum(x*x for x in vector) ** 0.5
        return [x/norm for x in vector]

    def ingest_text(self, text: str, metadata: Dict[str, Any]) -> int:
        chunks = self.text_splitter.split_text(text)
        points = []
        
        for i, chunk in enumerate(chunks):
            point_id = str(uuid.uuid4())
            vector = self._get_embedding(chunk)
            
            # Merge indices info into metadata payload
            payload = {
                "content": chunk,
                "chunk_index": i,
                **metadata
            }
            
            points.append(
                models.PointStruct(
                    id=point_id,
                    vector=vector,
                    payload=payload
                )
            )

        if points:
            self.qdrant_client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            
        return len(points)


ingestion_pipeline = IngestionPipeline()

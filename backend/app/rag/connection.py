from qdrant_client import QdrantClient
from qdrant_client.http import models
from app.core.config import settings
import logging

logger = logging.getLogger("app.rag.connection")


class QdrantManager:
    def __init__(self):
        # Initialize client supporting cloud url and api_key if provided
        if settings.QDRANT_API_KEY:
            self.client = QdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY
            )
        else:
            self.client = QdrantClient(
                host=settings.QDRANT_HOST,
                port=settings.QDRANT_PORT
            )
        self.collection_name = "cofounder_knowledge"
        self._init_collection()

    def _init_collection(self):
        try:
            # Check if collection exists
            collections = self.client.get_collections()
            exists = any(c.name == self.collection_name for c in collections.collections)
            
            if not exists:
                logger.info(f"Creating Qdrant collection: {self.collection_name}")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=models.VectorParams(
                        size=1536,  # text-embedding-3-small size
                        distance=models.Distance.COSINE
                    )
                )
        except Exception as e:
            logger.error(f"Failed to initialize Qdrant collection: {e}")

    def get_client(self) -> QdrantClient:
        return self.client


qdrant_manager = QdrantManager()

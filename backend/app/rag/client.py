from qdrant_client import QdrantClient
from qdrant_client.http import models
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Single client instance for connection pooling
qdrant_client = QdrantClient(
    host=settings.QDRANT_HOST,
    port=settings.QDRANT_PORT,
    timeout=10.0
)

COLLECTION_NAME = "startup_knowledge"


def init_qdrant_db():
    """Ensure the necessary collections exist in Qdrant."""
    try:
        collections = qdrant_client.get_collections().collections
        exists = any(c.name == COLLECTION_NAME for c in collections)
        
        if not exists:
            logger.info(f"Creating Qdrant collection: {COLLECTION_NAME}")
            qdrant_client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=models.VectorParams(
                    size=1536,  # Matches text-embedding-3-small
                    distance=models.Distance.COSINE
                )
            )
        else:
            logger.info(f"Qdrant collection: {COLLECTION_NAME} already exists.")
    except Exception as e:
        logger.error(f"Failed to initialize Qdrant database: {e}")
        # In test/fallback mode, continue without blocking server startup

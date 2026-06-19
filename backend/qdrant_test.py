from qdrant_client import QdrantClient

def test_query_points():
    client = QdrantClient(host="qdrant", port=6333)
    
    # Check if we can perform query_points
    try:
        res = client.query_points(
            collection_name="cofounder_knowledge",
            query=[0.0] * 1536,
            limit=5
        )
        print("query_points() worked!")
        print("Response type:", type(res))
        print("Points:", res.points)
    except Exception as e:
        print("query_points() failed:", e)

if __name__ == "__main__":
    test_query_points()

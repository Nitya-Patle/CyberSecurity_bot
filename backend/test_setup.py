from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "CyberSentinel Backend"}
    print("Health check passed!")

if __name__ == "__main__":
    test_health()

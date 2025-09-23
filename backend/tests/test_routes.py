import time
from uuid import UUID

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "timestamp" in payload


def test_meeting_submission_and_status_flow():
    speaker_payload = {"label": "Test Speaker"}
    speaker_response = client.post("/api/speakers/enroll", json=speaker_payload)
    assert speaker_response.status_code == 201
    speaker_data = speaker_response.json()
    speaker_id = speaker_data["speaker_id"]

    meeting_payload = {
        "meeting_name": "Weekly Sync",
        "agenda": "Discuss project updates",
        "speaker_ids": [speaker_id],
    }
    meeting_response = client.post("/api/meetings/process", json=meeting_payload)
    assert meeting_response.status_code == 202
    meeting_data = meeting_response.json()
    meeting_id = meeting_data["meeting_id"]

    latest_status = meeting_data["status"]
    for _ in range(10):
        status_response = client.get(f"/api/meetings/{meeting_id}/status")
        assert status_response.status_code == 200
        status_data = status_response.json()
        latest_status = status_data["status"]
        if latest_status in {"completed", "failed"}:
            break
        time.sleep(0.05)

    assert latest_status in {"completed", "failed", "processing", "pending"}

    if latest_status == "completed":
        results_response = client.get(f"/api/meetings/{meeting_id}/results")
        assert results_response.status_code == 200
        results_data = results_response.json()
        assert results_data["summary"] is not None

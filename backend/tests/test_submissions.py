"""Smoke tests for the submissions HTTP surface."""
from __future__ import annotations

from uuid import uuid4


def test_create_suggestion_then_list(client) -> None:
    user_id = str(uuid4())
    payload = {
        "display_mode": "SUGGESTION",
        "title": "Add bike lanes to Main St",
        "body": "Cars are dangerous to commuters.",
        "is_anonymous": False,
        "tags": ["transit", "safety"],
        "lang": "en",
    }
    resp = client.post(
        "/api/v1/submissions",
        json=payload,
        headers={"X-User-Id": user_id},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["title"] == payload["title"]
    assert data["status"] == "PENDING_REVIEW"
    sub_id = data["id"]

    listing = client.get("/api/v1/submissions").json()
    assert any(s["id"] == sub_id for s in listing)


def test_issue_requires_location(client) -> None:
    user_id = str(uuid4())
    resp = client.post(
        "/api/v1/submissions",
        json={
            "display_mode": "ISSUE",
            "title": "Pothole on Pine",
            "body": "Pothole.",
            "is_anonymous": False,
        },
        headers={"X-User-Id": user_id},
    )
    assert resp.status_code == 422


def test_anonymous_cannot_submit(client) -> None:
    resp = client.post(
        "/api/v1/submissions",
        json={
            "display_mode": "SUGGESTION",
            "title": "Anonymous post",
            "body": "Should fail.",
        },
    )
    assert resp.status_code == 401


def test_report_hides_after_threshold(client, session) -> None:
    user_id = str(uuid4())
    create = client.post(
        "/api/v1/submissions",
        json={
            "display_mode": "SUGGESTION",
            "title": "Dummy",
            "body": "Dummy body content.",
        },
        headers={"X-User-Id": user_id},
    )
    sub_id = create.json()["id"]

    # Update threshold low for the test.
    from backend.models import Submission
    from uuid import UUID as _UUID

    sub = session.get(Submission, _UUID(sub_id))
    sub.report_threshold = 2
    sub.status = "ACTIVE"
    session.add(sub)
    session.commit()

    for sid in ("sess-a", "sess-b"):
        r = client.post(
            f"/api/v1/submissions/{sub_id}/report",
            json={"reason": "spam"},
            headers={"X-Session-Id": sid},
        )
        assert r.status_code == 200
    final = client.post(
        f"/api/v1/submissions/{sub_id}/report",
        json={"reason": "spam"},
        headers={"X-Session-Id": "sess-b"},
    ).json()
    assert final["hidden"] is True

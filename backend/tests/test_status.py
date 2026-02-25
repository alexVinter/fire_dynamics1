"""Tests for quote status transitions and role-based access."""
import json

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.quote import Quote, QuoteItem
from app.models.technique import Technique
from app.models.user import User


def _token(client: TestClient, login: str, password: str) -> str:
    return client.post("/auth/login", json={"login": login, "password": password}).json()["access_token"]


def _make_quote(db: Session, user_id: int, status: str, tech_id: int) -> Quote:
    q = Quote(
        created_by=user_id,
        status=status,
        zones_json=json.dumps([]),
    )
    db.add(q)
    db.flush()
    db.add(QuoteItem(quote_id=q.id, technique_id=tech_id, qty=1))
    db.commit()
    db.refresh(q)
    return q


def _seed_technique(db: Session) -> Technique:
    t = Technique(manufacturer="X", model="Y")
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


def test_manager_cannot_warehouse_confirm(
    client: TestClient, manager_user: User, warehouse_user: User, db: Session,
):
    tech = _seed_technique(db)
    q = _make_quote(db, manager_user.id, "warehouse_check", tech.id)

    token = _token(client, "manager", "mgr123")
    resp = client.post(
        f"/quotes/{q.id}/warehouse/confirm",
        json={"decision": "confirmed", "lines": []},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


def test_warehouse_cannot_change_status_to_approved(
    client: TestClient, manager_user: User, warehouse_user: User, db: Session,
):
    tech = _seed_technique(db)
    q = _make_quote(db, manager_user.id, "calculated", tech.id)

    token = _token(client, "warehouse", "wh123")
    resp = client.post(
        f"/quotes/{q.id}/status",
        json={"status": "approved"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


def test_invalid_transition_returns_409(
    client: TestClient, manager_user: User, db: Session,
):
    tech = _seed_technique(db)
    q = _make_quote(db, manager_user.id, "draft", tech.id)

    token = _token(client, "manager", "mgr123")
    resp = client.post(
        f"/quotes/{q.id}/status",
        json={"status": "approved"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 409

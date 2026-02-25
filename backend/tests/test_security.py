"""Tests for ownership, qty validation, and frozen-status guards."""
import json

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.quote import Quote, QuoteItem
from app.models.quote_result_line import QuoteResultLine
from app.models.sku import SKU
from app.models.technique import Technique
from app.models.user import User


def _token(client: TestClient, login: str, password: str) -> str:
    return client.post("/auth/login", json={"login": login, "password": password}).json()["access_token"]


def _seed(db: Session, owner: User) -> tuple[Technique, Quote]:
    tech = Technique(manufacturer="X", model="Y")
    db.add(tech)
    db.flush()
    q = Quote(created_by=owner.id, status="draft", zones_json=json.dumps([]))
    db.add(q)
    db.flush()
    db.add(QuoteItem(quote_id=q.id, technique_id=tech.id, qty=1))
    db.commit()
    db.refresh(q)
    return tech, q


def test_other_manager_cannot_edit_quote(
    client: TestClient, manager_user: User, db: Session,
):
    """A second manager must not edit a quote they didn't create."""
    _, q = _seed(db, manager_user)

    other = User(login="manager2", password_hash=manager_user.password_hash, role="manager")
    db.add(other)
    db.commit()

    token = _token(client, "manager2", "mgr123")
    resp = client.put(
        f"/quotes/{q.id}",
        json={"items": [{"technique_id": 1, "qty": 1}]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


def test_admin_can_edit_any_quote(
    client: TestClient, manager_user: User, admin_user: User, db: Session,
):
    _, q = _seed(db, manager_user)

    token = _token(client, "admin", "admin123")
    resp = client.put(
        f"/quotes/{q.id}",
        json={"items": [{"technique_id": 1, "qty": 2}]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200


def test_result_line_qty_zero_rejected(
    client: TestClient, admin_user: User, db: Session,
):
    tech = Technique(manufacturer="X", model="Y")
    db.add(tech)
    db.flush()
    sku = SKU(code="S1", name="Item", unit="шт")
    db.add(sku)
    db.flush()
    q = Quote(created_by=admin_user.id, status="calculated", zones_json=json.dumps([]))
    db.add(q)
    db.flush()
    db.add(QuoteItem(quote_id=q.id, technique_id=tech.id, qty=1))
    rl = QuoteResultLine(quote_id=q.id, sku_id=sku.id, qty=3)
    db.add(rl)
    db.commit()
    db.refresh(rl)

    token = _token(client, "admin", "admin123")
    resp = client.patch(
        f"/quotes/{q.id}/result/{rl.id}",
        json={"qty": 0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 422


def test_patch_result_line_blocked_on_confirmed(
    client: TestClient, admin_user: User, db: Session,
):
    tech = Technique(manufacturer="X", model="Y")
    db.add(tech)
    db.flush()
    sku = SKU(code="S2", name="Item2", unit="шт")
    db.add(sku)
    db.flush()
    q = Quote(created_by=admin_user.id, status="confirmed", zones_json=json.dumps([]))
    db.add(q)
    db.flush()
    db.add(QuoteItem(quote_id=q.id, technique_id=tech.id, qty=1))
    rl = QuoteResultLine(quote_id=q.id, sku_id=sku.id, qty=5)
    db.add(rl)
    db.commit()
    db.refresh(rl)

    token = _token(client, "admin", "admin123")
    resp = client.patch(
        f"/quotes/{q.id}/result/{rl.id}",
        json={"qty": 10},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 409

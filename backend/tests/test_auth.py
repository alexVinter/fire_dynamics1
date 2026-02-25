from fastapi.testclient import TestClient

from app.models.user import User


def test_login_success(client: TestClient, admin_user: User):
    resp = client.post("/auth/login", json={"login": "admin", "password": "admin123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client: TestClient, admin_user: User):
    resp = client.post("/auth/login", json={"login": "admin", "password": "wrong"})
    assert resp.status_code == 401


def test_login_unknown_user(client: TestClient):
    resp = client.post("/auth/login", json={"login": "nobody", "password": "x"})
    assert resp.status_code == 401


def test_me_without_token(client: TestClient):
    resp = client.get("/auth/me")
    assert resp.status_code == 401


def test_me_with_valid_token(client: TestClient, admin_user: User):
    token = client.post("/auth/login", json={"login": "admin", "password": "admin123"}).json()["access_token"]
    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["login"] == "admin"
    assert data["role"] == "admin"


def test_admin_users_forbidden_for_manager(client: TestClient, manager_user: User):
    token = client.post("/auth/login", json={"login": "manager", "password": "mgr123"}).json()["access_token"]
    resp = client.get("/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


def test_admin_users_allowed_for_admin(client: TestClient, admin_user: User):
    token = client.post("/auth/login", json={"login": "admin", "password": "admin123"}).json()["access_token"]
    resp = client.get("/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)

    def override():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_notes_crud(client):
    r = client.post("/api/notes", json={"title": "Ciao", "content": "x"})
    assert r.status_code == 201
    nid = r.json()["id"]
    assert len(client.get("/api/notes").json()) == 1
    assert client.put(f"/api/notes/{nid}", json={"title": "Nuovo"}).json()["title"] == "Nuovo"
    assert client.delete(f"/api/notes/{nid}").status_code == 204
    assert client.get("/api/notes").json() == []


def test_empty_title_rejected(client):
    assert client.post("/api/notes", json={"title": ""}).status_code == 422


def test_finance_flow(client):
    from app import finance
    from app.db import get_db as g
    db = next(app.dependency_overrides[g]())
    db.add(finance.Account(name="Conto")); db.add(finance.Category(name="Spesa", type="expense")); db.commit()
    r = client.post("/api/finance/transactions", json={"type": "income", "amount_cents": 1000, "day": "2026-11-15", "account_id": 1})
    assert r.status_code == 201
    client.post("/api/finance/transactions", json={"type": "expense", "amount_cents": 250, "day": "2026-11-15", "account_id": 1, "category_id": 1})
    s = client.get("/api/finance/summary?month=2026-11").json()
    assert s["balance_cents"] == 750 and s["income_cents"] == 1000 and s["expense_cents"] == 250
    assert client.delete("/api/finance/accounts/1").status_code == 409


def test_budget_and_report(client):
    from app import finance
    from app.db import get_db as g
    db = next(app.dependency_overrides[g]())
    db.add(finance.Account(name="C")); db.add(finance.Category(name="Spesa", type="expense")); db.commit()
    assert client.post("/api/finance/budgets", json={"category_id": 1, "limit_cents": 5000}).status_code == 201
    assert client.post("/api/finance/budgets", json={"category_id": 1, "limit_cents": 6000}).status_code == 201
    b = client.get("/api/finance/budgets").json()
    assert len(b) == 1 and b[0]["limit_cents"] == 6000
    r = client.get("/api/finance/report?periods=3").json()
    assert len(r) == 3


def test_goals_and_recurring(client):
    from datetime import date
    from app import finance
    from app.db import get_db as g
    db = next(app.dependency_overrides[g]())
    db.add(finance.Account(name="C")); db.commit()
    gid = client.post("/api/finance/goals", json={"name": "Mac", "target_cents": 100000}).json()["id"]
    assert client.post(f"/api/finance/goals/{gid}/add", json={"delta_cents": 1500}).json()["saved_cents"] == 1500
    assert client.post(f"/api/finance/goals/{gid}/add", json={"delta_cents": -9999}).json()["saved_cents"] == 0
    today = date.today().isoformat()
    r = client.post("/api/finance/recurring", json={"note": "Affitto", "type": "expense", "amount_cents": 30000,
                    "account_id": 1, "freq": "monthly", "start": today})
    assert r.status_code == 201 and r.json()["next_day"] > today
    assert len(client.get(f"/api/finance/transactions?month={today[:7]}").json()) == 1


def test_edit_and_export(client):
    from app import finance
    from app.db import get_db as g
    db = next(app.dependency_overrides[g]())
    db.add(finance.Account(name="C")); db.add(finance.Category(name="Spesa", type="expense", color="#111111")); db.commit()
    t = client.post("/api/finance/transactions", json={"type": "expense", "amount_cents": 500, "day": "2026-11-15", "account_id": 1}).json()
    u = client.put(f"/api/finance/transactions/{t['id']}", json={"type": "expense", "amount_cents": 900, "day": "2026-11-15", "account_id": 1, "category_id": 1})
    assert u.json()["amount_cents"] == 900 and u.json()["category_name"] == "Spesa"
    assert client.put("/api/finance/categories/1", json={"name": "Cibo", "type": "expense", "color": "#222222"}).json()["name"] == "Cibo"
    assert len(client.get("/api/finance/export").json()["transactions"]) == 1

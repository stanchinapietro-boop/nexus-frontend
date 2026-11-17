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


def test_academic_grades_keep_arithmetic_and_weighted_averages_distinct(client):
    from app.academic import Course
    from app.db import get_db as dependency
    db = next(app.dependency_overrides[dependency]())
    db.add(Course(name="Matematica")); db.commit()
    for value, weight in [(6, 1), (8, 2)]:
        response = client.post("/api/academic/grades", json={"course_id": 1, "value": value, "weight": weight,
            "kind": "orale", "day": "2026-11-15", "description": "Test"})
        assert response.status_code == 201
    result = client.get("/api/academic/grade-summary").json()[0]
    assert result["arithmetic_average"] == 7
    assert result["weighted_average"] == pytest.approx(7.33, abs=0.01)


def test_academic_timetable_rejects_overlapping_lessons(client):
    from app.academic import Course
    from app.db import get_db as dependency
    db = next(app.dependency_overrides[dependency]())
    db.add(Course(name="Storia")); db.commit()
    payload = {"course_id": 1, "weekday": 0, "start_time": "08:00", "end_time": "09:00", "room": "12"}
    assert client.post("/api/academic/lessons", json=payload).status_code == 201
    overlap = {**payload, "start_time": "08:30", "end_time": "09:30"}
    assert client.post("/api/academic/lessons", json=overlap).status_code == 409


def test_academic_grade_metadata_and_update(client):
    from app.academic import Course
    from app.db import get_db as dependency
    db = next(app.dependency_overrides[dependency]())
    db.add(Course(name="Italiano")); db.commit()
    payload = {"course_id": 1, "value": 7, "weight": 1, "kind": "scritto", "day": "2026-11-15",
               "description": "Tema", "period": "first", "school_year": "2026-2027", "status": "provisional", "note": "Da confermare"}
    created = client.post("/api/academic/grades", json=payload)
    assert created.status_code == 201 and created.json()["period"] == "first"
    updated = {**payload, "value": 8, "status": "final"}
    saved = client.put(f"/api/academic/grades/{created.json()['id']}", json=updated)
    assert saved.status_code == 200 and saved.json()["value"] == 8 and saved.json()["status"] == "final"


def test_academic_task_priority_metadata_crud(client):
    from app.academic import Course
    from app.db import get_db as dependency
    db = next(app.dependency_overrides[dependency]())
    db.add(Course(name="Fisica")); db.commit()
    payload = {"title": "Preparare esercizi", "kind": "review", "course_id": 1, "due_date": "2026-11-20",
               "important": True, "urgent": False, "priority": "high", "status": "in_progress", "estimated_minutes": 45,
               "description": "Capitolo 3"}
    created = client.post("/api/academic/tasks", json=payload)
    assert created.status_code == 201 and created.json()["priority"] == "high"
    changed = {**payload, "urgent": True, "status": "done"}
    saved = client.put(f"/api/academic/tasks/{created.json()['id']}", json=changed)
    assert saved.status_code == 200 and saved.json()["urgent"] and saved.json()["done"]
    assert client.delete(f"/api/academic/tasks/{created.json()['id']}").status_code == 204


def test_academic_subtasks_persist_and_toggle(client):
    task = client.post("/api/academic/tasks", json={"title": "Preparare verifica"}).json()
    created = client.post(f"/api/academic/tasks/{task['id']}/subtasks", json={"title": "Ripassare formule"})
    assert created.status_code == 201
    assert client.get(f"/api/academic/tasks").json()[0]["subtasks_total"] == 1
    toggled = client.post(f"/api/academic/subtasks/{created.json()['id']}/toggle")
    assert toggled.json()["done"] is True
    assert client.delete(f"/api/academic/subtasks/{created.json()['id']}").status_code == 204


def test_academic_study_session_pause_resume_and_stats(client):
    started = client.post("/api/academic/study-sessions", json={"course_id": None, "task_id": None, "notes": "Ripasso"})
    assert started.status_code == 201 and started.json()["state"] == "running"
    sid = started.json()["id"]
    assert client.post("/api/academic/study-sessions", json={}).status_code == 409
    assert client.post(f"/api/academic/study-sessions/{sid}/pause").json()["state"] == "paused"
    assert client.post(f"/api/academic/study-sessions/{sid}/resume").json()["state"] == "running"
    assert client.post(f"/api/academic/study-sessions/{sid}/complete").json()["state"] == "completed"
    assert client.get("/api/academic/study-stats").json()["sessions_count"] == 1


def test_academic_recurrence_materializes_due_task_once(client):
    from datetime import date
    response = client.post("/api/academic/recurrences", json={"title": "Ripasso quotidiano", "frequency": "daily",
        "interval": 1, "start_date": date.today().isoformat()})
    assert response.status_code == 201
    first = client.get("/api/academic/tasks").json()
    second = client.get("/api/academic/tasks").json()
    assert len(first) == len(second) == 1


def test_academic_exam_links_preparation_task_and_grade(client):
    from app.academic import Course
    from app.db import get_db as dependency
    db = next(app.dependency_overrides[dependency]())
    db.add(Course(name="Informatica")); db.commit()
    exam = client.post("/api/academic/exams", json={"course_id": 1, "title": "Algoritmi", "exam_date": "2026-12-01"}).json()
    task = client.post("/api/academic/tasks", json={"title": "Ripassare algoritmi", "course_id": 1}).json()
    assert client.post(f"/api/academic/exams/{exam['id']}/tasks/{task['id']}").json()["task_ids"] == [task["id"]]
    grade = {"course_id": 1, "value": 8, "weight": 1, "kind": "scritto", "day": "2026-12-01"}
    result = client.post(f"/api/academic/exams/{exam['id']}/grade", json=grade)
    assert result.status_code == 201 and result.json()["grade_value"] == 8
    assert client.post(f"/api/academic/exams/{exam['id']}/grade", json=grade).status_code == 409


def test_academic_goals_analytics_and_csv_export(client):
    from app.academic import Course
    from app.db import get_db as dependency
    db = next(app.dependency_overrides[dependency]())
    db.add(Course(name="Chimica")); db.commit()
    client.post("/api/academic/grades", json={"course_id": 1, "value": 8, "weight": 1, "kind": "orale", "day": "2026-11-15"})
    goal = client.post("/api/academic/goals", json={"course_id": 1, "target_average": 7}).json()
    assert goal["current_average"] == 8 and goal["reached"] is True
    analytics = client.get("/api/academic/analytics").json()
    assert analytics["grade_distribution"][2]["count"] == 1
    export = client.get("/api/academic/grades/export.csv")
    assert export.status_code == 200 and "Chimica" in export.text and "Voto" in export.text
    assert client.delete(f"/api/academic/goals/{goal['id']}").status_code == 204


def test_academic_notes_and_flashcard_sm2_schedule(client):
    note = client.post("/api/academic/notes", json={"title": "Appunti", "content": "Testo", "tags": "test"})
    assert note.status_code == 201 and client.get("/api/academic/notes?q=test").json()[0]["title"] == "Appunti"
    card = client.post("/api/academic/flashcards", json={"question": "Q?", "answer": "A", "topic": "Tema"}).json()
    reviewed = client.post(f"/api/academic/flashcards/{card['id']}/review", json={"quality": 5}).json()
    assert reviewed["interval_days"] == 1 and reviewed["repetitions"] == 1
    reviewed = client.post(f"/api/academic/flashcards/{card['id']}/review", json={"quality": 5}).json()
    assert reviewed["interval_days"] == 6 and reviewed["repetitions"] == 2
    reset = client.post(f"/api/academic/flashcards/{card['id']}/review", json={"quality": 2}).json()
    assert reset["interval_days"] == 1 and reset["repetitions"] == 0


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

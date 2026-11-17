from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app


@pytest.fixture()
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)

    def override():
        db = session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_personal_task_crud_and_day_filter(client):
    today = date.today().isoformat()
    created = client.post("/api/life/tasks", json={"title": "Commissione", "due_date": today, "priority": "high"})
    assert created.status_code == 201 and created.json()["priority"] == "high"
    assert len(client.get(f"/api/life/tasks?day={today}").json()) == 1
    updated = client.put(f"/api/life/tasks/{created.json()['id']}", json={"title": "Fatto", "status": "done"})
    assert updated.json()["status"] == "done"
    assert client.delete(f"/api/life/tasks/{created.json()['id']}").status_code == 204


def test_goals_use_measurement_type(client):
    response = client.post("/api/life/goals", json={"title": "Leggere", "goal_type": "numeric", "target_value": 12, "current_value": 3, "unit": "libri"})
    assert response.status_code == 201 and response.json()["progress"] == 25


def test_habit_logging_respects_schedule_and_is_upsert(client):
    today = date.today()
    response = client.post("/api/life/habits", json={"name": "Camminare", "kind": "numeric", "days": [today.weekday()], "target_value": 8000, "unit": "passi"})
    hid = response.json()["id"]
    assert client.post(f"/api/life/habits/{hid}/log", json={"value": 9000,"completed": True}).status_code == 200
    again = client.post(f"/api/life/habits/{hid}/log", json={"value": 10000,"completed": True})
    assert again.json()["today_value"] == 10000
    other_day = (today.replace(day=max(1, today.day-1))).isoformat()
    if date.fromisoformat(other_day).weekday() != today.weekday():
        assert client.post(f"/api/life/habits/{hid}/log?day={other_day}", json={}).status_code == 422


def test_routine_steps_progress_is_persisted(client):
    routine = client.post("/api/life/routines", json={"name": "Mattina", "days": [0,1,2,3,4]}).json()
    step = client.post(f"/api/life/routines/{routine['id']}/steps", json={"title": "Colazione","duration_minutes":10}).json()
    progress = client.post(f"/api/life/routines/{routine['id']}/complete?step_id={step['id']}").json()
    assert progress["progress"] == 100


def test_milestone_goal_progress_is_measured_from_completed_milestones(client):
    goal = client.post("/api/life/goals", json={"title": "Organizzare un viaggio", "goal_type": "milestone"}).json()
    first = client.post(f"/api/life/goals/{goal['id']}/milestones", json={"title": "Scegliere destinazione"}).json()
    client.post(f"/api/life/goals/{goal['id']}/milestones", json={"title": "Prenotare"})
    assert client.post(f"/api/life/milestones/{first['id']}/toggle").status_code == 200
    assert client.get("/api/life/goals").json()[0]["progress"] == 50


def test_meals_link_recipes_and_recipe_delete_keeps_meal(client):
    recipe = client.post("/api/life/recipes", json={"name": "Pasta", "ingredients": [{"name": "Pasta", "quantity": 200, "unit": "g"}]}).json()
    meal = client.post("/api/life/meals", json={"day": date.today().isoformat(), "meal_type": "lunch", "recipe_id": recipe["id"], "title": "Pasta"})
    assert meal.status_code == 201
    assert client.delete(f"/api/life/recipes/{recipe['id']}").status_code == 204
    assert client.get("/api/life/meals").json()[0]["recipe_id"] is None


def test_trip_itinerary_date_validation_and_delete_cleanup(client):
    start = date.today()
    end = date.fromordinal(start.toordinal() + 2)
    trip = client.post("/api/life/trips", json={"name": "Weekend", "destination": "Milano", "start_date": start.isoformat(), "end_date": end.isoformat()}).json()
    assert client.post(f"/api/life/trips/{trip['id']}/itinerary", json={"day": start.isoformat(), "title": "Duomo"}).status_code == 201
    outside = date.fromordinal(end.toordinal() + 1).isoformat()
    assert client.post(f"/api/life/trips/{trip['id']}/itinerary", json={"day": outside, "title": "Fuori periodo"}).status_code == 422
    assert client.delete(f"/api/life/trips/{trip['id']}").status_code == 204
    assert client.get(f"/api/life/trips/{trip['id']}/itinerary").status_code == 404


def test_habit_numeric_target_and_analytics_are_data_derived(client):
    today = date.today()
    habit = client.post("/api/life/habits", json={"name": "Acqua", "kind": "numeric", "days": [today.weekday()], "target_value": 8, "unit": "bicchieri"}).json()
    partial = client.post(f"/api/life/habits/{habit['id']}/log", json={"value": 4, "completed": True}).json()
    assert partial["today_completed"] is False
    task = client.post("/api/life/tasks", json={"title": "Camminata", "due_date": today.isoformat(), "estimated_minutes": 30, "category": "workout"}).json()
    client.put(f"/api/life/tasks/{task['id']}", json={"title": "Camminata", "due_date": today.isoformat(), "estimated_minutes": 30, "category": "workout", "status": "done"})
    stats = client.get("/api/life/analytics").json()
    assert stats["tasks"]["completed"] == 1
    assert stats["tasks"]["estimated_minutes_completed"] == 30
    assert stats["habits"]["scheduled"] >= 1


def test_calendar_insights_export_and_interest_storage(client):
    today = date.today()
    event = client.post("/api/life/events", json={"title": "Compleanno", "starts_at": f"{today.isoformat()}T18:00:00"})
    assert event.status_code == 201
    start = today.replace(day=1).isoformat()
    end = today.isoformat()
    calendar = client.get(f"/api/life/calendar?start={start}&end={end}").json()
    assert any(item["kind"] == "event" and item["title"] == "Compleanno" for item in calendar)
    created = client.post("/api/life/interests", json={"kind": "hobby", "title": "Fotografia", "hours": 2})
    assert created.status_code == 201
    assert client.get("/api/life/interests?kind=hobby").json()[0]["title"] == "Fotografia"
    assert "data" in client.get("/api/life/export.json").json()
    assert client.get("/api/life/insights").status_code == 200


def test_workout_exercises_are_owned_by_parent_and_exported(client):
    workout = client.post("/api/life/workouts", json={"name": "Forza", "sport": "gym", "day": date.today().isoformat()}).json()
    created = client.post(f"/api/life/workouts/{workout['id']}/exercises", json={"name": "Squat", "muscle_group": "Gambe", "sets": [{"reps": 8, "weight": 60}]})
    assert created.status_code == 201
    assert client.get(f"/api/life/workouts/{workout['id']}/exercises").json()[0]["sets"][0]["weight"] == 60
    assert client.delete(f"/api/life/workouts/{workout['id']}").status_code == 204
    assert client.get(f"/api/life/workouts/{workout['id']}/exercises").status_code == 404


def test_trip_checklist_and_invalid_exercise_values(client):
    start = date.today()
    trip = client.post("/api/life/trips", json={"name": "Weekend", "destination": "Roma", "start_date": start.isoformat(), "end_date": start.isoformat()}).json()
    item = client.post(f"/api/life/trips/{trip['id']}/checklist", json={"title": "Documento", "category": "documents"}).json()
    assert client.post(f"/api/life/trip-checklist/{item['id']}/toggle").json()["checked"] is True
    workout = client.post("/api/life/workouts", json={"name": "Pesi", "sport": "gym", "day": start.isoformat()}).json()
    invalid = client.post(f"/api/life/workouts/{workout['id']}/exercises", json={"name": "Squat", "sets": [{"reps": -2}]})
    assert invalid.status_code == 422


def test_event_and_shopping_updates_validate_and_persist(client):
    start = date.today().isoformat()
    event = client.post("/api/life/events", json={"title": "Cena", "starts_at": f"{start}T19:00:00"}).json()
    bad = client.put(f"/api/life/events/{event['id']}", json={"title": "Cena", "starts_at": f"{start}T20:00:00", "ends_at": f"{start}T18:00:00"})
    assert bad.status_code == 422
    item = client.post("/api/life/shopping", json={"name": "Latte", "quantity": 1}).json()
    updated = client.put(f"/api/life/shopping/{item['id']}", json={"name": "Latte", "quantity": 2, "purchased": True})
    assert updated.json()["quantity"] == 2 and updated.json()["purchased"] is True


def test_task_subtasks_are_persisted_and_deleted_with_parent(client):
    task = client.post("/api/life/tasks", json={"title": "Organizzare casa"}).json()
    subtask = client.post(f"/api/life/tasks/{task['id']}/subtasks", json={"title": "Riordinare scrivania"}).json()
    assert client.post(f"/api/life/subtasks/{subtask['id']}/toggle").json()["completed"] is True
    assert client.get(f"/api/life/tasks/{task['id']}/subtasks").json()[0]["completed"] is True
    assert client.delete(f"/api/life/tasks/{task['id']}").status_code == 204
    assert client.get(f"/api/life/tasks/{task['id']}/subtasks").status_code == 404


def test_task_recurrence_generation_is_idempotent(client):
    start = date.today()
    task = client.post("/api/life/tasks", json={"title": "Passeggiata", "due_date": start.isoformat(), "estimated_minutes": 20}).json()
    rule = client.post(f"/api/life/tasks/{task['id']}/recurrence", json={"frequency": "daily", "interval": 1}).json()
    through = date.fromordinal(start.toordinal() + 3).isoformat()
    generated = client.post(f"/api/life/recurrences/{rule['id']}/generate?through={through}").json()
    retry = client.post(f"/api/life/recurrences/{rule['id']}/generate?through={through}").json()
    assert generated["created"] == 3
    assert retry["created"] == 0
    occurrences = [task for task in client.get("/api/life/tasks").json() if task["title"] == "Passeggiata"]
    assert len(occurrences) == 4
    assert client.post(f"/api/life/recurrences/{rule['id']}/toggle").json()["active"] is False


def test_monthly_recurrence_keeps_end_of_month_anchor(client):
    task = client.post("/api/life/tasks", json={"title": "Promemoria", "due_date": "2027-01-31"}).json()
    rule = client.post(f"/api/life/tasks/{task['id']}/recurrence", json={"frequency": "monthly"}).json()
    assert rule["next_date"] == "2027-02-28"
    client.post(f"/api/life/recurrences/{rule['id']}/generate?through=2027-03-31")
    dates = sorted(row["due_date"] for row in client.get("/api/life/tasks").json() if row["title"] == "Promemoria")
    assert dates == ["2027-01-31", "2027-02-28", "2027-03-31"]


def test_recipe_shopping_preview_only_subtracts_matching_units(client):
    recipe = client.post("/api/life/recipes", json={"name": "Pane", "ingredients": [{"name": "Farina", "quantity": 500, "unit": "g"}]}).json()
    client.post("/api/life/pantry", json={"name": "Farina", "quantity": 1, "unit": "kg"})
    preview = client.get(f"/api/life/recipes/{recipe['id']}/shopping-preview").json()
    assert preview["missing"][0]["missing_quantity"] == 500


def test_notifications_are_based_on_records_and_respect_settings(client):
    today = date.today().isoformat()
    client.post("/api/life/tasks", json={"title": "Pagare bolletta", "due_date": today})
    alerts = client.get("/api/life/notifications").json()
    assert any(item["kind"] == "task" and item["title"] == "Pagare bolletta" for item in alerts)
    client.put("/api/life/notifications/settings/task_deadlines", json={"enabled": False})
    assert not any(item["kind"] == "task" for item in client.get("/api/life/notifications").json())


def test_media_extended_metadata_persists_updates_exports_and_deletes(client):
    created = client.post("/api/life/media", json={"media_type":"series","title":"Serie locale","year":2024,"platform":"Stream","description":"Descrizione inserita dall'utente","seasons":3,"episodes":24,"current_season":2,"current_episode":5,"progress":13,"total":24})
    assert created.status_code == 201
    media_id = created.json()["id"]
    assert client.get("/api/life/media?media_type=series").json()[0]["current_episode"] == 5
    changed = client.put(f"/api/life/media/{media_id}", json={**created.json(),"current_episode":6,"progress":14})
    assert changed.status_code == 200 and changed.json()["current_episode"] == 6
    exported = client.get("/api/life/export.json").json()["data"]
    assert exported["media_details"][0]["platform"] == "Stream"
    assert client.delete(f"/api/life/media/{media_id}").status_code == 204
    assert client.get("/api/life/media?media_type=series").json() == []
    assert client.get("/api/life/export.json").json()["data"]["media_details"] == []


def test_media_rejects_progress_beyond_total(client):
    response = client.post("/api/life/media", json={"media_type":"book","title":"Lettura","progress":51,"total":50})
    assert response.status_code == 422


def test_calendar_respects_arbitrary_day_and_week_ranges(client):
    first=date(2027,5,10)
    client.post("/api/life/events",json={"title":"Lunedì","starts_at":"2027-05-10T09:00:00"})
    client.post("/api/life/events",json={"title":"Domenica","starts_at":"2027-05-16T18:00:00"})
    client.post("/api/life/events",json={"title":"Settimana dopo","starts_at":"2027-05-17T08:00:00"})
    day=client.get(f"/api/life/calendar?start={first.isoformat()}&end={first.isoformat()}").json()
    week=client.get("/api/life/calendar?start=2027-05-10&end=2027-05-16").json()
    assert [item["title"] for item in day]==["Lunedì"]
    assert {item["title"] for item in week}=={"Lunedì","Domenica"}


def test_task_completion_history_uses_completion_day_and_survives_task_delete(client):
    task=client.post("/api/life/tasks",json={"title":"Attività storica","estimated_minutes":12}).json()
    task_id=task["id"]
    client.put(f"/api/life/tasks/{task_id}",json={"title":"Attività storica","status":"done","estimated_minutes":12})
    client.put(f"/api/life/tasks/{task_id}",json={"title":"Attività storica","status":"todo","estimated_minutes":20})
    client.put(f"/api/life/tasks/{task_id}",json={"title":"Attività storica","status":"done","estimated_minutes":20})
    stats=client.get("/api/life/analytics").json()
    assert stats["tasks"]["completed"]==2
    assert stats["tasks"]["estimated_minutes_completed"]==32
    assert stats["daily"][-1]["tasks_completed"]==2
    assert client.delete(f"/api/life/tasks/{task_id}").status_code==204
    exported=client.get("/api/life/export.json").json()["data"]["task_completions"]
    assert len(exported)==2 and all(row["task_id"] is None for row in exported)

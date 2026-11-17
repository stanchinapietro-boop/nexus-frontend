from datetime import date

from app.ticktick import normalize

P = {"id": "p1", "name": "Scuola", "color": "#ffffff"}


def test_due_date_converted_to_local_day_and_overdue():
    t = {"id": "t1", "title": "Studiare", "priority": 5, "dueDate": "2026-11-14T23:00:00+0000"}
    n = normalize(t, P, date(2026, 11, 16))
    assert n["due_date"] == "2026-11-15" and n["overdue"] is True


def test_task_without_due_date():
    n = normalize({"id": "t2", "title": "Idea"}, P, date(2026, 11, 15))
    assert n["due_date"] is None and n["overdue"] is False and n["priority"] == 0


def test_due_date_with_milliseconds():
    t = {"id": "t3", "title": "Verifica", "dueDate": "2026-12-01T10:15:00.000+0000"}
    n = normalize(t, P, date(2026, 11, 16))
    assert n["due_date"] == "2026-12-01" and n["overdue"] is False


def test_unreadable_date_does_not_break():
    n = normalize({"id": "t4", "title": "X", "dueDate": "boh"}, P, date(2026, 11, 16))
    assert n["due_date"] is None

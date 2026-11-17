"""Integrazione TickTick tramite Open API ufficiale (OAuth2, scope tasks:read tasks:write)."""
import os
import secrets
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, time, timedelta
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import String
from sqlalchemy.orm import Mapped, Session, mapped_column

from .db import Base, get_db

router = APIRouter(prefix="/api/ticktick", tags=["ticktick"])
API = "https://api.ticktick.com/open/v1"
AUTH_URL = "https://ticktick.com/oauth/authorize"
TOKEN_URL = "https://ticktick.com/oauth/token"
SCOPE = "tasks:read tasks:write"
_states: set[str] = set()


class IntegrationToken(Base):
    __tablename__ = "integration_tokens"
    provider: Mapped[str] = mapped_column(String(30), primary_key=True)
    access_token: Mapped[str] = mapped_column(String(2000))


class AuthError(Exception):
    pass


def cfg():
    return (os.getenv("TICKTICK_CLIENT_ID", ""), os.getenv("TICKTICK_CLIENT_SECRET", ""),
            os.getenv("TICKTICK_REDIRECT_URI", "http://localhost:8000/api/ticktick/callback"))


def tz_name() -> str:
    return os.getenv("TICKTICK_TIMEZONE", "Europe/Rome")


def _stored(db: Session):
    return db.get(IntegrationToken, "ticktick")


def _env_token() -> str:
    return os.getenv("TICKTICK_TOKEN", "").strip()


def _token(db: Session) -> str:
    if _env_token():
        return _env_token()
    row = _stored(db)
    if not row:
        raise HTTPException(401, "TickTick non collegato")
    return row.access_token


def _req(token: str, method: str, path: str, **kw):
    r = httpx.request(method, API + path, headers={"Authorization": f"Bearer {token}"}, timeout=15, **kw)
    if r.status_code in (401, 403):
        raise AuthError()
    if r.status_code >= 400:
        raise HTTPException(502, f"TickTick ha risposto {r.status_code}")
    return r.json() if r.content else None


def _guard(db: Session, fn):
    try:
        return fn()
    except AuthError:
        if _env_token():
            raise HTTPException(401, "Il token personale TickTick non è valido: creane uno nuovo e aggiorna il file .env")
        row = _stored(db)
        if row:
            db.delete(row); db.commit()
        raise HTTPException(401, "Autorizzazione TickTick scaduta: ricollega l'account")
    except httpx.HTTPError:
        raise HTTPException(502, "TickTick non raggiungibile")


def parse_due(value: str | None) -> date | None:
    """Legge le date di TickTick (con o senza millesimi, es. 2026-12-01T10:15:00.000+0000)."""
    if not value:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z"):
        try:
            return datetime.strptime(value, fmt).astimezone(ZoneInfo(tz_name())).date()
        except ValueError:
            continue
    return None  # formato inatteso: il task resta visibile, senza scadenza


def normalize(t: dict, project: dict, today: date) -> dict:
    due = parse_due(t.get("dueDate"))
    return {"id": t["id"], "project_id": project["id"], "project_name": project.get("name", ""),
            "project_color": project.get("color") or "#8d8d94", "title": t.get("title", ""),
            "priority": t.get("priority", 0), "due_date": due.isoformat() if due else None,
            "overdue": bool(due and due < today)}


class TaskIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    project_id: str | None = None
    due: date | None = None
    priority: int = Field(default=0, ge=0, le=5)


@router.get("/status")
def status(db: Session = Depends(get_db)):
    return {"configured": bool(_env_token() or (cfg()[0] and cfg()[1])),
            "connected": bool(_env_token()) or _stored(db) is not None}


@router.get("/login")
def login():
    cid, _, redir = cfg()
    if not cid:
        raise HTTPException(400, "TICKTICK_CLIENT_ID mancante in apps/api/.env")
    st = secrets.token_urlsafe(16)
    _states.add(st)
    q = urlencode({"scope": SCOPE, "client_id": cid, "state": st, "redirect_uri": redir, "response_type": "code"})
    return RedirectResponse(f"{AUTH_URL}?{q}")


@router.get("/callback")
def callback(code: str = "", state: str = "", db: Session = Depends(get_db)):
    front = os.getenv("FRONTEND_URL", "http://localhost:5173")
    if state not in _states or not code:
        return RedirectResponse(f"{front}/tasks?ticktick=errore")
    _states.discard(state)
    cid, secret, redir = cfg()
    try:
        r = httpx.post(TOKEN_URL, auth=(cid, secret), timeout=15, data={
            "code": code, "grant_type": "authorization_code", "scope": SCOPE, "redirect_uri": redir})
        token = r.json()["access_token"]
    except Exception:
        return RedirectResponse(f"{front}/tasks?ticktick=errore")
    row = _stored(db)
    if row: row.access_token = token
    else: db.add(IntegrationToken(provider="ticktick", access_token=token))
    db.commit()
    return RedirectResponse(f"{front}/tasks?ticktick=ok")


@router.delete("/connection", status_code=204)
def disconnect(db: Session = Depends(get_db)):
    row = _stored(db)
    if row:
        db.delete(row); db.commit()


@router.get("/tasks")
def list_tasks(db: Session = Depends(get_db)):
    tok = _token(db)
    today = datetime.now(ZoneInfo(tz_name())).date()

    def fetch():
        projects = [p for p in _req(tok, "GET", "/project") if not p.get("closed") and p.get("kind", "TASK") == "TASK"]
        with ThreadPoolExecutor(max_workers=6) as ex:
            datas = list(ex.map(lambda p: _req(tok, "GET", f"/project/{p['id']}/data"), projects))
        out = [normalize(t, p, today) for p, d in zip(projects, datas) for t in d.get("tasks", [])]
        out.sort(key=lambda t: (t["due_date"] or "9999", -t["priority"]))
        return {"today": today.isoformat(), "week_end": (today + timedelta(days=7)).isoformat(),
                "projects": [{"id": p["id"], "name": p["name"], "color": p.get("color")} for p in projects], "tasks": out}

    return _guard(db, fetch)


@router.post("/tasks", status_code=201)
def create_task(d: TaskIn, db: Session = Depends(get_db)):
    tok = _token(db)
    body: dict = {"title": d.title, "priority": d.priority}
    if d.project_id:
        body["projectId"] = d.project_id
    if d.due:
        s = datetime.combine(d.due, time(0), tzinfo=ZoneInfo(tz_name())).strftime("%Y-%m-%dT%H:%M:%S%z")
        body.update(startDate=s, dueDate=s, isAllDay=True, timeZone=tz_name())
    _guard(db, lambda: _req(tok, "POST", "/task", json=body))
    return {"ok": True}


@router.post("/tasks/{project_id}/{task_id}/complete")
def complete_task(project_id: str, task_id: str, db: Session = Depends(get_db)):
    tok = _token(db)
    _guard(db, lambda: _req(tok, "POST", f"/project/{project_id}/task/{task_id}/complete"))
    return {"ok": True}

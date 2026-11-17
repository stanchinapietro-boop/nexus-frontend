from datetime import date, datetime, timedelta, timezone
import csv
import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import Date, DateTime, ForeignKey, String, Integer, Float, Time, Text, select
from sqlalchemy.orm import Mapped, Session, mapped_column

from .db import Base, get_db

router = APIRouter(prefix="/api/academic", tags=["academic"])


class Course(Base):
    __tablename__ = "academic_courses"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    teacher: Mapped[str] = mapped_column(String(100), default="")
    color: Mapped[str] = mapped_column(String(7), default="#ff6a1a")


class StudyTask(Base):
    __tablename__ = "academic_tasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    kind: Mapped[str] = mapped_column(String(20), default="homework")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    course_id: Mapped[int | None] = mapped_column(ForeignKey("academic_courses.id"), nullable=True)
    done: Mapped[bool] = mapped_column(default=False)


class Lesson(Base):
    __tablename__ = "academic_lessons"
    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("academic_courses.id"))
    weekday: Mapped[int] = mapped_column(Integer)
    start_time: Mapped[str] = mapped_column(String(5))
    end_time: Mapped[str] = mapped_column(String(5))
    room: Mapped[str] = mapped_column(String(40), default="")


class Grade(Base):
    __tablename__ = "academic_grades"
    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("academic_courses.id"))
    value: Mapped[float] = mapped_column(Float)
    weight: Mapped[float] = mapped_column(Float, default=1)
    kind: Mapped[str] = mapped_column(String(20))
    day: Mapped[date] = mapped_column(Date)
    description: Mapped[str] = mapped_column(String(240), default="")


class GradeMeta(Base):
    __tablename__ = "academic_grade_meta"
    id: Mapped[int] = mapped_column(primary_key=True)
    grade_id: Mapped[int] = mapped_column(ForeignKey("academic_grades.id"), unique=True)
    period: Mapped[str] = mapped_column(String(20), default="annual")
    school_year: Mapped[str] = mapped_column(String(9), default="")
    status: Mapped[str] = mapped_column(String(12), default="final")
    note: Mapped[str] = mapped_column(String(500), default="")


class TaskMeta(Base):
    __tablename__ = "academic_task_meta"
    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("academic_tasks.id"), unique=True)
    description: Mapped[str] = mapped_column(String(1000), default="")
    important: Mapped[bool] = mapped_column(default=True)
    urgent: Mapped[bool] = mapped_column(default=False)
    priority: Mapped[str] = mapped_column(String(10), default="normal")
    status: Mapped[str] = mapped_column(String(12), default="todo")
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str] = mapped_column(String(1000), default="")


class AcademicSubtask(Base):
    __tablename__ = "academic_subtasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("academic_tasks.id"))
    title: Mapped[str] = mapped_column(String(160))
    done: Mapped[bool] = mapped_column(default=False)


class TaskRecurrence(Base):
    __tablename__ = "academic_task_recurrences"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    course_id: Mapped[int | None] = mapped_column(ForeignKey("academic_courses.id"), nullable=True)
    kind: Mapped[str] = mapped_column(String(20), default="homework")
    frequency: Mapped[str] = mapped_column(String(12))
    interval: Mapped[int] = mapped_column(Integer, default=1)
    next_date: Mapped[date] = mapped_column(Date)
    active: Mapped[bool] = mapped_column(default=True)


class StudySession(Base):
    __tablename__ = "academic_study_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int | None] = mapped_column(ForeignKey("academic_courses.id"), nullable=True)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("academic_tasks.id"), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    elapsed_seconds: Mapped[int] = mapped_column(Integer, default=0)
    state: Mapped[str] = mapped_column(String(12), default="running")
    notes: Mapped[str] = mapped_column(String(500), default="")


class AcademicExam(Base):
    __tablename__ = "academic_exams"
    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("academic_courses.id"))
    title: Mapped[str] = mapped_column(String(160))
    exam_date: Mapped[date] = mapped_column(Date)
    kind: Mapped[str] = mapped_column(String(20), default="written")
    topics: Mapped[str] = mapped_column(String(2000), default="")
    description: Mapped[str] = mapped_column(String(1000), default="")
    difficulty: Mapped[int] = mapped_column(Integer, default=3)
    priority: Mapped[str] = mapped_column(String(10), default="normal")
    prep_status: Mapped[str] = mapped_column(String(16), default="not_started")
    notes: Mapped[str] = mapped_column(String(1000), default="")


class AcademicGoal(Base):
    __tablename__ = "academic_goals"
    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int | None] = mapped_column(ForeignKey("academic_courses.id"), nullable=True)
    target_average: Mapped[float] = mapped_column(Float)
    period: Mapped[str] = mapped_column(String(20), default="annual")
    school_year: Mapped[str] = mapped_column(String(9), default="")
    label: Mapped[str] = mapped_column(String(120), default="")


class AcademicNote(Base):
    __tablename__ = "academic_notes"
    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int | None] = mapped_column(ForeignKey("academic_courses.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(180))
    content: Mapped[str] = mapped_column(Text, default="")
    external_url: Mapped[str] = mapped_column(String(1000), default="")
    tags: Mapped[str] = mapped_column(String(500), default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Flashcard(Base):
    __tablename__ = "academic_flashcards"
    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int | None] = mapped_column(ForeignKey("academic_courses.id"), nullable=True)
    question: Mapped[str] = mapped_column(String(1000))
    answer: Mapped[str] = mapped_column(Text)
    topic: Mapped[str] = mapped_column(String(180), default="")
    tags: Mapped[str] = mapped_column(String(500), default="")
    ease_factor: Mapped[float] = mapped_column(Float, default=2.5)
    interval_days: Mapped[int] = mapped_column(Integer, default=0)
    repetitions: Mapped[int] = mapped_column(Integer, default=0)
    due_date: Mapped[date] = mapped_column(Date, default=date.today)
    last_reviewed: Mapped[date | None] = mapped_column(Date, nullable=True)


class ExamTaskLink(Base):
    __tablename__ = "academic_exam_task_links"
    id: Mapped[int] = mapped_column(primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("academic_exams.id"))
    task_id: Mapped[int] = mapped_column(ForeignKey("academic_tasks.id"), unique=True)


class ExamGradeLink(Base):
    __tablename__ = "academic_exam_grade_links"
    id: Mapped[int] = mapped_column(primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("academic_exams.id"), unique=True)
    grade_id: Mapped[int] = mapped_column(ForeignKey("academic_grades.id"), unique=True)


class ExamIn(BaseModel):
    course_id: int
    title: str = Field(min_length=1, max_length=160)
    exam_date: date
    kind: str = Field(default="written", pattern="^(written|oral|practical)$")
    topics: str = Field(default="", max_length=2000)
    description: str = Field(default="", max_length=1000)
    difficulty: int = Field(default=3, ge=1, le=5)
    priority: str = Field(default="normal", pattern="^(low|normal|high)$")
    prep_status: str = Field(default="not_started", pattern="^(not_started|preparing|ready|taken|retake)$")
    notes: str = Field(default="", max_length=1000)


class GoalIn(BaseModel):
    course_id: int | None = None
    target_average: float = Field(ge=1, le=10)
    period: str = Field(default="annual", pattern="^(first|second|annual)$")
    school_year: str = Field(default="", max_length=9)
    label: str = Field(default="", max_length=120)


class NoteIn(BaseModel):
    course_id: int | None = None
    title: str = Field(min_length=1, max_length=180)
    content: str = Field(default="", max_length=30000)
    external_url: str = Field(default="", max_length=1000)
    tags: str = Field(default="", max_length=500)


class FlashcardIn(BaseModel):
    course_id: int | None = None
    question: str = Field(min_length=1, max_length=1000)
    answer: str = Field(min_length=1, max_length=10000)
    topic: str = Field(default="", max_length=180)
    tags: str = Field(default="", max_length=500)


class ReviewIn(BaseModel):
    quality: int = Field(ge=0, le=5)


class StudySessionIn(BaseModel):
    course_id: int | None = None
    task_id: int | None = None
    notes: str = Field(default="", max_length=500)


class RecurrenceIn(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    course_id: int | None = None
    kind: str = Field(default="homework", pattern="^(homework|study|review|oral|project|research|submission|other)$")
    frequency: str = Field(pattern="^(daily|weekly|monthly)$")
    interval: int = Field(default=1, ge=1, le=52)
    start_date: date


class SubtaskIn(BaseModel):
    title: str = Field(min_length=1, max_length=160)


class LessonIn(BaseModel):
    course_id: int
    weekday: int = Field(ge=0, le=4)
    start_time: str = Field(pattern="^([01]\\d|2[0-3]):[0-5]\\d$")
    end_time: str = Field(pattern="^([01]\\d|2[0-3]):[0-5]\\d$")
    room: str = Field(default="", max_length=40)


class GradeIn(BaseModel):
    course_id: int
    value: float = Field(ge=1, le=10)
    weight: float = Field(default=1, gt=0, le=10)
    kind: str = Field(pattern="^(scritto|orale|pratico)$")
    day: date
    description: str = Field(default="", max_length=240)
    period: str = Field(default="annual", pattern="^(first|second|annual)$")
    school_year: str = Field(default="", max_length=9)
    status: str = Field(default="final", pattern="^(provisional|final)$")
    note: str = Field(default="", max_length=500)


def lesson_out(db: Session, lesson: Lesson):
    c = db.get(Course, lesson.course_id)
    return {"id": lesson.id, "course_id": lesson.course_id, "course_name": c.name if c else "",
            "course_color": c.color if c else "#ff6a1a", "weekday": lesson.weekday,
            "start_time": lesson.start_time, "end_time": lesson.end_time, "room": lesson.room}


def grade_out(db: Session, grade: Grade):
    c = db.get(Course, grade.course_id)
    meta = db.scalar(select(GradeMeta).where(GradeMeta.grade_id == grade.id))
    return {"id": grade.id, "course_id": grade.course_id, "course_name": c.name if c else "",
            "course_color": c.color if c else "#ff6a1a", "value": grade.value, "weight": grade.weight,
            "kind": grade.kind, "day": grade.day.isoformat(), "description": grade.description,
            "period": meta.period if meta else "annual", "school_year": meta.school_year if meta else "",
            "status": meta.status if meta else "final", "note": meta.note if meta else ""}


class CourseIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    teacher: str = Field(default="", max_length=100)
    color: str = Field(default="#ff6a1a", pattern="^#[0-9a-fA-F]{6}$")


class TaskIn(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    kind: str = Field(default="homework", pattern="^(homework|exam|study|review|oral|project|research|submission|other)$")
    due_date: date | None = None
    course_id: int | None = None
    description: str = Field(default="", max_length=1000)
    important: bool = True
    urgent: bool = False
    priority: str = Field(default="normal", pattern="^(low|normal|high)$")
    status: str = Field(default="todo", pattern="^(todo|in_progress|waiting|done|cancelled)$")
    estimated_minutes: int = Field(default=0, ge=0, le=10000)
    notes: str = Field(default="", max_length=1000)


def course_out(c: Course, count: int = 0):
    return {"id": c.id, "name": c.name, "teacher": c.teacher, "color": c.color, "task_count": count}


def task_out(db: Session, t: StudyTask):
    course = db.get(Course, t.course_id) if t.course_id else None
    meta = db.scalar(select(TaskMeta).where(TaskMeta.task_id == t.id))
    subtask_rows = db.scalars(select(AcademicSubtask).where(AcademicSubtask.task_id == t.id)).all()
    return {"id": t.id, "title": t.title, "kind": t.kind, "due_date": t.due_date.isoformat() if t.due_date else None,
            "course_id": t.course_id, "course_name": course.name if course else "Generale", "done": t.done,
            "description": meta.description if meta else "", "important": meta.important if meta else True,
            "urgent": meta.urgent if meta else bool(t.due_date and (t.due_date - date.today()).days <= 1),
            "priority": meta.priority if meta else "normal", "status": meta.status if meta else ("done" if t.done else "todo"),
            "estimated_minutes": meta.estimated_minutes if meta else 0, "notes": meta.notes if meta else "",
            "subtasks_total": len(subtask_rows), "subtasks_done": sum(row.done for row in subtask_rows)}


def advance_recurrence(day: date, frequency: str, interval: int) -> date:
    if frequency == "daily": return day + timedelta(days=interval)
    if frequency == "weekly": return day + timedelta(days=7 * interval)
    month_index = day.year * 12 + day.month - 1 + interval
    year, month = divmod(month_index, 12); month += 1
    last_day = (date(year + (month == 12), month % 12 + 1, 1) - timedelta(days=1)).day
    return date(year, month, min(day.day, last_day))


def materialize_recurrences(db: Session):
    today = date.today()
    for recurrence in db.scalars(select(TaskRecurrence).where(TaskRecurrence.active.is_(True))):
        generated = 0
        while recurrence.next_date <= today and generated < 90:
            task = StudyTask(title=recurrence.title, kind=recurrence.kind, due_date=recurrence.next_date, course_id=recurrence.course_id)
            db.add(task); db.flush(); db.add(TaskMeta(task_id=task.id, status="todo"))
            recurrence.next_date = advance_recurrence(recurrence.next_date, recurrence.frequency, recurrence.interval)
            generated += 1
    db.commit()


@router.get("/courses")
def courses(db: Session = Depends(get_db)):
    return [course_out(c, len(db.scalars(select(StudyTask.id).where(StudyTask.course_id == c.id, StudyTask.done.is_(False))).all()))
            for c in db.scalars(select(Course).order_by(Course.name))]


@router.post("/courses", status_code=201)
def add_course(data: CourseIn, db: Session = Depends(get_db)):
    c = Course(**data.model_dump())
    db.add(c); db.commit(); db.refresh(c)
    return course_out(c)


@router.put("/courses/{course_id}")
def update_course(course_id: int, data: CourseIn, db: Session = Depends(get_db)):
    c = db.get(Course, course_id)
    if not c: raise HTTPException(404, "Corso non trovato")
    c.name, c.teacher, c.color = data.name, data.teacher, data.color
    db.commit()
    return course_out(c)


@router.delete("/courses/{course_id}", status_code=204)
def remove_course(course_id: int, db: Session = Depends(get_db)):
    c = db.get(Course, course_id)
    if not c: raise HTTPException(404, "Corso non trovato")
    for t in db.scalars(select(StudyTask).where(StudyTask.course_id == course_id)):
        t.course_id = None
    db.delete(c); db.commit()


@router.get("/tasks")
def tasks(db: Session = Depends(get_db)):
    materialize_recurrences(db)
    return [task_out(db, t) for t in db.scalars(select(StudyTask).order_by(StudyTask.done, StudyTask.due_date, StudyTask.id))]


@router.post("/tasks", status_code=201)
def add_task(data: TaskIn, db: Session = Depends(get_db)):
    if data.course_id is not None and not db.get(Course, data.course_id):
        raise HTTPException(422, "Corso inesistente")
    values = data.model_dump()
    meta_values = {key: values.pop(key) for key in ("description", "important", "urgent", "priority", "status", "estimated_minutes", "notes")}
    t = StudyTask(**{key: value for key, value in values.items() if key != "status"})
    t.done = meta_values["status"] == "done"
    db.add(t); db.flush(); db.add(TaskMeta(task_id=t.id, **meta_values)); db.commit(); db.refresh(t)
    return task_out(db, t)


@router.put("/tasks/{task_id}")
def update_task(task_id: int, data: TaskIn, db: Session = Depends(get_db)):
    t = db.get(StudyTask, task_id)
    if not t: raise HTTPException(404, "Attività non trovata")
    if data.course_id is not None and not db.get(Course, data.course_id):
        raise HTTPException(422, "Corso inesistente")
    values = data.model_dump()
    meta_values = {key: values.pop(key) for key in ("description", "important", "urgent", "priority", "status", "estimated_minutes", "notes")}
    t.title, t.kind, t.due_date, t.course_id = data.title, data.kind, data.due_date, data.course_id
    t.done = meta_values["status"] == "done"
    meta = db.scalar(select(TaskMeta).where(TaskMeta.task_id == t.id))
    if not meta: meta = TaskMeta(task_id=t.id); db.add(meta)
    for key, value in meta_values.items(): setattr(meta, key, value)
    db.commit()
    return task_out(db, t)


@router.post("/tasks/{task_id}/toggle")
def toggle_task(task_id: int, db: Session = Depends(get_db)):
    t = db.get(StudyTask, task_id)
    if not t: raise HTTPException(404, "Attività non trovata")
    t.done = not t.done
    meta = db.scalar(select(TaskMeta).where(TaskMeta.task_id == t.id))
    if meta: meta.status = "done" if t.done else "todo"
    db.commit()
    return task_out(db, t)


@router.delete("/tasks/{task_id}", status_code=204)
def remove_task(task_id: int, db: Session = Depends(get_db)):
    t = db.get(StudyTask, task_id)
    if not t: raise HTTPException(404, "Attività non trovata")
    meta = db.scalar(select(TaskMeta).where(TaskMeta.task_id == t.id))
    if meta: db.delete(meta)
    for subtask in db.scalars(select(AcademicSubtask).where(AcademicSubtask.task_id == t.id)):
        db.delete(subtask)
    db.delete(t); db.commit()


@router.get("/tasks/{task_id}/subtasks")
def list_subtasks(task_id: int, db: Session = Depends(get_db)):
    if not db.get(StudyTask, task_id): raise HTTPException(404, "Attività non trovata")
    return [{"id": row.id, "task_id": row.task_id, "title": row.title, "done": row.done}
            for row in db.scalars(select(AcademicSubtask).where(AcademicSubtask.task_id == task_id).order_by(AcademicSubtask.id))]


@router.post("/tasks/{task_id}/subtasks", status_code=201)
def add_subtask(task_id: int, data: SubtaskIn, db: Session = Depends(get_db)):
    if not db.get(StudyTask, task_id): raise HTTPException(404, "Attività non trovata")
    row = AcademicSubtask(task_id=task_id, title=data.title.strip()); db.add(row); db.commit(); db.refresh(row)
    return {"id": row.id, "task_id": row.task_id, "title": row.title, "done": row.done}


@router.post("/subtasks/{subtask_id}/toggle")
def toggle_subtask(subtask_id: int, db: Session = Depends(get_db)):
    row = db.get(AcademicSubtask, subtask_id)
    if not row: raise HTTPException(404, "Sottoattività non trovata")
    row.done = not row.done; db.commit()
    return {"id": row.id, "task_id": row.task_id, "title": row.title, "done": row.done}


@router.delete("/subtasks/{subtask_id}", status_code=204)
def delete_subtask(subtask_id: int, db: Session = Depends(get_db)):
    row = db.get(AcademicSubtask, subtask_id)
    if not row: raise HTTPException(404, "Sottoattività non trovata")
    db.delete(row); db.commit()


@router.get("/recurrences")
def list_recurrences(db: Session = Depends(get_db)):
    return [{"id": r.id, "title": r.title, "course_id": r.course_id, "kind": r.kind,
             "frequency": r.frequency, "interval": r.interval, "next_date": r.next_date.isoformat(), "active": r.active}
            for r in db.scalars(select(TaskRecurrence).order_by(TaskRecurrence.id.desc()))]


@router.post("/recurrences", status_code=201)
def add_recurrence(data: RecurrenceIn, db: Session = Depends(get_db)):
    if data.course_id is not None and not db.get(Course, data.course_id): raise HTTPException(422, "Corso inesistente")
    row = TaskRecurrence(title=data.title.strip(), course_id=data.course_id, kind=data.kind,
                         frequency=data.frequency, interval=data.interval, next_date=data.start_date)
    db.add(row); db.flush()
    occurrence=StudyTask(title=row.title,kind=row.kind,due_date=row.next_date,course_id=row.course_id)
    db.add(occurrence);db.flush();db.add(TaskMeta(task_id=occurrence.id,status="todo"))
    row.next_date=advance_recurrence(row.next_date,row.frequency,row.interval)
    db.commit(); db.refresh(row); materialize_recurrences(db)
    return {"id": row.id, "title": row.title, "course_id": row.course_id, "kind": row.kind,
            "frequency": row.frequency, "interval": row.interval, "next_date": row.next_date.isoformat(), "active": row.active}


@router.post("/recurrences/{recurrence_id}/toggle")
def toggle_recurrence(recurrence_id: int, db: Session = Depends(get_db)):
    row = db.get(TaskRecurrence, recurrence_id)
    if not row: raise HTTPException(404, "Ricorrenza non trovata")
    row.active = not row.active; db.commit()
    return {"id": row.id, "active": row.active, "next_date": row.next_date.isoformat()}


@router.delete("/recurrences/{recurrence_id}", status_code=204)
def delete_recurrence(recurrence_id: int, db: Session = Depends(get_db)):
    row = db.get(TaskRecurrence, recurrence_id)
    if not row: raise HTTPException(404, "Ricorrenza non trovata")
    db.delete(row); db.commit()


def session_out(db: Session, row: StudySession):
    course = db.get(Course, row.course_id) if row.course_id else None
    elapsed = row.elapsed_seconds
    if row.state == "running":
        started = row.started_at.replace(tzinfo=timezone.utc) if row.started_at.tzinfo is None else row.started_at
        elapsed += max(0, int((datetime.now(timezone.utc) - started).total_seconds()))
    return {"id": row.id, "course_id": row.course_id, "course_name": course.name if course else "Generale",
            "task_id": row.task_id, "started_at": row.started_at.isoformat(),
            "ended_at": row.ended_at.isoformat() if row.ended_at else None,
            "elapsed_seconds": elapsed, "state": row.state, "notes": row.notes}


@router.get("/study-sessions")
def list_study_sessions(db: Session = Depends(get_db)):
    return [session_out(db, row) for row in db.scalars(select(StudySession).order_by(StudySession.started_at.desc()).limit(300))]


@router.post("/study-sessions", status_code=201)
def start_study_session(data: StudySessionIn, db: Session = Depends(get_db)):
    if data.course_id is not None and not db.get(Course, data.course_id): raise HTTPException(422, "Corso inesistente")
    if data.task_id is not None and not db.get(StudyTask, data.task_id): raise HTTPException(422, "Attività inesistente")
    active = db.scalar(select(StudySession.id).where(StudySession.state.in_(["running", "paused"])).limit(1))
    if active: raise HTTPException(409, "Completa o interrompi la sessione già attiva")
    row = StudySession(course_id=data.course_id, task_id=data.task_id, notes=data.notes,
                       started_at=datetime.now(timezone.utc), state="running")
    db.add(row); db.commit(); db.refresh(row); return session_out(db, row)


@router.post("/study-sessions/{session_id}/{action}")
def control_study_session(session_id: int, action: str, db: Session = Depends(get_db)):
    row = db.get(StudySession, session_id)
    if not row: raise HTTPException(404, "Sessione non trovata")
    now = datetime.now(timezone.utc)
    if action == "pause" and row.state == "running":
        started = row.started_at.replace(tzinfo=timezone.utc) if row.started_at.tzinfo is None else row.started_at
        row.elapsed_seconds += max(0, int((now-started).total_seconds())); row.state = "paused"
    elif action == "resume" and row.state == "paused": row.started_at = now; row.state = "running"
    elif action in ("stop", "complete") and row.state in ("running", "paused"):
        if row.state == "running":
            started = row.started_at.replace(tzinfo=timezone.utc) if row.started_at.tzinfo is None else row.started_at
            row.elapsed_seconds += max(0, int((now-started).total_seconds()))
        row.state = "completed" if action == "complete" else "stopped"; row.ended_at = now
    else: raise HTTPException(409, "Azione non valida per lo stato corrente")
    db.commit(); return session_out(db, row)


@router.get("/study-stats")
def study_stats(db: Session = Depends(get_db)):
    rows = db.scalars(select(StudySession).where(StudySession.state.in_(["completed", "stopped"]))).all()
    now = datetime.now(timezone.utc); today = now.date(); week_start = today - timedelta(days=today.weekday()); month_start = today.replace(day=1)
    by_course: dict[str, int] = {}; daily: dict[str, int] = {}
    day_total = week_total = month_total = 0
    for row in rows:
        start = row.started_at.replace(tzinfo=timezone.utc) if row.started_at.tzinfo is None else row.started_at
        seconds = row.elapsed_seconds; course = db.get(Course, row.course_id) if row.course_id else None
        by_course[course.name if course else "Generale"] = by_course.get(course.name if course else "Generale", 0) + seconds
        key = start.date().isoformat(); daily[key] = daily.get(key, 0) + seconds
        if start.date() == today: day_total += seconds
        if start.date() >= week_start: week_total += seconds
        if start.date() >= month_start: month_total += seconds
    return {"today_seconds": day_total, "week_seconds": week_total, "month_seconds": month_total,
            "sessions_count": len(rows), "by_course": by_course, "daily": daily}


def exam_out(db: Session, exam: AcademicExam):
    course = db.get(Course, exam.course_id)
    task_ids = db.scalars(select(ExamTaskLink.task_id).where(ExamTaskLink.exam_id == exam.id)).all()
    grade_link = db.scalar(select(ExamGradeLink).where(ExamGradeLink.exam_id == exam.id))
    grade = db.get(Grade, grade_link.grade_id) if grade_link else None
    return {"id": exam.id, "course_id": exam.course_id, "course_name": course.name if course else "",
            "course_color": course.color if course else "#ff6a1a", "title": exam.title,
            "exam_date": exam.exam_date.isoformat(), "kind": exam.kind, "topics": exam.topics,
            "description": exam.description, "difficulty": exam.difficulty, "priority": exam.priority,
            "prep_status": exam.prep_status, "notes": exam.notes, "task_ids": task_ids,
            "grade_id": grade.id if grade else None, "grade_value": grade.value if grade else None}


@router.get("/exams")
def list_exams(db: Session = Depends(get_db)):
    return [exam_out(db, exam) for exam in db.scalars(select(AcademicExam).order_by(AcademicExam.exam_date))]


@router.post("/exams", status_code=201)
def create_exam(data: ExamIn, db: Session = Depends(get_db)):
    if not db.get(Course, data.course_id): raise HTTPException(422, "Corso inesistente")
    exam = AcademicExam(**data.model_dump()); db.add(exam); db.commit(); db.refresh(exam)
    return exam_out(db, exam)


@router.put("/exams/{exam_id}")
def update_exam(exam_id: int, data: ExamIn, db: Session = Depends(get_db)):
    exam = db.get(AcademicExam, exam_id)
    if not exam: raise HTTPException(404, "Verifica non trovata")
    if not db.get(Course, data.course_id): raise HTTPException(422, "Corso inesistente")
    for key,value in data.model_dump().items(): setattr(exam,key,value)
    db.commit(); return exam_out(db,exam)


@router.post("/exams/{exam_id}/tasks/{task_id}", status_code=201)
def link_exam_task(exam_id: int, task_id: int, db: Session = Depends(get_db)):
    exam, task = db.get(AcademicExam,exam_id),db.get(StudyTask,task_id)
    if not exam or not task: raise HTTPException(404,"Verifica o attività non trovata")
    existing=db.scalar(select(ExamTaskLink).where(ExamTaskLink.task_id==task_id))
    if existing:
        if existing.exam_id==exam_id: return exam_out(db,exam)
        raise HTTPException(409,"L'attività è già collegata a un'altra verifica")
    db.add(ExamTaskLink(exam_id=exam_id,task_id=task_id));db.commit();return exam_out(db,exam)


@router.delete("/exams/{exam_id}/tasks/{task_id}",status_code=204)
def unlink_exam_task(exam_id:int,task_id:int,db:Session=Depends(get_db)):
    link=db.scalar(select(ExamTaskLink).where(ExamTaskLink.exam_id==exam_id,ExamTaskLink.task_id==task_id))
    if not link: raise HTTPException(404,"Collegamento non trovato")
    db.delete(link);db.commit()


@router.post("/exams/{exam_id}/grade",status_code=201)
def record_exam_grade(exam_id:int,data:GradeIn,db:Session=Depends(get_db)):
    exam=db.get(AcademicExam,exam_id)
    if not exam: raise HTTPException(404,"Verifica non trovata")
    if exam.course_id!=data.course_id: raise HTTPException(422,"Il voto deve appartenere alla materia della verifica")
    if db.scalar(select(ExamGradeLink).where(ExamGradeLink.exam_id==exam_id)): raise HTTPException(409,"La verifica ha già un voto collegato")
    values=data.model_dump();meta_values={key:values.pop(key) for key in ("period","school_year","status","note")}
    grade=Grade(**values);db.add(grade);db.flush();db.add(GradeMeta(grade_id=grade.id,**meta_values));db.add(ExamGradeLink(exam_id=exam_id,grade_id=grade.id));exam.prep_status="taken";db.commit();db.refresh(exam)
    return exam_out(db,exam)


@router.delete("/exams/{exam_id}",status_code=204)
def delete_exam(exam_id:int,db:Session=Depends(get_db)):
    exam=db.get(AcademicExam,exam_id)
    if not exam: raise HTTPException(404,"Verifica non trovata")
    for link in db.scalars(select(ExamTaskLink).where(ExamTaskLink.exam_id==exam_id)):db.delete(link)
    grade_link=db.scalar(select(ExamGradeLink).where(ExamGradeLink.exam_id==exam_id))
    if grade_link: db.delete(grade_link)
    db.delete(exam);db.commit()


@router.get("/lessons")
def list_lessons(db: Session = Depends(get_db)):
    return [lesson_out(db, row) for row in db.scalars(select(Lesson).order_by(Lesson.weekday, Lesson.start_time))]


@router.post("/lessons", status_code=201)
def add_lesson(data: LessonIn, db: Session = Depends(get_db)):
    if data.start_time >= data.end_time:
        raise HTTPException(422, "L'ora di fine deve essere successiva all'inizio")
    if not db.get(Course, data.course_id):
        raise HTTPException(422, "Corso inesistente")
    collision = db.scalar(select(Lesson.id).where(Lesson.weekday == data.weekday,
        Lesson.start_time < data.end_time, Lesson.end_time > data.start_time).limit(1))
    if collision:
        raise HTTPException(409, "La fascia oraria si sovrappone a un'altra lezione")
    row = Lesson(**data.model_dump()); db.add(row); db.commit(); db.refresh(row)
    return lesson_out(db, row)


@router.put("/lessons/{lesson_id}")
def update_lesson(lesson_id: int, data: LessonIn, db: Session = Depends(get_db)):
    row = db.get(Lesson, lesson_id)
    if not row: raise HTTPException(404, "Lezione non trovata")
    if data.start_time >= data.end_time:
        raise HTTPException(422, "L'ora di fine deve essere successiva all'inizio")
    if not db.get(Course, data.course_id):
        raise HTTPException(422, "Corso inesistente")
    collision = db.scalar(select(Lesson.id).where(Lesson.id != lesson_id, Lesson.weekday == data.weekday,
        Lesson.start_time < data.end_time, Lesson.end_time > data.start_time).limit(1))
    if collision: raise HTTPException(409, "La fascia oraria si sovrappone a un'altra lezione")
    for key, value in data.model_dump().items(): setattr(row, key, value)
    db.commit(); return lesson_out(db, row)


@router.delete("/lessons/{lesson_id}", status_code=204)
def delete_lesson(lesson_id: int, db: Session = Depends(get_db)):
    row = db.get(Lesson, lesson_id)
    if not row: raise HTTPException(404, "Lezione non trovata")
    db.delete(row); db.commit()


@router.get("/grades")
def list_grades(course_id: int | None = None, period: str | None = None, school_year: str | None = None,
                kind: str | None = None, status: str | None = None, db: Session = Depends(get_db)):
    query = select(Grade).order_by(Grade.day.desc(), Grade.id.desc())
    if course_id is not None: query = query.where(Grade.course_id == course_id)
    rows = [grade_out(db, row) for row in db.scalars(query)]
    if period: rows = [row for row in rows if row["period"] == period]
    if school_year: rows = [row for row in rows if row["school_year"] == school_year]
    if kind: rows = [row for row in rows if row["kind"] == kind]
    if status: rows = [row for row in rows if row["status"] == status]
    return rows


@router.post("/grades", status_code=201)
def add_grade(data: GradeIn, db: Session = Depends(get_db)):
    if not db.get(Course, data.course_id): raise HTTPException(422, "Corso inesistente")
    values = data.model_dump()
    meta_values = {key: values.pop(key) for key in ("period", "school_year", "status", "note")}
    row = Grade(**values); db.add(row); db.flush()
    db.add(GradeMeta(grade_id=row.id, **meta_values)); db.commit(); db.refresh(row)
    return grade_out(db, row)


@router.put("/grades/{grade_id}")
def update_grade(grade_id: int, data: GradeIn, db: Session = Depends(get_db)):
    row = db.get(Grade, grade_id)
    if not row: raise HTTPException(404, "Voto non trovato")
    if not db.get(Course, data.course_id): raise HTTPException(422, "Corso inesistente")
    values = data.model_dump()
    meta_values = {key: values.pop(key) for key in ("period", "school_year", "status", "note")}
    for key, value in values.items(): setattr(row, key, value)
    meta = db.scalar(select(GradeMeta).where(GradeMeta.grade_id == row.id))
    if not meta: meta = GradeMeta(grade_id=row.id); db.add(meta)
    for key, value in meta_values.items(): setattr(meta, key, value)
    db.commit(); return grade_out(db, row)


@router.delete("/grades/{grade_id}", status_code=204)
def delete_grade(grade_id: int, db: Session = Depends(get_db)):
    row = db.get(Grade, grade_id)
    if not row: raise HTTPException(404, "Voto non trovato")
    meta = db.scalar(select(GradeMeta).where(GradeMeta.grade_id == grade_id))
    link = db.scalar(select(ExamGradeLink).where(ExamGradeLink.grade_id == grade_id))
    if link: db.delete(link)
    if meta: db.delete(meta)
    db.delete(row); db.commit()


@router.get("/grade-summary")
def grade_summary(db: Session = Depends(get_db)):
    output = []
    for course in db.scalars(select(Course).order_by(Course.name)):
        grades = db.scalars(select(Grade).where(Grade.course_id == course.id)).all()
        total_weight = sum(g.weight for g in grades)
        output.append({"course_id": course.id, "course_name": course.name, "color": course.color,
            "count": len(grades), "arithmetic_average": round(sum(g.value for g in grades) / len(grades), 2) if grades else None,
            "weighted_average": round(sum(g.value * g.weight for g in grades) / total_weight, 2) if grades else None})
    return output


@router.get("/analytics")
def academic_analytics(db: Session = Depends(get_db)):
    grades = db.scalars(select(Grade).order_by(Grade.day, Grade.id)).all()
    tasks = db.scalars(select(StudyTask)).all()
    sessions = db.scalars(select(StudySession).where(StudySession.state.in_(["completed", "stopped"]))).all()
    monthly: dict[str, list[float]] = {}; buckets = {"insufficiente": 0, "sufficiente": 0, "buono": 0, "ottimo": 0}
    per_course: dict[str, list[float]] = {}
    for g in grades:
        monthly.setdefault(g.day.strftime("%Y-%m"), []).append(g.value)
        course=db.get(Course,g.course_id)
        per_course.setdefault(course.name if course else "Materia rimossa", []).append(g.value)
        key = "insufficiente" if g.value < 6 else "sufficiente" if g.value < 7 else "buono" if g.value < 9 else "ottimo"
        buckets[key] += 1
    trend = []
    for name, values in per_course.items():
        if len(values) >= 4:
            midpoint = len(values) // 2; diff = sum(values[midpoint:]) / len(values[midpoint:]) - sum(values[:midpoint]) / len(values[:midpoint])
            trend.append({"course": name, "change": round(diff, 2), "direction": "in_crescita" if diff >= .5 else "in_calo" if diff <= -.5 else "stabile", "sample_size": len(values)})
    now = date.today(); sessions_week = 0
    for session in sessions:
        started = session.started_at.replace(tzinfo=timezone.utc) if session.started_at.tzinfo is None else session.started_at
        if started.date() >= now - timedelta(days=now.weekday()): sessions_week += session.elapsed_seconds
    return {"grades_by_month": [{"month": m, "average": round(sum(v)/len(v),2), "count": len(v)} for m,v in sorted(monthly.items())],
        "grade_distribution": [{"range": k, "count": v} for k,v in buckets.items()],
        "course_averages": grade_summary(db), "course_trends": trend,
        "tasks": {"total":len(tasks),"completed":sum(t.done for t in tasks),"pending":sum(not t.done for t in tasks),
                  "overdue":sum(not t.done and t.due_date is not None and t.due_date < now for t in tasks)},
        "study_week_seconds": sessions_week}


@router.get("/goals")
def list_goals(db: Session = Depends(get_db)):
    output=[]
    for goal in db.scalars(select(AcademicGoal).order_by(AcademicGoal.id)):
        course=db.get(Course,goal.course_id) if goal.course_id else None
        grades=db.scalars(select(Grade).where(Grade.course_id==goal.course_id)).all() if goal.course_id else db.scalars(select(Grade)).all()
        average=sum(g.value for g in grades)/len(grades) if grades else None
        output.append({"id":goal.id,"course_id":goal.course_id,"course_name":course.name if course else "Generale",
            "target_average":goal.target_average,"current_average":round(average,2) if average is not None else None,
            "period":goal.period,"school_year":goal.school_year,"label":goal.label,
            "reached":average is not None and average>=goal.target_average})
    return output


@router.post("/goals",status_code=201)
def create_goal(data:GoalIn,db:Session=Depends(get_db)):
    if data.course_id is not None and not db.get(Course,data.course_id):raise HTTPException(422,"Corso inesistente")
    row=AcademicGoal(**data.model_dump());db.add(row);db.commit();db.refresh(row)
    return next(item for item in list_goals(db) if item["id"]==row.id)


@router.delete("/goals/{goal_id}",status_code=204)
def delete_goal(goal_id:int,db:Session=Depends(get_db)):
    row=db.get(AcademicGoal,goal_id)
    if not row:raise HTTPException(404,"Obiettivo non trovato")
    db.delete(row);db.commit()


@router.get("/grades/export.csv")
def export_grades_csv(period:str|None=None,school_year:str|None=None,db:Session=Depends(get_db)):
    output=io.StringIO(newline="");writer=csv.writer(output)
    writer.writerow(["Materia","Voto","Peso","Tipologia","Data","Periodo","Anno scolastico","Stato","Argomento","Note"])
    rows=[grade_out(db,g) for g in db.scalars(select(Grade).order_by(Grade.day,Grade.id))]
    for g in rows:
        if period and g["period"]!=period:continue
        if school_year and g["school_year"]!=school_year:continue
        writer.writerow([g["course_name"],g["value"],g["weight"],g["kind"],g["day"],g["period"],g["school_year"],g["status"],g["description"],g["note"]])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]),media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition":"attachment; filename=nexus-academic-grades.csv"})


def note_out(db:Session,row:AcademicNote):
    course=db.get(Course,row.course_id) if row.course_id else None
    return {"id":row.id,"course_id":row.course_id,"course_name":course.name if course else "Generale",
        "title":row.title,"content":row.content,"external_url":row.external_url,"tags":row.tags,
        "updated_at":row.updated_at.isoformat()}


@router.get("/notes")
def academic_notes(q:str="",course_id:int|None=None,db:Session=Depends(get_db)):
    rows=db.scalars(select(AcademicNote).order_by(AcademicNote.updated_at.desc())).all()
    if course_id is not None:rows=[r for r in rows if r.course_id==course_id]
    if q:rows=[r for r in rows if q.lower() in (r.title+r.content+r.tags+r.external_url).lower()]
    return [note_out(db,r) for r in rows]


@router.post("/notes",status_code=201)
def create_academic_note(data:NoteIn,db:Session=Depends(get_db)):
    if data.course_id is not None and not db.get(Course,data.course_id):raise HTTPException(422,"Corso inesistente")
    row=AcademicNote(**data.model_dump());db.add(row);db.commit();db.refresh(row);return note_out(db,row)


@router.put("/notes/{note_id}")
def update_academic_note(note_id:int,data:NoteIn,db:Session=Depends(get_db)):
    row=db.get(AcademicNote,note_id)
    if not row:raise HTTPException(404,"Appunto non trovato")
    if data.course_id is not None and not db.get(Course,data.course_id):raise HTTPException(422,"Corso inesistente")
    for key,value in data.model_dump().items():setattr(row,key,value)
    row.updated_at=datetime.now(timezone.utc);db.commit();return note_out(db,row)


@router.delete("/notes/{note_id}",status_code=204)
def delete_academic_note(note_id:int,db:Session=Depends(get_db)):
    row=db.get(AcademicNote,note_id)
    if not row:raise HTTPException(404,"Appunto non trovato")
    db.delete(row);db.commit()


def flashcard_out(db:Session,row:Flashcard):
    course=db.get(Course,row.course_id) if row.course_id else None
    return {"id":row.id,"course_id":row.course_id,"course_name":course.name if course else "Generale",
        "question":row.question,"answer":row.answer,"topic":row.topic,"tags":row.tags,
        "ease_factor":row.ease_factor,"interval_days":row.interval_days,"repetitions":row.repetitions,
        "due_date":row.due_date.isoformat(),"last_reviewed":row.last_reviewed.isoformat() if row.last_reviewed else None}


@router.get("/flashcards")
def list_flashcards(due_only:bool=False,course_id:int|None=None,db:Session=Depends(get_db)):
    query=select(Flashcard).order_by(Flashcard.due_date,Flashcard.id)
    if due_only:query=query.where(Flashcard.due_date<=date.today())
    if course_id is not None:query=query.where(Flashcard.course_id==course_id)
    return [flashcard_out(db,row) for row in db.scalars(query)]


@router.post("/flashcards",status_code=201)
def create_flashcard(data:FlashcardIn,db:Session=Depends(get_db)):
    if data.course_id is not None and not db.get(Course,data.course_id):raise HTTPException(422,"Corso inesistente")
    row=Flashcard(**data.model_dump());db.add(row);db.commit();db.refresh(row);return flashcard_out(db,row)


@router.put("/flashcards/{card_id}")
def update_flashcard(card_id:int,data:FlashcardIn,db:Session=Depends(get_db)):
    row=db.get(Flashcard,card_id)
    if not row:raise HTTPException(404,"Flashcard non trovata")
    if data.course_id is not None and not db.get(Course,data.course_id):raise HTTPException(422,"Corso inesistente")
    for key,value in data.model_dump().items():setattr(row,key,value)
    db.commit();return flashcard_out(db,row)


@router.post("/flashcards/{card_id}/review")
def review_flashcard(card_id:int,data:ReviewIn,db:Session=Depends(get_db)):
    row=db.get(Flashcard,card_id)
    if not row:raise HTTPException(404,"Flashcard non trovata")
    quality=data.quality
    if quality<3:row.repetitions=0;row.interval_days=1
    else:
        row.interval_days=1 if row.repetitions==0 else 6 if row.repetitions==1 else max(1,round(row.interval_days*row.ease_factor))
        row.repetitions+=1
    row.ease_factor=max(1.3,row.ease_factor+0.1-(5-quality)*(0.08+(5-quality)*0.02))
    row.last_reviewed=date.today();row.due_date=date.today()+timedelta(days=row.interval_days)
    db.commit();return flashcard_out(db,row)


@router.delete("/flashcards/{card_id}",status_code=204)
def delete_flashcard(card_id:int,db:Session=Depends(get_db)):
    row=db.get(Flashcard,card_id)
    if not row:raise HTTPException(404,"Flashcard non trovata")
    db.delete(row);db.commit()

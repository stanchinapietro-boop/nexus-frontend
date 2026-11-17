from datetime import date, datetime, timezone
from calendar import monthrange

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import JSON, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, select
from sqlalchemy.orm import Mapped, Session, mapped_column

from .db import Base, get_db

router = APIRouter(prefix="/api/life", tags=["life-planner"])


class PersonalTask(Base):
    __tablename__ = "life_tasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(180))
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(30), default="personal")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    priority: Mapped[str] = mapped_column(String(10), default="normal")
    important: Mapped[bool] = mapped_column(default=False)
    urgent: Mapped[bool] = mapped_column(default=False)
    status: Mapped[str] = mapped_column(String(12), default="todo")
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class TaskCompletion(Base):
    __tablename__ = "life_task_completions"
    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("life_tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(180))
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    completed_on: Mapped[date] = mapped_column(Date, default=date.today, index=True)


class TaskSubtask(Base):
    __tablename__ = "life_task_subtasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("life_tasks.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(180))
    position: Mapped[int] = mapped_column(Integer, default=0)
    completed: Mapped[bool] = mapped_column(default=False)


class TaskRecurrence(Base):
    __tablename__ = "life_task_recurrences"
    id: Mapped[int] = mapped_column(primary_key=True)
    template_task_id: Mapped[int] = mapped_column(ForeignKey("life_tasks.id", ondelete="CASCADE"), unique=True)
    frequency: Mapped[str] = mapped_column(String(12))
    interval: Mapped[int] = mapped_column(Integer, default=1)
    anchor_day: Mapped[int] = mapped_column(Integer, default=1)
    next_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    active: Mapped[bool] = mapped_column(default=True)


class TaskOccurrence(Base):
    __tablename__ = "life_task_occurrences"
    __table_args__ = (UniqueConstraint("recurrence_id", "scheduled_date", name="uq_life_task_occurrence"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    recurrence_id: Mapped[int] = mapped_column(ForeignKey("life_task_recurrences.id", ondelete="CASCADE"), index=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("life_tasks.id", ondelete="CASCADE"), unique=True)
    scheduled_date: Mapped[date] = mapped_column(Date)


class PersonalGoal(Base):
    __tablename__ = "life_goals"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(180))
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(30), default="personal")
    goal_type: Mapped[str] = mapped_column(String(16), default="completion")
    target_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_value: Mapped[float] = mapped_column(Float, default=0)
    unit: Mapped[str] = mapped_column(String(30), default="")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    motivation: Mapped[str] = mapped_column(Text, default="")
    active: Mapped[bool] = mapped_column(default=True)


class Habit(Base):
    __tablename__ = "life_habits"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(30), default="personal")
    kind: Mapped[str] = mapped_column(String(12), default="binary")
    days: Mapped[str] = mapped_column(String(20), default="0,1,2,3,4,5,6")
    target_value: Mapped[float] = mapped_column(Float, default=1)
    unit: Mapped[str] = mapped_column(String(30), default="")
    start_date: Mapped[date] = mapped_column(Date, default=date.today)
    active: Mapped[bool] = mapped_column(default=True)


class HabitLog(Base):
    __tablename__ = "life_habit_logs"
    __table_args__ = (UniqueConstraint("habit_id", "day", name="uq_life_habit_day"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    habit_id: Mapped[int] = mapped_column(ForeignKey("life_habits.id"))
    day: Mapped[date] = mapped_column(Date)
    value: Mapped[float] = mapped_column(Float, default=1)
    completed: Mapped[bool] = mapped_column(default=True)
    note: Mapped[str] = mapped_column(String(300), default="")


class Routine(Base):
    __tablename__ = "life_routines"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    kind: Mapped[str] = mapped_column(String(30), default="custom")
    days: Mapped[str] = mapped_column(String(20), default="0,1,2,3,4,5,6")
    active: Mapped[bool] = mapped_column(default=True)


class RoutineStep(Base):
    __tablename__ = "life_routine_steps"
    id: Mapped[int] = mapped_column(primary_key=True)
    routine_id: Mapped[int] = mapped_column(ForeignKey("life_routines.id"))
    title: Mapped[str] = mapped_column(String(140))
    position: Mapped[int] = mapped_column(Integer, default=0)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0)


class RoutineLog(Base):
    __tablename__ = "life_routine_logs"
    __table_args__ = (UniqueConstraint("routine_id", "day", name="uq_life_routine_day"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    routine_id: Mapped[int] = mapped_column(ForeignKey("life_routines.id"))
    day: Mapped[date] = mapped_column(Date)
    completed_steps: Mapped[str] = mapped_column(String(2000), default="")


class Workout(Base):
    __tablename__ = "life_workouts"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    sport: Mapped[str] = mapped_column(String(40))
    day: Mapped[date] = mapped_column(Date)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0)
    place: Mapped[str] = mapped_column(String(180), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    intensity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    completed: Mapped[bool] = mapped_column(default=False)


class WorkoutExercise(Base):
    __tablename__ = "life_workout_exercises"
    id: Mapped[int] = mapped_column(primary_key=True)
    workout_id: Mapped[int] = mapped_column(ForeignKey("life_workouts.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(140))
    muscle_group: Mapped[str] = mapped_column(String(60), default="")
    sets: Mapped[list] = mapped_column(JSON, default=list)
    notes: Mapped[str] = mapped_column(Text, default="")


class Recipe(Base):
    __tablename__ = "life_recipes"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180))
    category: Mapped[str] = mapped_column(String(40), default="other")
    ingredients: Mapped[list] = mapped_column(JSON, default=list)
    instructions: Mapped[str] = mapped_column(Text, default="")
    portions: Mapped[int] = mapped_column(Integer, default=1)
    prep_minutes: Mapped[int] = mapped_column(Integer, default=0)
    cook_minutes: Mapped[int] = mapped_column(Integer, default=0)
    difficulty: Mapped[str] = mapped_column(String(12), default="medium")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    favorite: Mapped[bool] = mapped_column(default=False)


class ShoppingItem(Base):
    __tablename__ = "life_shopping_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180))
    quantity: Mapped[float] = mapped_column(Float, default=1)
    unit: Mapped[str] = mapped_column(String(30), default="")
    category: Mapped[str] = mapped_column(String(30), default="food")
    expected_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    purchased: Mapped[bool] = mapped_column(default=False)
    notes: Mapped[str] = mapped_column(String(300), default="")


class PantryItem(Base):
    __tablename__ = "life_pantry_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180))
    quantity: Mapped[float] = mapped_column(Float, default=1)
    unit: Mapped[str] = mapped_column(String(30), default="")
    category: Mapped[str] = mapped_column(String(30), default="food")
    expiry: Mapped[date | None] = mapped_column(Date, nullable=True)
    location: Mapped[str] = mapped_column(String(80), default="")


class Trip(Base):
    __tablename__ = "life_trips"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180))
    destination: Mapped[str] = mapped_column(String(180))
    country: Mapped[str] = mapped_column(String(100), default="")
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    description: Mapped[str] = mapped_column(Text, default="")
    companions: Mapped[list] = mapped_column(JSON, default=list)
    budget: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="planned")
    notes: Mapped[str] = mapped_column(Text, default="")


class PersonalEvent(Base):
    __tablename__ = "life_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(180))
    category: Mapped[str] = mapped_column(String(30), default="personal")
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    location: Mapped[str] = mapped_column(String(180), default="")
    description: Mapped[str] = mapped_column(Text, default="")


class MediaItem(Base):
    __tablename__ = "life_media_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    media_type: Mapped[str] = mapped_column(String(16))
    title: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(16), default="planned")
    genre: Mapped[str] = mapped_column(String(80), default="")
    progress: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")


class MediaDetails(Base):
    __tablename__ = "life_media_details"
    id: Mapped[int] = mapped_column(primary_key=True)
    media_id: Mapped[int] = mapped_column(ForeignKey("life_media_items.id", ondelete="CASCADE"), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    cover_url: Mapped[str] = mapped_column(String(1000), default="")
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    platform: Mapped[str] = mapped_column(String(100), default="")
    author: Mapped[str] = mapped_column(String(180), default="")
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    seasons: Mapped[int | None] = mapped_column(Integer, nullable=True)
    episodes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_season: Mapped[int] = mapped_column(Integer, default=0)
    current_episode: Mapped[int] = mapped_column(Integer, default=0)
    hours_played: Mapped[float] = mapped_column(Float, default=0)


class MealPlan(Base):
    __tablename__ = "life_meal_plans"
    id: Mapped[int] = mapped_column(primary_key=True)
    day: Mapped[date] = mapped_column(Date, index=True)
    meal_type: Mapped[str] = mapped_column(String(20))
    recipe_id: Mapped[int | None] = mapped_column(ForeignKey("life_recipes.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(180), default="")
    portions: Mapped[int] = mapped_column(Integer, default=1)
    notes: Mapped[str] = mapped_column(Text, default="")
    consumed: Mapped[bool] = mapped_column(default=False)


class GoalMilestone(Base):
    __tablename__ = "life_goal_milestones"
    id: Mapped[int] = mapped_column(primary_key=True)
    goal_id: Mapped[int] = mapped_column(ForeignKey("life_goals.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(180))
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    completed: Mapped[bool] = mapped_column(default=False)


class TripActivity(Base):
    __tablename__ = "life_trip_activities"
    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("life_trips.id", ondelete="CASCADE"), index=True)
    day: Mapped[date] = mapped_column(Date)
    title: Mapped[str] = mapped_column(String(180))
    kind: Mapped[str] = mapped_column(String(30), default="activity")
    starts_at: Mapped[str] = mapped_column(String(5), default="")
    location: Mapped[str] = mapped_column(String(180), default="")
    url: Mapped[str] = mapped_column(String(500), default="")
    notes: Mapped[str] = mapped_column(Text, default="")


class TripChecklistItem(Base):
    __tablename__ = "life_trip_checklist"
    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("life_trips.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(180))
    category: Mapped[str] = mapped_column(String(30), default="preparation")
    checked: Mapped[bool] = mapped_column(default=False)


class PersonalInterest(Base):
    __tablename__ = "life_interests"
    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(20), index=True)
    title: Mapped[str] = mapped_column(String(180))
    category: Mapped[str] = mapped_column(String(60), default="")
    status: Mapped[str] = mapped_column(String(30), default="planned")
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    hours: Mapped[float] = mapped_column(Float, default=0)
    url: Mapped[str] = mapped_column(String(500), default="")
    details: Mapped[str] = mapped_column(Text, default="")


class NotificationSetting(Base):
    __tablename__ = "life_notification_settings"
    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(40), unique=True)
    enabled: Mapped[bool] = mapped_column(default=True)


class TaskIn(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    description: str = Field(default="", max_length=5000)
    category: str = Field(default="personal", max_length=30)
    due_date: date | None = None
    priority: str = Field(default="normal", pattern="^(low|normal|high)$")
    important: bool = False
    urgent: bool = False
    status: str = Field(default="todo", pattern="^(todo|in_progress|waiting|done|cancelled)$")
    estimated_minutes: int = Field(default=0, ge=0, le=10000)


class TaskCreateIn(TaskIn):
    recurrence_frequency: str | None = Field(default=None, pattern="^(daily|weekly|monthly)$")
    recurrence_interval: int = Field(default=1, ge=1, le=90)
    recurrence_end_date: date | None = None


class TaskRecurrenceIn(BaseModel):
    frequency: str = Field(pattern="^(daily|weekly|monthly)$")
    interval: int = Field(default=1, ge=1, le=90)
    end_date: date | None = None


class GoalIn(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    description: str = Field(default="", max_length=5000)
    category: str = Field(default="personal", max_length=30)
    goal_type: str = Field(default="completion", pattern="^(numeric|frequency|milestone|completion)$")
    target_value: float | None = Field(default=None, gt=0)
    current_value: float = Field(default=0, ge=0)
    unit: str = Field(default="", max_length=30)
    due_date: date | None = None
    motivation: str = Field(default="", max_length=3000)


class HabitIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=2000)
    category: str = Field(default="personal", max_length=30)
    kind: str = Field(default="binary", pattern="^(binary|numeric|duration|negative)$")
    days: list[int] = Field(default_factory=lambda: list(range(7)), max_length=7)
    target_value: float = Field(default=1, gt=0)
    unit: str = Field(default="", max_length=30)
    start_date: date = Field(default_factory=date.today)


class HabitLogIn(BaseModel):
    value: float = Field(default=1, ge=0)
    completed: bool = True
    note: str = Field(default="", max_length=300)


class RoutineIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    kind: str = Field(default="custom", max_length=30)
    days: list[int] = Field(default_factory=lambda: list(range(7)), max_length=7)


class RoutineStepIn(BaseModel):
    title: str = Field(min_length=1, max_length=140)
    duration_minutes: int = Field(default=0, ge=0, le=1440)


class WorkoutIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    sport: str = Field(min_length=1, max_length=40)
    day: date
    duration_minutes: int = Field(default=0, ge=0, le=1440)
    place: str = Field(default="", max_length=180)
    description: str = Field(default="", max_length=4000)
    intensity: int | None = Field(default=None, ge=1, le=10)
    notes: str = Field(default="", max_length=4000)


class WorkoutSetIn(BaseModel):
    reps: int | None = Field(default=None, ge=0, le=10000)
    weight: float | None = Field(default=None, ge=0, le=10000)
    rest_seconds: int | None = Field(default=None, ge=0, le=3600)


class WorkoutExerciseIn(BaseModel):
    name: str = Field(min_length=1, max_length=140)
    muscle_group: str = Field(default="", max_length=60)
    sets: list[WorkoutSetIn] = Field(default_factory=list, max_length=100)
    notes: str = Field(default="", max_length=3000)


class RecipeIngredientIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    quantity: float = Field(default=1, gt=0, le=100000)
    unit: str = Field(default="", max_length=30)


class RecipeIn(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    category: str = Field(default="other", max_length=40)
    ingredients: list[RecipeIngredientIn] = Field(default_factory=list, max_length=200)
    instructions: str = Field(default="", max_length=10000)
    portions: int = Field(default=1, ge=1, le=100)
    prep_minutes: int = Field(default=0, ge=0, le=1440)
    cook_minutes: int = Field(default=0, ge=0, le=1440)
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    tags: list[str] = Field(default_factory=list, max_length=30)
    favorite: bool = False


class ShoppingIn(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    quantity: float = Field(default=1, gt=0)
    unit: str = Field(default="", max_length=30)
    category: str = Field(default="food", max_length=30)
    expected_price: float | None = Field(default=None, ge=0)
    notes: str = Field(default="", max_length=300)


class ShoppingUpdate(ShoppingIn):
    purchased: bool = False


class PantryIn(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    quantity: float = Field(default=1, ge=0)
    unit: str = Field(default="", max_length=30)
    category: str = Field(default="food", max_length=30)
    expiry: date | None = None
    location: str = Field(default="", max_length=80)


class TripIn(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    destination: str = Field(min_length=1, max_length=180)
    country: str = Field(default="", max_length=100)
    start_date: date
    end_date: date
    description: str = Field(default="", max_length=5000)
    companions: list[str] = Field(default_factory=list)
    budget: float | None = Field(default=None, ge=0)
    status: str = Field(default="planned", pattern="^(planned|ongoing|completed|cancelled)$")
    notes: str = Field(default="", max_length=5000)


class EventIn(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    category: str = Field(default="personal", max_length=30)
    starts_at: datetime
    ends_at: datetime | None = None
    location: str = Field(default="", max_length=180)
    description: str = Field(default="", max_length=4000)


class MediaIn(BaseModel):
    media_type: str = Field(pattern="^(movie|series|game|book|music|hobby)$")
    title: str = Field(min_length=1, max_length=200)
    status: str = Field(default="planned", pattern="^(planned|in_progress|completed|paused|dropped)$")
    genre: str = Field(default="", max_length=80)
    progress: int = Field(default=0, ge=0)
    total: int | None = Field(default=None, gt=0)
    rating: float | None = Field(default=None, ge=0, le=10)
    notes: str = Field(default="", max_length=3000)
    description: str = Field(default="", max_length=5000)
    cover_url: str = Field(default="", max_length=1000)
    year: int | None = Field(default=None, ge=1000, le=2200)
    platform: str = Field(default="", max_length=100)
    author: str = Field(default="", max_length=180)
    page_count: int | None = Field(default=None, ge=1, le=100000)
    seasons: int | None = Field(default=None, ge=1, le=1000)
    episodes: int | None = Field(default=None, ge=1, le=100000)
    current_season: int = Field(default=0, ge=0)
    current_episode: int = Field(default=0, ge=0)
    hours_played: float = Field(default=0, ge=0, le=100000)

    @model_validator(mode="after")
    def progress_must_fit_total(self):
        if self.total is not None and self.progress > self.total:
            raise ValueError("Il progresso non può superare il totale")
        if self.seasons is not None and self.current_season > self.seasons:
            raise ValueError("La stagione corrente supera il totale")
        if self.episodes is not None and self.current_episode > self.episodes:
            raise ValueError("L'episodio corrente supera il totale")
        return self


class MealIn(BaseModel):
    day: date
    meal_type: str = Field(pattern="^(breakfast|lunch|dinner|snack)$")
    recipe_id: int | None = None
    title: str = Field(default="", max_length=180)
    portions: int = Field(default=1, ge=1, le=100)
    notes: str = Field(default="", max_length=3000)


class MilestoneIn(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    due_date: date | None = None


class TripActivityIn(BaseModel):
    day: date
    title: str = Field(min_length=1, max_length=180)
    kind: str = Field(default="activity", max_length=30)
    starts_at: str = Field(default="", pattern="^(?:([01]\\d|2[0-3]):[0-5]\\d)?$")
    location: str = Field(default="", max_length=180)
    url: str = Field(default="", max_length=500)
    notes: str = Field(default="", max_length=3000)


class TripChecklistIn(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    category: str = Field(default="preparation", pattern="^(documents|luggage|booking|transport|preparation|other)$")


class InterestIn(BaseModel):
    kind: str = Field(pattern="^(experience|hobby|music_project)$")
    title: str = Field(min_length=1, max_length=180)
    category: str = Field(default="", max_length=60)
    status: str = Field(default="planned", pattern="^(planned|wishlist|in_progress|completed|paused|dropped)$")
    target_date: date | None = None
    rating: float | None = Field(default=None, ge=0, le=10)
    hours: float = Field(default=0, ge=0)
    url: str = Field(default="", max_length=500)
    details: str = Field(default="", max_length=10000)


class NotificationSettingIn(BaseModel):
    enabled: bool


def days_value(days: list[int]) -> str:
    if any(day < 0 or day > 6 for day in days):
        raise HTTPException(422, "I giorni devono essere compresi tra 0 e 6")
    return ",".join(map(str, sorted(set(days))))


def task_out(row: PersonalTask):
    return {"id":row.id,"title":row.title,"description":row.description,"category":row.category,
        "due_date":row.due_date.isoformat() if row.due_date else None,"priority":row.priority,
        "important":row.important,"urgent":row.urgent,"status":row.status,
        "estimated_minutes":row.estimated_minutes,"created_at":row.created_at.isoformat()}


def log_task_completion(db:Session,row:PersonalTask):
    db.add(TaskCompletion(task_id=row.id,title=row.title,estimated_minutes=row.estimated_minutes))


@router.get("/tasks")
def list_tasks(day: date | None = None, status: str | None = None, db: Session = Depends(get_db)):
    query=select(PersonalTask).order_by(PersonalTask.due_date,PersonalTask.id)
    if day is not None: query=query.where(PersonalTask.due_date==day)
    if status: query=query.where(PersonalTask.status==status)
    return [task_out(row) for row in db.scalars(query)]


@router.post("/tasks",status_code=201)
def create_task(data:TaskCreateIn,db:Session=Depends(get_db)):
    values=data.model_dump(exclude={"recurrence_frequency","recurrence_interval","recurrence_end_date"})
    if data.recurrence_frequency and values["due_date"] is None:values["due_date"]=date.today()
    row=PersonalTask(**values);db.add(row);db.flush()
    if row.status=="done":log_task_completion(db,row)
    if data.recurrence_frequency:
        base=row.due_date or date.today();next_date=advance_recurrence(base,data.recurrence_frequency,data.recurrence_interval)
        if data.recurrence_end_date and data.recurrence_end_date<next_date:raise HTTPException(422,"La fine deve essere successiva alla prossima occorrenza")
        recurrence=TaskRecurrence(template_task_id=row.id,frequency=data.recurrence_frequency,interval=data.recurrence_interval,anchor_day=base.day,next_date=next_date,end_date=data.recurrence_end_date)
        db.add(recurrence);db.flush();generate_recurrence_rows(db,recurrence,date.today().fromordinal(date.today().toordinal()+90))
    db.commit();db.refresh(row);return task_out(row)


@router.put("/tasks/{task_id}")
def update_task(task_id:int,data:TaskIn,db:Session=Depends(get_db)):
    row=db.get(PersonalTask,task_id)
    if not row:raise HTTPException(404,"Attività non trovata")
    newly_completed=row.status!="done" and data.status=="done"
    for key,value in data.model_dump().items():setattr(row,key,value)
    if newly_completed:log_task_completion(db,row)
    db.commit();return task_out(row)


@router.delete("/tasks/{task_id}",status_code=204)
def delete_task(task_id:int,db:Session=Depends(get_db)):
    row=db.get(PersonalTask,task_id)
    if not row:raise HTTPException(404,"Attività non trovata")
    recurrence=db.scalar(select(TaskRecurrence).where(TaskRecurrence.template_task_id==task_id))
    if recurrence:
        db.query(TaskOccurrence).filter(TaskOccurrence.recurrence_id==recurrence.id).delete(synchronize_session=False)
        db.delete(recurrence)
    db.query(TaskOccurrence).filter(TaskOccurrence.task_id==task_id).delete(synchronize_session=False)
    db.query(TaskSubtask).filter(TaskSubtask.task_id==task_id).delete(synchronize_session=False)
    db.query(TaskCompletion).filter(TaskCompletion.task_id==task_id).update({TaskCompletion.task_id:None},synchronize_session=False)
    db.delete(row);db.commit()


def advance_recurrence(day:date,frequency:str,interval:int,anchor_day:int|None=None)->date:
    if frequency=="daily":return date.fromordinal(day.toordinal()+interval)
    if frequency=="weekly":return date.fromordinal(day.toordinal()+7*interval)
    month_index=day.year*12+day.month-1+interval
    year,month=divmod(month_index,12);month+=1
    return date(year,month,min(anchor_day or day.day,monthrange(year,month)[1]))


def recurrence_out(row:TaskRecurrence):
    return {"id":row.id,"template_task_id":row.template_task_id,"frequency":row.frequency,"interval":row.interval,"anchor_day":row.anchor_day,"next_date":row.next_date.isoformat(),"end_date":row.end_date.isoformat() if row.end_date else None,"active":row.active}


def generate_recurrence_rows(db:Session,recurrence:TaskRecurrence,through:date)->int:
    template=db.get(PersonalTask,recurrence.template_task_id)
    if not template:raise HTTPException(409,"Attività modello non disponibile")
    created=0
    while recurrence.next_date<=through and (recurrence.end_date is None or recurrence.next_date<=recurrence.end_date):
        occurrence_day=recurrence.next_date
        existing=db.scalar(select(TaskOccurrence.id).where(TaskOccurrence.recurrence_id==recurrence.id,TaskOccurrence.scheduled_date==occurrence_day))
        if not existing:
            occurrence=PersonalTask(title=template.title,description=template.description,category=template.category,due_date=occurrence_day,
                priority=template.priority,important=template.important,urgent=template.urgent,status="todo",estimated_minutes=template.estimated_minutes)
            db.add(occurrence);db.flush();db.add(TaskOccurrence(recurrence_id=recurrence.id,task_id=occurrence.id,scheduled_date=occurrence_day));created+=1
        recurrence.next_date=advance_recurrence(occurrence_day,recurrence.frequency,recurrence.interval,recurrence.anchor_day)
    return created


@router.get("/recurrences")
def list_task_recurrences(db:Session=Depends(get_db)):
    return [recurrence_out(row) for row in db.scalars(select(TaskRecurrence).order_by(TaskRecurrence.id.desc()))]


@router.post("/tasks/{task_id}/recurrence",status_code=201)
def create_task_recurrence(task_id:int,data:TaskRecurrenceIn,db:Session=Depends(get_db)):
    task=db.get(PersonalTask,task_id)
    if not task:raise HTTPException(404,"Attività non trovata")
    if db.scalar(select(TaskRecurrence.id).where(TaskRecurrence.template_task_id==task_id)):
        raise HTTPException(409,"Questa attività ha già una regola di ricorrenza")
    base=task.due_date or date.today();next_date=advance_recurrence(base,data.frequency,data.interval)
    if data.end_date and data.end_date<next_date:raise HTTPException(422,"La fine deve essere successiva alla prossima occorrenza")
    row=TaskRecurrence(template_task_id=task_id,frequency=data.frequency,interval=data.interval,anchor_day=base.day,next_date=next_date,end_date=data.end_date)
    db.add(row);db.commit();db.refresh(row);return recurrence_out(row)


@router.post("/recurrences/{recurrence_id}/generate")
def generate_task_occurrences(recurrence_id:int,through:date,db:Session=Depends(get_db)):
    recurrence=db.get(TaskRecurrence,recurrence_id)
    if not recurrence:raise HTTPException(404,"Ricorrenza non trovata")
    if not recurrence.active:raise HTTPException(409,"Ricorrenza disattivata")
    if through<recurrence.next_date:return {"recurrence_id":recurrence.id,"created":0,"next_date":recurrence.next_date.isoformat(),"end_date":recurrence.end_date.isoformat() if recurrence.end_date else None}
    if (through-recurrence.next_date).days>366:raise HTTPException(422,"Intervallo di generazione non valido (massimo 367 giorni)")
    created=generate_recurrence_rows(db,recurrence,through)
    db.commit()
    return {"recurrence_id":recurrence.id,"created":created,"next_date":recurrence.next_date.isoformat(),"end_date":recurrence.end_date.isoformat() if recurrence.end_date else None}


@router.post("/recurrences/{recurrence_id}/toggle")
def toggle_task_recurrence(recurrence_id:int,db:Session=Depends(get_db)):
    row=db.get(TaskRecurrence,recurrence_id)
    if not row:raise HTTPException(404,"Ricorrenza non trovata")
    row.active=not row.active;db.commit();return recurrence_out(row)


@router.get("/tasks/{task_id}/subtasks")
def list_subtasks(task_id:int,db:Session=Depends(get_db)):
    if not db.get(PersonalTask,task_id):raise HTTPException(404,"Attività non trovata")
    return [{"id":x.id,"task_id":x.task_id,"title":x.title,"position":x.position,"completed":x.completed} for x in db.scalars(select(TaskSubtask).where(TaskSubtask.task_id==task_id).order_by(TaskSubtask.position,TaskSubtask.id))]


@router.post("/tasks/{task_id}/subtasks",status_code=201)
def create_subtask(task_id:int,data:RoutineStepIn,db:Session=Depends(get_db)):
    if not db.get(PersonalTask,task_id):raise HTTPException(404,"Attività non trovata")
    position=len(db.scalars(select(TaskSubtask.id).where(TaskSubtask.task_id==task_id)).all())
    row=TaskSubtask(task_id=task_id,title=data.title,position=position);db.add(row);db.commit();db.refresh(row)
    return {"id":row.id,"task_id":row.task_id,"title":row.title,"position":row.position,"completed":row.completed}


@router.post("/subtasks/{subtask_id}/toggle")
def toggle_subtask(subtask_id:int,db:Session=Depends(get_db)):
    row=db.get(TaskSubtask,subtask_id)
    if not row:raise HTTPException(404,"Sottoattività non trovata")
    row.completed=not row.completed;db.commit();return {"id":row.id,"completed":row.completed}


@router.delete("/subtasks/{subtask_id}",status_code=204)
def delete_subtask(subtask_id:int,db:Session=Depends(get_db)):
    row=db.get(TaskSubtask,subtask_id)
    if not row:raise HTTPException(404,"Sottoattività non trovata")
    db.delete(row);db.commit()


@router.get("/goals")
def list_goals(db:Session=Depends(get_db)):
    result=[]
    for g in db.scalars(select(PersonalGoal).order_by(PersonalGoal.id.desc())):
        progress=None
        if g.goal_type in {"numeric","frequency"} and g.target_value:
            progress=min(100,round(g.current_value/g.target_value*100))
        elif g.goal_type=="completion":progress=100 if g.current_value>=1 else 0
        elif g.goal_type=="milestone":
            milestones=db.scalars(select(GoalMilestone).where(GoalMilestone.goal_id==g.id)).all()
            progress=round(sum(m.completed for m in milestones)/len(milestones)*100) if milestones else None
        result.append({"id":g.id,"title":g.title,"description":g.description,"category":g.category,"goal_type":g.goal_type,
            "target_value":g.target_value,"current_value":g.current_value,"unit":g.unit,"due_date":g.due_date.isoformat() if g.due_date else None,
            "motivation":g.motivation,"active":g.active,"progress":progress})
    return result


@router.post("/goals/{goal_id}/complete")
def complete_goal(goal_id:int,db:Session=Depends(get_db)):
    row=db.get(PersonalGoal,goal_id)
    if not row:raise HTTPException(404,"Obiettivo non trovato")
    if row.goal_type!="completion":raise HTTPException(422,"Solo un obiettivo di completamento può essere chiuso direttamente")
    row.current_value=0 if row.current_value>=1 else 1
    row.active=row.current_value<1
    db.commit()
    return next(g for g in list_goals(db) if g["id"]==row.id)


@router.post("/goals",status_code=201)
def create_goal(data:GoalIn,db:Session=Depends(get_db)):
    row=PersonalGoal(**data.model_dump());db.add(row);db.commit();db.refresh(row);return next(g for g in list_goals(db) if g["id"]==row.id)


@router.put("/goals/{goal_id}")
def update_goal(goal_id:int,data:GoalIn,db:Session=Depends(get_db)):
    row=db.get(PersonalGoal,goal_id)
    if not row:raise HTTPException(404,"Obiettivo non trovato")
    for key,value in data.model_dump().items():setattr(row,key,value)
    db.commit();return next(g for g in list_goals(db) if g["id"]==row.id)


@router.delete("/goals/{goal_id}",status_code=204)
def delete_goal(goal_id:int,db:Session=Depends(get_db)):
    row=db.get(PersonalGoal,goal_id)
    if not row:raise HTTPException(404,"Obiettivo non trovato")
    db.query(GoalMilestone).filter(GoalMilestone.goal_id==goal_id).delete(synchronize_session=False)
    db.delete(row);db.commit()


def habit_out(db:Session,row:Habit):
    today=date.today();scheduled=today>=row.start_date and today.weekday() in {int(x) for x in row.days.split(",") if x}
    log=db.scalar(select(HabitLog).where(HabitLog.habit_id==row.id,HabitLog.day==today))
    streak=0;cursor=today
    if scheduled and not (log and log.completed):cursor=cursor.fromordinal(cursor.toordinal()-1)
    while cursor>=row.start_date:
        if cursor.weekday() not in {int(x) for x in row.days.split(",") if x}:cursor=cursor.fromordinal(cursor.toordinal()-1);continue
        done=db.scalar(select(HabitLog.id).where(HabitLog.habit_id==row.id,HabitLog.day==cursor,HabitLog.completed.is_(True)))
        if not done:break
        streak+=1;cursor=cursor.fromordinal(cursor.toordinal()-1)
    return {"id":row.id,"name":row.name,"description":row.description,"category":row.category,"kind":row.kind,
        "days":[int(x) for x in row.days.split(",") if x],"target_value":row.target_value,"unit":row.unit,
        "start_date":row.start_date.isoformat(),"active":row.active,"scheduled_today":scheduled,
        "today_value":log.value if log else 0,"today_completed":log.completed if log else False,"streak":streak}


@router.get("/habits")
def list_habits(db:Session=Depends(get_db)):
    return [habit_out(db,row) for row in db.scalars(select(Habit).where(Habit.active.is_(True)).order_by(Habit.id))]


@router.post("/habits",status_code=201)
def create_habit(data:HabitIn,db:Session=Depends(get_db)):
    row=Habit(**{**data.model_dump(exclude={"days"}),"days":days_value(data.days)});db.add(row);db.commit();db.refresh(row);return habit_out(db,row)


@router.put("/habits/{habit_id}")
def update_habit(habit_id:int,data:HabitIn,db:Session=Depends(get_db)):
    row=db.get(Habit,habit_id)
    if not row:raise HTTPException(404,"Abitudine non trovata")
    for key,value in data.model_dump(exclude={"days"}).items():setattr(row,key,value)
    row.days=days_value(data.days);db.commit();return habit_out(db,row)


@router.post("/habits/{habit_id}/log")
def log_habit(habit_id:int,data:HabitLogIn,day:date|None=None,db:Session=Depends(get_db)):
    habit=db.get(Habit,habit_id)
    if not habit:raise HTTPException(404,"Abitudine non trovata")
    log_day=day or date.today()
    if log_day<habit.start_date or log_day.weekday() not in {int(x) for x in habit.days.split(",") if x}:raise HTTPException(422,"Abitudine non prevista in questo giorno")
    row=db.scalar(select(HabitLog).where(HabitLog.habit_id==habit_id,HabitLog.day==log_day))
    if not row:row=HabitLog(habit_id=habit_id,day=log_day);db.add(row)
    achieved=data.completed
    if habit.kind in {"numeric","duration"}:achieved=achieved and data.value>=habit.target_value
    elif habit.kind=="negative":achieved=achieved and data.value<=habit.target_value
    row.value=data.value;row.completed=achieved;row.note=data.note;db.commit();return habit_out(db,habit)


@router.get("/habits/{habit_id}/history")
def habit_history(habit_id:int,db:Session=Depends(get_db)):
    if not db.get(Habit,habit_id):raise HTTPException(404,"Abitudine non trovata")
    return [{"day":r.day.isoformat(),"value":r.value,"completed":r.completed,"note":r.note}
        for r in db.scalars(select(HabitLog).where(HabitLog.habit_id==habit_id).order_by(HabitLog.day.desc()).limit(366))]


@router.delete("/habits/{habit_id}",status_code=204)
def delete_habit(habit_id:int,db:Session=Depends(get_db)):
    row=db.get(Habit,habit_id)
    if not row:raise HTTPException(404,"Abitudine non trovata")
    row.active=False;db.commit()


@router.get("/routines")
def list_routines(db:Session=Depends(get_db)):
    result=[]
    today=date.today()
    for routine in db.scalars(select(Routine).where(Routine.active.is_(True)).order_by(Routine.id)):
        steps=db.scalars(select(RoutineStep).where(RoutineStep.routine_id==routine.id).order_by(RoutineStep.position)).all()
        log=db.scalar(select(RoutineLog).where(RoutineLog.routine_id==routine.id,RoutineLog.day==today))
        result.append({"id":routine.id,"name":routine.name,"kind":routine.kind,"days":[int(x) for x in routine.days.split(",") if x],
            "completed_steps":[int(x) for x in (log.completed_steps.split(",") if log and log.completed_steps else [])],
            "steps":[{"id":s.id,"title":s.title,"position":s.position,"duration_minutes":s.duration_minutes} for s in steps]})
    return result


@router.post("/routines",status_code=201)
def create_routine(data:RoutineIn,db:Session=Depends(get_db)):
    row=Routine(name=data.name,kind=data.kind,days=days_value(data.days));db.add(row);db.commit();db.refresh(row)
    return {"id":row.id,"name":row.name,"kind":row.kind,"days":data.days,"steps":[]}


@router.post("/routines/{routine_id}/steps",status_code=201)
def add_routine_step(routine_id:int,data:RoutineStepIn,db:Session=Depends(get_db)):
    if not db.get(Routine,routine_id):raise HTTPException(404,"Routine non trovata")
    count=len(db.scalars(select(RoutineStep.id).where(RoutineStep.routine_id==routine_id)).all())
    row=RoutineStep(routine_id=routine_id,title=data.title,position=count,duration_minutes=data.duration_minutes);db.add(row);db.commit();db.refresh(row)
    return {"id":row.id,"title":row.title,"position":row.position,"duration_minutes":row.duration_minutes}


@router.post("/routines/{routine_id}/complete")
def complete_routine_step(routine_id:int,step_id:int,db:Session=Depends(get_db)):
    if not db.get(Routine,routine_id):raise HTTPException(404,"Routine non trovata")
    if not db.scalar(select(RoutineStep.id).where(RoutineStep.id==step_id,RoutineStep.routine_id==routine_id)):
        raise HTTPException(404,"Passo non trovato in questa routine")
    today=date.today();row=db.scalar(select(RoutineLog).where(RoutineLog.routine_id==routine_id,RoutineLog.day==today))
    if not row:row=RoutineLog(routine_id=routine_id,day=today);db.add(row);db.flush()
    completed={int(x) for x in row.completed_steps.split(",") if x}
    if step_id in completed:completed.remove(step_id)
    else:completed.add(step_id)
    row.completed_steps=",".join(map(str,sorted(completed)));db.commit()
    total=len(db.scalars(select(RoutineStep.id).where(RoutineStep.routine_id==routine_id)).all())
    return {"routine_id":routine_id,"day":today.isoformat(),"completed_steps":sorted(completed),"total_steps":total,"progress":round(len(completed)/total*100) if total else 0}


@router.get("/workouts")
def workouts(db:Session=Depends(get_db)):
    return [{"id":r.id,"name":r.name,"sport":r.sport,"day":r.day.isoformat(),"duration_minutes":r.duration_minutes,"place":r.place,"description":r.description,"intensity":r.intensity,"notes":r.notes,"completed":r.completed} for r in db.scalars(select(Workout).order_by(Workout.day.desc()))]


@router.post("/workouts",status_code=201)
def create_workout(data:WorkoutIn,db:Session=Depends(get_db)):
    row=Workout(**data.model_dump());db.add(row);db.commit();db.refresh(row);return {"id":row.id,**data.model_dump(),"completed":row.completed}


@router.post("/workouts/{workout_id}/complete")
def complete_workout(workout_id:int,db:Session=Depends(get_db)):
    row=db.get(Workout,workout_id)
    if not row:raise HTTPException(404,"Allenamento non trovato")
    row.completed=not row.completed;db.commit();return {"id":row.id,"completed":row.completed}


@router.delete("/workouts/{workout_id}",status_code=204)
def delete_workout(workout_id:int,db:Session=Depends(get_db)):
    row=db.get(Workout,workout_id)
    if not row:raise HTTPException(404,"Allenamento non trovato")
    db.query(WorkoutExercise).filter(WorkoutExercise.workout_id==workout_id).delete(synchronize_session=False)
    db.delete(row);db.commit()


@router.get("/workouts/{workout_id}/exercises")
def workout_exercises(workout_id:int,db:Session=Depends(get_db)):
    if not db.get(Workout,workout_id):raise HTTPException(404,"Allenamento non trovato")
    return [{"id":x.id,"name":x.name,"muscle_group":x.muscle_group,"sets":x.sets,"notes":x.notes} for x in db.scalars(select(WorkoutExercise).where(WorkoutExercise.workout_id==workout_id).order_by(WorkoutExercise.id))]


@router.post("/workouts/{workout_id}/exercises",status_code=201)
def add_workout_exercise(workout_id:int,data:WorkoutExerciseIn,db:Session=Depends(get_db)):
    if not db.get(Workout,workout_id):raise HTTPException(404,"Allenamento non trovato")
    row=WorkoutExercise(workout_id=workout_id,**data.model_dump());db.add(row);db.commit();db.refresh(row)
    return {"id":row.id,**data.model_dump()}


@router.delete("/workout-exercises/{exercise_id}",status_code=204)
def delete_workout_exercise(exercise_id:int,db:Session=Depends(get_db)):
    row=db.get(WorkoutExercise,exercise_id)
    if not row:raise HTTPException(404,"Esercizio non trovato")
    db.delete(row);db.commit()


@router.get("/recipes")
def recipes(q:str="",db:Session=Depends(get_db)):
    rows=db.scalars(select(Recipe).order_by(Recipe.name)).all()
    if q:rows=[r for r in rows if q.lower() in (r.name+r.category+r.instructions+" ".join(r.tags)).lower()]
    return [{"id":r.id,"name":r.name,"category":r.category,"ingredients":r.ingredients,"instructions":r.instructions,"portions":r.portions,"prep_minutes":r.prep_minutes,"cook_minutes":r.cook_minutes,"difficulty":r.difficulty,"tags":r.tags,"favorite":r.favorite} for r in rows]


@router.post("/recipes",status_code=201)
def create_recipe(data:RecipeIn,db:Session=Depends(get_db)):
    row=Recipe(**data.model_dump());db.add(row);db.commit();db.refresh(row);return next(r for r in recipes(db=db) if r["id"]==row.id)


@router.put("/recipes/{recipe_id}")
def update_recipe(recipe_id:int,data:RecipeIn,db:Session=Depends(get_db)):
    row=db.get(Recipe,recipe_id)
    if not row:raise HTTPException(404,"Ricetta non trovata")
    for key,value in data.model_dump().items():setattr(row,key,value)
    db.commit();return next(r for r in recipes(db=db) if r["id"]==row.id)


@router.delete("/recipes/{recipe_id}",status_code=204)
def delete_recipe(recipe_id:int,db:Session=Depends(get_db)):
    row=db.get(Recipe,recipe_id)
    if not row:raise HTTPException(404,"Ricetta non trovata")
    db.query(MealPlan).filter(MealPlan.recipe_id==recipe_id).update({MealPlan.recipe_id:None},synchronize_session=False)
    db.delete(row);db.commit()


def recipe_missing(recipe:Recipe,db:Session):
    pantry=db.scalars(select(PantryItem)).all();stock={}
    for item in pantry:
        key=(item.name.strip().casefold(),item.unit.strip().casefold())
        stock[key]=stock.get(key,0)+item.quantity
    missing=[]
    for ingredient in recipe.ingredients:
        name=str(ingredient.get("name","")).strip();quantity=float(ingredient.get("quantity",0) or 0);unit=str(ingredient.get("unit","")).strip()
        key=(name.casefold(),unit.casefold())
        if name and quantity>stock.get(key,0):missing.append({**ingredient,"missing_quantity":quantity-stock.get(key,0)})
    return missing


@router.get("/recipes/{recipe_id}/shopping-preview")
def recipe_shopping_preview(recipe_id:int,db:Session=Depends(get_db)):
    recipe=db.get(Recipe,recipe_id)
    if not recipe:raise HTTPException(404,"Ricetta non trovata")
    return {"recipe_id":recipe_id,"missing":recipe_missing(recipe,db)}


@router.post("/recipes/{recipe_id}/shopping-list",status_code=201)
def add_recipe_missing_to_shopping(recipe_id:int,db:Session=Depends(get_db)):
    recipe=db.get(Recipe,recipe_id)
    if not recipe:raise HTTPException(404,"Ricetta non trovata")
    missing=recipe_missing(recipe,db)
    for ingredient in missing:db.add(ShoppingItem(name=ingredient["name"],quantity=ingredient["missing_quantity"],unit=ingredient.get("unit", ""),category="food"))
    db.commit();return {"added":len(missing),"items":[{"name":i["name"],"quantity":i["missing_quantity"]} for i in missing]}


@router.get("/shopping")
def shopping(db:Session=Depends(get_db)):
    return [{"id":r.id,"name":r.name,"quantity":r.quantity,"unit":r.unit,"category":r.category,"expected_price":r.expected_price,"purchased":r.purchased,"notes":r.notes} for r in db.scalars(select(ShoppingItem).order_by(ShoppingItem.purchased,ShoppingItem.category,ShoppingItem.name))]


@router.post("/shopping",status_code=201)
def add_shopping(data:ShoppingIn,db:Session=Depends(get_db)):
    row=ShoppingItem(**data.model_dump());db.add(row);db.commit();db.refresh(row);return {"id":row.id,**data.model_dump(),"purchased":row.purchased}


@router.post("/shopping/{item_id}/toggle")
def toggle_shopping(item_id:int,db:Session=Depends(get_db)):
    row=db.get(ShoppingItem,item_id)
    if not row:raise HTTPException(404,"Elemento non trovato")
    row.purchased=not row.purchased;db.commit();return {"id":row.id,"purchased":row.purchased}


@router.put("/shopping/{item_id}")
def update_shopping(item_id:int,data:ShoppingUpdate,db:Session=Depends(get_db)):
    row=db.get(ShoppingItem,item_id)
    if not row:raise HTTPException(404,"Elemento non trovato")
    for key,value in data.model_dump().items():setattr(row,key,value)
    db.commit();return {"id":row.id,**data.model_dump()}


@router.delete("/shopping/{item_id}",status_code=204)
def delete_shopping(item_id:int,db:Session=Depends(get_db)):
    row=db.get(ShoppingItem,item_id)
    if not row:raise HTTPException(404,"Elemento non trovato")
    db.delete(row);db.commit()


@router.get("/pantry")
def pantry(db:Session=Depends(get_db)):
    return [{"id":r.id,"name":r.name,"quantity":r.quantity,"unit":r.unit,"category":r.category,"expiry":r.expiry.isoformat() if r.expiry else None,"location":r.location} for r in db.scalars(select(PantryItem).order_by(PantryItem.expiry,PantryItem.name))]


@router.post("/pantry",status_code=201)
def add_pantry(data:PantryIn,db:Session=Depends(get_db)):
    row=PantryItem(**data.model_dump());db.add(row);db.commit();db.refresh(row);return {"id":row.id,**data.model_dump()}


@router.put("/pantry/{item_id}")
def update_pantry(item_id:int,data:PantryIn,db:Session=Depends(get_db)):
    row=db.get(PantryItem,item_id)
    if not row:raise HTTPException(404,"Prodotto non trovato")
    for key,value in data.model_dump().items():setattr(row,key,value)
    db.commit();return {"id":row.id,**data.model_dump()}


@router.delete("/pantry/{item_id}",status_code=204)
def delete_pantry(item_id:int,db:Session=Depends(get_db)):
    row=db.get(PantryItem,item_id)
    if not row:raise HTTPException(404,"Prodotto non trovato")
    db.delete(row);db.commit()


@router.get("/trips")
def trips(db:Session=Depends(get_db)):
    return [{"id":t.id,"name":t.name,"destination":t.destination,"country":t.country,"start_date":t.start_date.isoformat(),"end_date":t.end_date.isoformat(),"description":t.description,"companions":t.companions,"budget":t.budget,"status":t.status,"notes":t.notes} for t in db.scalars(select(Trip).order_by(Trip.start_date))]


@router.post("/trips",status_code=201)
def create_trip(data:TripIn,db:Session=Depends(get_db)):
    if data.end_date<data.start_date:raise HTTPException(422,"La data di ritorno precede la partenza")
    row=Trip(**data.model_dump());db.add(row);db.commit();db.refresh(row);return {"id":row.id,**data.model_dump()}


@router.delete("/trips/{trip_id}",status_code=204)
def delete_trip(trip_id:int,db:Session=Depends(get_db)):
    row=db.get(Trip,trip_id)
    if not row:raise HTTPException(404,"Viaggio non trovato")
    db.query(TripActivity).filter(TripActivity.trip_id==trip_id).delete(synchronize_session=False)
    db.query(TripChecklistItem).filter(TripChecklistItem.trip_id==trip_id).delete(synchronize_session=False)
    db.delete(row);db.commit()


@router.get("/trips/{trip_id}/checklist")
def trip_checklist(trip_id:int,db:Session=Depends(get_db)):
    if not db.get(Trip,trip_id):raise HTTPException(404,"Viaggio non trovato")
    return [{"id":x.id,"title":x.title,"category":x.category,"checked":x.checked} for x in db.scalars(select(TripChecklistItem).where(TripChecklistItem.trip_id==trip_id).order_by(TripChecklistItem.category,TripChecklistItem.id))]


@router.post("/trips/{trip_id}/checklist",status_code=201)
def add_trip_checklist_item(trip_id:int,data:TripChecklistIn,db:Session=Depends(get_db)):
    if not db.get(Trip,trip_id):raise HTTPException(404,"Viaggio non trovato")
    row=TripChecklistItem(trip_id=trip_id,**data.model_dump());db.add(row);db.commit();db.refresh(row)
    return {"id":row.id,"title":row.title,"category":row.category,"checked":row.checked}


@router.post("/trip-checklist/{item_id}/toggle")
def toggle_trip_checklist(item_id:int,db:Session=Depends(get_db)):
    row=db.get(TripChecklistItem,item_id)
    if not row:raise HTTPException(404,"Elemento checklist non trovato")
    row.checked=not row.checked;db.commit();return {"id":row.id,"checked":row.checked}


@router.delete("/trip-checklist/{item_id}",status_code=204)
def delete_trip_checklist_item(item_id:int,db:Session=Depends(get_db)):
    row=db.get(TripChecklistItem,item_id)
    if not row:raise HTTPException(404,"Elemento checklist non trovato")
    db.delete(row);db.commit()


@router.get("/events")
def events(db:Session=Depends(get_db)):
    return [{"id":e.id,"title":e.title,"category":e.category,"starts_at":e.starts_at.isoformat(),"ends_at":e.ends_at.isoformat() if e.ends_at else None,"location":e.location,"description":e.description} for e in db.scalars(select(PersonalEvent).order_by(PersonalEvent.starts_at))]


@router.post("/events",status_code=201)
def create_event(data:EventIn,db:Session=Depends(get_db)):
    if data.ends_at and data.ends_at<data.starts_at:raise HTTPException(422,"La fine evento precede l'inizio")
    row=PersonalEvent(**data.model_dump());db.add(row);db.commit();db.refresh(row);return {"id":row.id,**{**data.model_dump(),"starts_at":row.starts_at.isoformat(),"ends_at":row.ends_at.isoformat() if row.ends_at else None}}


@router.put("/events/{event_id}")
def update_event(event_id:int,data:EventIn,db:Session=Depends(get_db)):
    row=db.get(PersonalEvent,event_id)
    if not row:raise HTTPException(404,"Evento non trovato")
    if data.ends_at and data.ends_at<data.starts_at:raise HTTPException(422,"La fine evento precede l'inizio")
    for key,value in data.model_dump().items():setattr(row,key,value)
    db.commit();return {"id":row.id,**{**data.model_dump(),"starts_at":row.starts_at.isoformat(),"ends_at":row.ends_at.isoformat() if row.ends_at else None}}


@router.delete("/events/{event_id}",status_code=204)
def delete_event(event_id:int,db:Session=Depends(get_db)):
    row=db.get(PersonalEvent,event_id)
    if not row:raise HTTPException(404,"Evento non trovato")
    db.delete(row);db.commit()


@router.get("/media")
def media(media_type:str|None=None,db:Session=Depends(get_db)):
    query=select(MediaItem).order_by(MediaItem.media_type,MediaItem.status,MediaItem.title)
    if media_type:query=query.where(MediaItem.media_type==media_type)
    rows=list(db.scalars(query))
    details={d.media_id:d for d in db.scalars(select(MediaDetails).where(MediaDetails.media_id.in_([m.id for m in rows])))} if rows else {}
    return [{"id":m.id,"media_type":m.media_type,"title":m.title,"status":m.status,"genre":m.genre,"progress":m.progress,"total":m.total,"rating":m.rating,"notes":m.notes,**media_detail_values(details.get(m.id))} for m in rows]


def media_detail_values(details:MediaDetails|None):
    return {"description":details.description if details else "","cover_url":details.cover_url if details else "","year":details.year if details else None,"platform":details.platform if details else "","author":details.author if details else "","page_count":details.page_count if details else None,"seasons":details.seasons if details else None,"episodes":details.episodes if details else None,"current_season":details.current_season if details else 0,"current_episode":details.current_episode if details else 0,"hours_played":details.hours_played if details else 0}


def save_media_details(db:Session,media_id:int,data:MediaIn):
    details=db.scalar(select(MediaDetails).where(MediaDetails.media_id==media_id))
    values={key:getattr(data,key) for key in ("description","cover_url","year","platform","author","page_count","seasons","episodes","current_season","current_episode","hours_played")}
    if details is None:
        details=MediaDetails(media_id=media_id,**values);db.add(details)
    else:
        for key,value in values.items():setattr(details,key,value)


@router.post("/media",status_code=201)
def create_media(data:MediaIn,db:Session=Depends(get_db)):
    values=data.model_dump();base={key:values[key] for key in ("media_type","title","status","genre","progress","total","rating","notes")}
    row=MediaItem(**base);db.add(row);db.flush();save_media_details(db,row.id,data);db.commit();db.refresh(row);return {"id":row.id,**base,**media_detail_values(db.scalar(select(MediaDetails).where(MediaDetails.media_id==row.id)))}


@router.put("/media/{media_id}")
def update_media(media_id:int,data:MediaIn,db:Session=Depends(get_db)):
    row=db.get(MediaItem,media_id)
    if not row:raise HTTPException(404,"Elemento non trovato")
    values=data.model_dump();base={key:values[key] for key in ("media_type","title","status","genre","progress","total","rating","notes")}
    for key,value in base.items():setattr(row,key,value)
    save_media_details(db,row.id,data);db.commit();return {"id":row.id,**base,**media_detail_values(db.scalar(select(MediaDetails).where(MediaDetails.media_id==row.id)))}


@router.delete("/media/{media_id}",status_code=204)
def delete_media(media_id:int,db:Session=Depends(get_db)):
    row=db.get(MediaItem,media_id)
    if not row:raise HTTPException(404,"Elemento non trovato")
    details=db.scalar(select(MediaDetails).where(MediaDetails.media_id==media_id))
    if details:db.delete(details)
    db.delete(row);db.commit()


@router.get("/meals")
def list_meals(start:date|None=None,end:date|None=None,db:Session=Depends(get_db)):
    query=select(MealPlan).order_by(MealPlan.day,MealPlan.meal_type)
    if start:query=query.where(MealPlan.day>=start)
    if end:query=query.where(MealPlan.day<=end)
    return [{"id":m.id,"day":m.day.isoformat(),"meal_type":m.meal_type,"recipe_id":m.recipe_id,"title":m.title,"portions":m.portions,"notes":m.notes,"consumed":m.consumed} for m in db.scalars(query)]


@router.post("/meals",status_code=201)
def create_meal(data:MealIn,db:Session=Depends(get_db)):
    if data.recipe_id and not db.get(Recipe,data.recipe_id):raise HTTPException(404,"Ricetta non trovata")
    row=MealPlan(**data.model_dump());db.add(row);db.commit();db.refresh(row)
    return {"id":row.id,**data.model_dump(),"consumed":False}


@router.put("/meals/{meal_id}")
def update_meal(meal_id:int,data:MealIn,db:Session=Depends(get_db)):
    row=db.get(MealPlan,meal_id)
    if not row:raise HTTPException(404,"Pasto non trovato")
    if data.recipe_id and not db.get(Recipe,data.recipe_id):raise HTTPException(404,"Ricetta non trovata")
    for key,value in data.model_dump().items():setattr(row,key,value)
    db.commit();return {"id":row.id,**data.model_dump(),"consumed":row.consumed}


@router.post("/meals/{meal_id}/consume")
def consume_meal(meal_id:int,db:Session=Depends(get_db)):
    row=db.get(MealPlan,meal_id)
    if not row:raise HTTPException(404,"Pasto non trovato")
    row.consumed=not row.consumed;db.commit();return {"id":row.id,"consumed":row.consumed}


@router.delete("/meals/{meal_id}",status_code=204)
def delete_meal(meal_id:int,db:Session=Depends(get_db)):
    row=db.get(MealPlan,meal_id)
    if not row:raise HTTPException(404,"Pasto non trovato")
    db.delete(row);db.commit()


@router.get("/goals/{goal_id}/milestones")
def list_milestones(goal_id:int,db:Session=Depends(get_db)):
    if not db.get(PersonalGoal,goal_id):raise HTTPException(404,"Obiettivo non trovato")
    return [{"id":m.id,"title":m.title,"due_date":m.due_date.isoformat() if m.due_date else None,"completed":m.completed} for m in db.scalars(select(GoalMilestone).where(GoalMilestone.goal_id==goal_id).order_by(GoalMilestone.due_date,GoalMilestone.id))]


@router.post("/goals/{goal_id}/milestones",status_code=201)
def create_milestone(goal_id:int,data:MilestoneIn,db:Session=Depends(get_db)):
    if not db.get(PersonalGoal,goal_id):raise HTTPException(404,"Obiettivo non trovato")
    row=GoalMilestone(goal_id=goal_id,**data.model_dump());db.add(row);db.commit();db.refresh(row)
    return {"id":row.id,"title":row.title,"due_date":row.due_date.isoformat() if row.due_date else None,"completed":row.completed}


@router.post("/milestones/{milestone_id}/toggle")
def toggle_milestone(milestone_id:int,db:Session=Depends(get_db)):
    row=db.get(GoalMilestone,milestone_id)
    if not row:raise HTTPException(404,"Milestone non trovata")
    row.completed=not row.completed;db.commit();return {"id":row.id,"completed":row.completed}


@router.delete("/milestones/{milestone_id}",status_code=204)
def delete_milestone(milestone_id:int,db:Session=Depends(get_db)):
    row=db.get(GoalMilestone,milestone_id)
    if not row:raise HTTPException(404,"Milestone non trovata")
    db.delete(row);db.commit()


@router.get("/trips/{trip_id}/itinerary")
def trip_itinerary(trip_id:int,db:Session=Depends(get_db)):
    trip=db.get(Trip,trip_id)
    if not trip:raise HTTPException(404,"Viaggio non trovato")
    return [{"id":a.id,"day":a.day.isoformat(),"title":a.title,"kind":a.kind,"starts_at":a.starts_at,"location":a.location,"url":a.url,"notes":a.notes} for a in db.scalars(select(TripActivity).where(TripActivity.trip_id==trip_id).order_by(TripActivity.day,TripActivity.starts_at))]


@router.post("/trips/{trip_id}/itinerary",status_code=201)
def add_trip_activity(trip_id:int,data:TripActivityIn,db:Session=Depends(get_db)):
    trip=db.get(Trip,trip_id)
    if not trip:raise HTTPException(404,"Viaggio non trovato")
    if data.day<trip.start_date or data.day>trip.end_date:raise HTTPException(422,"La giornata deve ricadere nel periodo del viaggio")
    row=TripActivity(trip_id=trip_id,**data.model_dump());db.add(row);db.commit();db.refresh(row)
    return {"id":row.id,**data.model_dump()}


@router.delete("/itinerary/{activity_id}",status_code=204)
def delete_trip_activity(activity_id:int,db:Session=Depends(get_db)):
    row=db.get(TripActivity,activity_id)
    if not row:raise HTTPException(404,"Attività itinerario non trovata")
    db.delete(row);db.commit()


@router.get("/interests")
def list_interests(kind:str|None=None,db:Session=Depends(get_db)):
    query=select(PersonalInterest).order_by(PersonalInterest.target_date,PersonalInterest.title)
    if kind:query=query.where(PersonalInterest.kind==kind)
    return [{"id":x.id,"kind":x.kind,"title":x.title,"category":x.category,"status":x.status,"target_date":x.target_date.isoformat() if x.target_date else None,"rating":x.rating,"hours":x.hours,"url":x.url,"details":x.details} for x in db.scalars(query)]


@router.post("/interests",status_code=201)
def create_interest(data:InterestIn,db:Session=Depends(get_db)):
    row=PersonalInterest(**data.model_dump());db.add(row);db.commit();db.refresh(row);return {"id":row.id,**data.model_dump()}


@router.put("/interests/{interest_id}")
def update_interest(interest_id:int,data:InterestIn,db:Session=Depends(get_db)):
    row=db.get(PersonalInterest,interest_id)
    if not row:raise HTTPException(404,"Elemento non trovato")
    for key,value in data.model_dump().items():setattr(row,key,value)
    db.commit();return {"id":row.id,**data.model_dump()}


@router.delete("/interests/{interest_id}",status_code=204)
def delete_interest(interest_id:int,db:Session=Depends(get_db)):
    row=db.get(PersonalInterest,interest_id)
    if not row:raise HTTPException(404,"Elemento non trovato")
    db.delete(row);db.commit()


@router.get("/calendar")
def calendar(start:date,end:date,db:Session=Depends(get_db)):
    if end<start or (end-start).days>366:raise HTTPException(422,"Intervallo calendario non valido (massimo 367 giorni)")
    items=[]
    for t in db.scalars(select(PersonalTask).where(PersonalTask.due_date>=start,PersonalTask.due_date<=end)):
        items.append({"kind":"task","id":t.id,"date":t.due_date.isoformat(),"title":t.title,"status":t.status,"category":t.category})
    for e in db.scalars(select(PersonalEvent)):
        if start<=e.starts_at.date()<=end:items.append({"kind":"event","id":e.id,"date":e.starts_at.date().isoformat(),"title":e.title,"status":"planned","category":e.category})
    for w in db.scalars(select(Workout).where(Workout.day>=start,Workout.day<=end)):
        items.append({"kind":"workout","id":w.id,"date":w.day.isoformat(),"title":w.name,"status":"completed" if w.completed else "planned","category":w.sport})
    for t in db.scalars(select(Trip).where(Trip.start_date<=end,Trip.end_date>=start)):
        items.append({"kind":"trip","id":t.id,"date":max(start,t.start_date).isoformat(),"title":t.name,"status":t.status,"category":t.destination,"end_date":t.end_date.isoformat()})
    return sorted(items,key=lambda x:(x["date"],x["title"].casefold()))


@router.get("/analytics")
def analytics(start:date|None=None,end:date|None=None,db:Session=Depends(get_db)):
    start=start or date(date.today().year,date.today().month,1);end=end or date.today()
    if end<start or (end-start).days>366:raise HTTPException(422,"Intervallo analytics non valido (massimo 367 giorni)")
    tasks=list(db.scalars(select(PersonalTask)))
    habits=list(db.scalars(select(Habit).where(Habit.active.is_(True))))
    workouts=list(db.scalars(select(Workout).where(Workout.day>=start,Workout.day<=end)))
    media=list(db.scalars(select(MediaItem)))
    goals=list(db.scalars(select(PersonalGoal).where(PersonalGoal.active.is_(True))))
    logs=list(db.scalars(select(HabitLog).where(HabitLog.day>=start,HabitLog.day<=end,HabitLog.completed.is_(True))))
    completions=list(db.scalars(select(TaskCompletion).where(TaskCompletion.completed_on>=start,TaskCompletion.completed_on<=end)))
    due=[t for t in tasks if t.due_date and start<=t.due_date<=end]
    scheduled=sum(1 for h in habits for ordinal in range(start.toordinal(),end.toordinal()+1) if date.fromordinal(ordinal).weekday() in {int(x) for x in h.days.split(",") if x} and date.fromordinal(ordinal)>=h.start_date)
    daily=[]
    for ordinal in range(start.toordinal(),end.toordinal()+1):
        day=date.fromordinal(ordinal)
        daily.append({"day":day.isoformat(),"tasks_completed":sum(c.completed_on==day for c in completions),"workout_minutes":sum(w.duration_minutes for w in workouts if w.day==day and w.completed),"habit_completions":sum(log.day==day for log in logs)})
    return {"period":{"start":start.isoformat(),"end":end.isoformat()},"tasks":{"completed":len(completions),"due":len(due),"overdue":sum(1 for t in tasks if t.due_date and t.due_date<date.today() and t.status not in {"done","cancelled"}),"estimated_minutes_completed":sum(c.estimated_minutes for c in completions)},"habits":{"scheduled":scheduled,"completed_logs":len(logs),"active":len(habits)},"fitness":{"sessions":len(workouts),"completed":sum(w.completed for w in workouts),"minutes":sum(w.duration_minutes for w in workouts if w.completed),"sports":sorted({w.sport for w in workouts})},"goals":{"active":len(goals),"measurable":sum(1 for g in goals if g.goal_type in {"numeric","frequency"} and g.target_value is not None)},"entertainment":{"completed":sum(m.status=="completed" for m in media),"in_progress":sum(m.status=="in_progress" for m in media),"tracked":len(media)},"daily":daily}


@router.get("/insights")
def insights(db:Session=Depends(get_db)):
    today=date.today();tasks=list(db.scalars(select(PersonalTask).where(PersonalTask.status.in_(["todo","in_progress","waiting"]))))
    overdue=[t for t in tasks if t.due_date and t.due_date<today]
    due_today=[t for t in tasks if t.due_date==today]
    habits=[h for h in db.scalars(select(Habit).where(Habit.active.is_(True))) if today.weekday() in {int(x) for x in h.days.split(",") if x}]
    missing=[h.name for h in habits if not db.scalar(select(HabitLog.id).where(HabitLog.habit_id==h.id,HabitLog.day==today,HabitLog.completed.is_(True)))]
    return {"generated_at":datetime.now(timezone.utc).isoformat(),"source":"dati locali NEXUS","suggestions":[*([{"type":"overdue","text":f"Hai {len(overdue)} attività in ritardo.","count":len(overdue)}] if overdue else []),*([{"type":"today","text":f"Hai {len(due_today)} attività in scadenza oggi.","count":len(due_today)}] if due_today else []),*([{"type":"habit","text":f"Abitudini previste ancora da registrare: {', '.join(missing)}.","count":len(missing)}] if missing else [])]}


@router.get("/notifications/settings")
def notification_settings(db:Session=Depends(get_db)):
    keys=["habit_reminders","routine_reminders","task_deadlines","workouts","events","goals"]
    values={x.key:x.enabled for x in db.scalars(select(NotificationSetting))}
    return [{"key":key,"enabled":values.get(key,True)} for key in keys]


@router.get("/notifications")
def life_notifications(db:Session=Depends(get_db)):
    today=date.today();limit=date.fromordinal(today.toordinal()+7)
    settings={x.key:x.enabled for x in db.scalars(select(NotificationSetting))};items=[]
    def add(key:str,kind:str,row_id:int,title:str,due:str,detail:str):
        if settings.get(key,True):items.append({"key":key,"kind":kind,"id":row_id,"title":title,"due":due,"detail":detail})
    for task in db.scalars(select(PersonalTask).where(PersonalTask.due_date<=today,PersonalTask.status.not_in(["done","cancelled"]))):
        add("task_deadlines","task",task.id,task.title,task.due_date.isoformat(),"Scadenza oggi o superata")
    for event in db.scalars(select(PersonalEvent)):
        if today<=event.starts_at.date()<=limit:add("events","event",event.id,event.title,event.starts_at.isoformat(),event.location)
    for workout in db.scalars(select(Workout).where(Workout.day>=today,Workout.day<=limit,Workout.completed.is_(False))):
        add("workouts","workout",workout.id,workout.name,workout.day.isoformat(),workout.sport)
    for habit in db.scalars(select(Habit).where(Habit.active.is_(True))):
        if today>=habit.start_date and today.weekday() in {int(x) for x in habit.days.split(",") if x}:
            done=db.scalar(select(HabitLog.id).where(HabitLog.habit_id==habit.id,HabitLog.day==today,HabitLog.completed.is_(True)))
            if not done:add("habit_reminders","habit",habit.id,habit.name,today.isoformat(),"Abitudine programmata oggi")
    for routine in db.scalars(select(Routine).where(Routine.active.is_(True))):
        if today.weekday() in {int(x) for x in routine.days.split(",") if x}:
            log=db.scalar(select(RoutineLog.id).where(RoutineLog.routine_id==routine.id,RoutineLog.day==today))
            if not log:add("routine_reminders","routine",routine.id,routine.name,today.isoformat(),"Routine prevista oggi")
    for goal in db.scalars(select(PersonalGoal).where(PersonalGoal.active.is_(True),PersonalGoal.due_date>=today,PersonalGoal.due_date<=limit)):
        add("goals","goal",goal.id,goal.title,goal.due_date.isoformat(),"Obiettivo in scadenza")
    return sorted(items,key=lambda x:(x["due"],x["kind"],x["title"].casefold()))


@router.put("/notifications/settings/{key}")
def update_notification_setting(key:str,data:NotificationSettingIn,db:Session=Depends(get_db)):
    if key not in {"habit_reminders","routine_reminders","task_deadlines","workouts","events","goals"}:raise HTTPException(404,"Impostazione non trovata")
    row=db.scalar(select(NotificationSetting).where(NotificationSetting.key==key))
    if row is None:row=NotificationSetting(key=key,enabled=data.enabled);db.add(row)
    else:row.enabled=data.enabled
    db.commit();return {"key":key,"enabled":row.enabled}


@router.get("/export.json")
def export_life_data(db:Session=Depends(get_db)):
    collections={"tasks":PersonalTask,"task_completions":TaskCompletion,"task_subtasks":TaskSubtask,"task_recurrences":TaskRecurrence,"task_occurrences":TaskOccurrence,"goals":PersonalGoal,"goals_milestones":GoalMilestone,"habits":Habit,"habit_logs":HabitLog,"routines":Routine,"routine_steps":RoutineStep,"workouts":Workout,"workout_exercises":WorkoutExercise,"recipes":Recipe,"shopping":ShoppingItem,"pantry":PantryItem,"trips":Trip,"trip_activities":TripActivity,"trip_checklist":TripChecklistItem,"events":PersonalEvent,"media":MediaItem,"media_details":MediaDetails,"meals":MealPlan,"interests":PersonalInterest,"notification_settings":NotificationSetting}
    def value(v):
        if isinstance(v,(date,datetime)):return v.isoformat()
        return v
    data={name:[{column.name:value(getattr(row,column.name)) for column in model.__table__.columns} for row in db.scalars(select(model))] for name,model in collections.items()}
    return {"schema_version":1,"exported_at":datetime.now(timezone.utc).isoformat(),"data":data}

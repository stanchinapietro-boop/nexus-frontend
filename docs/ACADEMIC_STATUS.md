# Academic OS implementation status

This document tracks shipped behavior in the local Academic module. A section is listed as implemented only when its UI calls persistent backend endpoints.

## Available now

- Courses: create, edit, delete, color, teacher, and linked pending-task count.
- Tasks: persistent types, dates, course, description, priority, importance, urgency, status, estimate, notes, CRUD, filtering, and completion.
- Subtasks: persistent create, toggle, list, and delete operations.
- Recurring tasks: daily, weekly, or monthly interval templates. Due occurrences are materialized when the task list is requested; generated tasks are stored once and the template advances its next date.
- Views: Overview, My Day, Timeline, Agenda, Eisenhower matrix, task board, courses, weekly timetable, gradebook, and study timer.
- Timetable: weekday slots, course, time, room, CRUD, and overlap validation.
- Grades: weighted and arithmetic averages, course/date/type, school year, period, provisional/final status, notes, edit/delete, search and filters, and an arithmetic what-if simulator.
- Study tracker: persistent sessions, course association, pause/resume/complete/stop, history and per-course/date statistics.
- Exams: distinct persisted entity, preparation state/topics, real task links, and one linked grade per exam. The exam UI supports planning, preparation state, task linking, and grade entry.
- Analytics: real grade trends/distribution, course averages, task completion/overdue counts, and weekly study totals.
- Academic goals: persistent per-course or overall average targets with current progress and reached state.
- Grade CSV export: server-generated export with optional period and school-year filters.
- Academic notes: CRUD, course association, tags, search, and external links for Obsidian or other resources.
- Flashcards: CRUD, due-card review, persistent SM-2 ease/interval/repetition scheduling, and quality scoring.

## Known gaps

- Exams use a distinct entity and real relations; calendar integration and full edit controls remain to be added.
- Study timer duration is tracked persistently; configured Pomodoro duration is currently a preference/display value and does not yet orchestrate break cycles.
- Timetable does not yet support teacher/lesson notes, current-lesson highlighting, exceptions, or editing from its UI.
- Grade goals, basic graphs, analytics and CSV export are implemented; period date configuration, PDF export, and grade-method preferences by course are not implemented.
- File uploads/PDF storage, Analytics UI, AI Tutor, notifications, and real external integrations are not implemented.
- Flashcards have review and create/delete UI; card editing and import/deck management remain outstanding.
- Database tables are created with SQLAlchemy `create_all`; versioned migrations are not yet configured.

## Verification

Run backend tests from `apps/api` with `.venv/Scripts/python -m pytest -q`, and frontend production build from `apps/web` with `npm run build`.

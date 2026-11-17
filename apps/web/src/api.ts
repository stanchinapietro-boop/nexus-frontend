const BASE = import.meta.env.VITE_API_BASE ?? "/api";

export type Note = { id: number; title: string; content: string; created_at: string };

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`Errore ${res.status}`);
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  health: () => req<{ status: string; version: string }>("/health"),
  listNotes: () => req<Note[]>("/notes"),
  createNote: (title: string, content: string) =>
    req<Note>("/notes", { method: "POST", body: JSON.stringify({ title, content }) }),
  deleteNote: (id: number) => req<void>(`/notes/${id}`, { method: "DELETE" }),
};

export type Course = { id: number; name: string; teacher: string; color: string; task_count: number };
export type StudyTask = { id: number; title: string; kind: "homework" | "exam" | "study" | "review" | "oral" | "project" | "research" | "submission" | "other"; due_date: string | null; course_id: number | null; course_name: string; done: boolean; description: string; important: boolean; urgent: boolean; priority: "low" | "normal" | "high"; status: "todo" | "in_progress" | "waiting" | "done" | "cancelled"; estimated_minutes: number; notes: string; subtasks_total: number; subtasks_done: number };
export const academic = {
  courses: () => req<Course[]>("/academic/courses"),
  addCourse: (data: { name: string; teacher: string; color: string }) => req<Course>("/academic/courses", { method: "POST", body: JSON.stringify(data) }),
  updateCourse: (id: number, data: { name: string; teacher: string; color: string }) => req<Course>(`/academic/courses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCourse: (id: number) => req<void>(`/academic/courses/${id}`, { method: "DELETE" }),
  tasks: () => req<StudyTask[]>("/academic/tasks"),
  addTask: (data: { title: string; kind: string; due_date: string | null; course_id: number | null; description?: string; important?: boolean; urgent?: boolean; priority?: string; status?: string; estimated_minutes?: number; notes?: string }) => req<StudyTask>("/academic/tasks", { method: "POST", body: JSON.stringify(data) }),
  updateTask: (id: number, data: { title: string; kind: string; due_date: string | null; course_id: number | null; description?: string; important?: boolean; urgent?: boolean; priority?: string; status?: string; estimated_minutes?: number; notes?: string }) => req<StudyTask>(`/academic/tasks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  toggleTask: (id: number) => req<StudyTask>(`/academic/tasks/${id}/toggle`, { method: "POST" }),
  deleteTask: (id: number) => req<void>(`/academic/tasks/${id}`, { method: "DELETE" }),
  recurrences: () => req<TaskRecurrence[]>("/academic/recurrences"),
  addRecurrence: (data: {title:string;course_id:number|null;kind:string;frequency:string;interval:number;start_date:string}) => req<TaskRecurrence>("/academic/recurrences",{method:"POST",body:JSON.stringify(data)}),
  toggleRecurrence: (id:number) => req<TaskRecurrence>(`/academic/recurrences/${id}/toggle`,{method:"POST"}),
  deleteRecurrence: (id:number) => req<void>(`/academic/recurrences/${id}`,{method:"DELETE"}),
  subtasks: (id: number) => req<Subtask[]>(`/academic/tasks/${id}/subtasks`),
  addSubtask: (id: number, title: string) => req<Subtask>(`/academic/tasks/${id}/subtasks`, { method: "POST", body: JSON.stringify({title}) }),
  toggleSubtask: (id: number) => req<Subtask>(`/academic/subtasks/${id}/toggle`, { method: "POST" }),
  deleteSubtask: (id: number) => req<void>(`/academic/subtasks/${id}`, { method: "DELETE" }),
  lessons: () => req<Lesson[]>("/academic/lessons"),
  addLesson: (data: Omit<Lesson, "id" | "course_name" | "course_color">) => req<Lesson>("/academic/lessons", { method: "POST", body: JSON.stringify(data) }),
  deleteLesson: (id: number) => req<void>(`/academic/lessons/${id}`, { method: "DELETE" }),
  grades: (filters: { course_id?: number; period?: string; school_year?: string; kind?: string; status?: string } = {}) => { const params = new URLSearchParams(); Object.entries(filters).forEach(([k,v])=>{if(v!==undefined&&v!=="")params.set(k,String(v));}); return req<Grade[]>(`/academic/grades${params.size?`?${params}`:""}`); },
  addGrade: (data: Omit<Grade, "id" | "course_name" | "course_color">) => req<Grade>("/academic/grades", { method: "POST", body: JSON.stringify(data) }),
  updateGrade: (id: number, data: Omit<Grade, "id" | "course_name" | "course_color">) => req<Grade>(`/academic/grades/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteGrade: (id: number) => req<void>(`/academic/grades/${id}`, { method: "DELETE" }),
  gradeSummary: () => req<GradeSummary[]>("/academic/grade-summary"),
  studySessions: () => req<StudySession[]>("/academic/study-sessions"),
  startStudy: (data: { course_id: number | null; task_id: number | null; notes: string }) => req<StudySession>("/academic/study-sessions", { method: "POST", body: JSON.stringify(data) }),
  controlStudy: (id: number, action: "pause" | "resume" | "stop" | "complete") => req<StudySession>(`/academic/study-sessions/${id}/${action}`, { method: "POST" }),
  studyStats: () => req<StudyStats>("/academic/study-stats"),
  exams: () => req<AcademicExam[]>("/academic/exams"),
  addExam: (data: Omit<AcademicExam,"id"|"course_name"|"course_color"|"task_ids"|"grade_id"|"grade_value">) => req<AcademicExam>("/academic/exams",{method:"POST",body:JSON.stringify(data)}),
  updateExam: (id:number,data: Omit<AcademicExam,"id"|"course_name"|"course_color"|"task_ids"|"grade_id"|"grade_value">) => req<AcademicExam>(`/academic/exams/${id}`,{method:"PUT",body:JSON.stringify(data)}),
  linkExamTask: (examId:number,taskId:number) => req<AcademicExam>(`/academic/exams/${examId}/tasks/${taskId}`,{method:"POST"}),
  unlinkExamTask: (examId:number,taskId:number) => req<void>(`/academic/exams/${examId}/tasks/${taskId}`,{method:"DELETE"}),
  examGrade: (id:number,data: Omit<Grade,"id"|"course_name"|"course_color">) => req<AcademicExam>(`/academic/exams/${id}/grade`,{method:"POST",body:JSON.stringify(data)}),
  deleteExam: (id:number) => req<void>(`/academic/exams/${id}`,{method:"DELETE"}),
  analytics: () => req<AcademicAnalytics>("/academic/analytics"),
  goals: () => req<AcademicGoal[]>("/academic/goals"),
  addGoal: (data:{course_id:number|null;target_average:number;period:string;school_year:string;label:string}) => req<AcademicGoal>("/academic/goals",{method:"POST",body:JSON.stringify(data)}),
  deleteGoal: (id:number) => req<void>(`/academic/goals/${id}`,{method:"DELETE"}),
  gradeExportUrl: (period:string,year:string) => `${BASE}/academic/grades/export.csv${period||year?`?${new URLSearchParams({...(period?{period}:{}),...(year?{school_year:year}:{})})}`:""}`,
  academicNotes: (q="") => req<AcademicNote[]>(`/academic/notes${q?`?q=${encodeURIComponent(q)}`:""}`),
  addAcademicNote: (data:{course_id:number|null;title:string;content:string;external_url:string;tags:string}) => req<AcademicNote>("/academic/notes",{method:"POST",body:JSON.stringify(data)}),
  updateAcademicNote: (id:number,data:{course_id:number|null;title:string;content:string;external_url:string;tags:string}) => req<AcademicNote>(`/academic/notes/${id}`,{method:"PUT",body:JSON.stringify(data)}),
  deleteAcademicNote: (id:number) => req<void>(`/academic/notes/${id}`,{method:"DELETE"}),
  flashcards: (dueOnly=false) => req<Flashcard[]>(`/academic/flashcards${dueOnly?"?due_only=true":""}`),
  addFlashcard: (data:{course_id:number|null;question:string;answer:string;topic:string;tags:string}) => req<Flashcard>("/academic/flashcards",{method:"POST",body:JSON.stringify(data)}),
  reviewFlashcard: (id:number,quality:number) => req<Flashcard>(`/academic/flashcards/${id}/review`,{method:"POST",body:JSON.stringify({quality})}),
  deleteFlashcard: (id:number) => req<void>(`/academic/flashcards/${id}`,{method:"DELETE"}),
};

export type Lesson = { id: number; course_id: number; course_name: string; course_color: string; weekday: number; start_time: string; end_time: string; room: string };
export type Subtask = { id: number; task_id: number; title: string; done: boolean };
export type TaskRecurrence = {id:number;title:string;course_id:number|null;kind:string;frequency:string;interval:number;next_date:string;active:boolean};
export type StudySession = { id: number; course_id: number | null; course_name: string; task_id: number | null; started_at: string; ended_at: string | null; elapsed_seconds: number; state: string; notes: string };
export type StudyStats = { today_seconds: number; week_seconds: number; month_seconds: number; sessions_count: number; by_course: Record<string, number>; daily: Record<string, number> };
export type AcademicExam = {id:number;course_id:number;course_name:string;course_color:string;title:string;exam_date:string;kind:string;topics:string;description:string;difficulty:number;priority:string;prep_status:string;notes:string;task_ids:number[];grade_id:number|null;grade_value:number|null};
export type AcademicGoal = {id:number;course_id:number|null;course_name:string;target_average:number;current_average:number|null;period:string;school_year:string;label:string;reached:boolean};
export type AcademicAnalytics = {grades_by_month:{month:string;average:number;count:number}[];grade_distribution:{range:string;count:number}[];course_averages:GradeSummary[];course_trends:{course:string;change:number;direction:string;sample_size:number}[];tasks:{total:number;completed:number;pending:number;overdue:number};study_week_seconds:number};
export type AcademicNote = {id:number;course_id:number|null;course_name:string;title:string;content:string;external_url:string;tags:string;updated_at:string};
export type Flashcard = {id:number;course_id:number|null;course_name:string;question:string;answer:string;topic:string;tags:string;ease_factor:number;interval_days:number;repetitions:number;due_date:string;last_reviewed:string|null};

export type LifeTask = {id:number;title:string;description:string;category:string;due_date:string|null;priority:string;important:boolean;urgent:boolean;status:"todo"|"in_progress"|"waiting"|"done"|"cancelled";estimated_minutes:number;created_at:string};
export type LifeSubtask={id:number;task_id:number;title:string;position:number;completed:boolean};
export type LifeTaskRecurrence={id:number;template_task_id:number;frequency:string;interval:number;anchor_day:number;next_date:string;end_date:string|null;active:boolean};
export type LifeGoal = {id:number;title:string;description:string;category:string;goal_type:string;target_value:number|null;current_value:number;unit:string;due_date:string|null;motivation:string;active:boolean;progress:number|null};
export type LifeMilestone={id:number;title:string;due_date:string|null;completed:boolean};
export type LifeHabit = {id:number;name:string;description:string;category:string;kind:string;days:number[];target_value:number;unit:string;start_date:string;active:boolean;scheduled_today:boolean;today_value:number;today_completed:boolean;streak:number};
export type LifeRoutineStep = {id:number;title:string;position:number;duration_minutes:number};
export type LifeRoutine = {id:number;name:string;kind:string;days:number[];completed_steps:number[];steps:LifeRoutineStep[]};
export const lifeApi = {
  tasks:()=>req<LifeTask[]>("/life/tasks"), addTask:(data:Partial<LifeTask>&{title:string})=>req<LifeTask>("/life/tasks",{method:"POST",body:JSON.stringify(data)}),
  updateTask:(id:number,data:Partial<LifeTask>&{title:string})=>req<LifeTask>(`/life/tasks/${id}`,{method:"PUT",body:JSON.stringify(data)}), deleteTask:(id:number)=>req<void>(`/life/tasks/${id}`,{method:"DELETE"}),
  subtasks:(id:number)=>req<LifeSubtask[]>(`/life/tasks/${id}/subtasks`),addSubtask:(id:number,title:string)=>req<LifeSubtask>(`/life/tasks/${id}/subtasks`,{method:"POST",body:JSON.stringify({title})}),toggleSubtask:(id:number)=>req<{id:number;completed:boolean}>(`/life/subtasks/${id}/toggle`,{method:"POST"}),deleteSubtask:(id:number)=>req<void>(`/life/subtasks/${id}`,{method:"DELETE"}),
  recurrences:()=>req<LifeTaskRecurrence[]>("/life/recurrences"),addTaskRecurrence:(taskId:number,frequency:string,interval=1,end_date:string|null=null)=>req<LifeTaskRecurrence>(`/life/tasks/${taskId}/recurrence`,{method:"POST",body:JSON.stringify({frequency,interval,end_date})}),generateTaskOccurrences:(id:number,through:string)=>req<{created:number;next_date:string}>(`/life/recurrences/${id}/generate?through=${through}`,{method:"POST"}),toggleTaskRecurrence:(id:number)=>req<LifeTaskRecurrence>(`/life/recurrences/${id}/toggle`,{method:"POST"}),
  goals:()=>req<LifeGoal[]>("/life/goals"), addGoal:(data:Record<string,unknown>)=>req<LifeGoal>("/life/goals",{method:"POST",body:JSON.stringify(data)}), updateGoal:(id:number,data:Record<string,unknown>)=>req<LifeGoal>(`/life/goals/${id}`,{method:"PUT",body:JSON.stringify(data)}), deleteGoal:(id:number)=>req<void>(`/life/goals/${id}`,{method:"DELETE"}), completeGoal:(id:number)=>req<LifeGoal>(`/life/goals/${id}/complete`,{method:"POST"}), milestones:(id:number)=>req<LifeMilestone[]>(`/life/goals/${id}/milestones`), addMilestone:(id:number,title:string,due_date:string|null)=>req<LifeMilestone>(`/life/goals/${id}/milestones`,{method:"POST",body:JSON.stringify({title,due_date})}), toggleMilestone:(id:number)=>req<{id:number;completed:boolean}>(`/life/milestones/${id}/toggle`,{method:"POST"}), deleteMilestone:(id:number)=>req<void>(`/life/milestones/${id}`,{method:"DELETE"}),
  habits:()=>req<LifeHabit[]>("/life/habits"), addHabit:(data:Record<string,unknown>)=>req<LifeHabit>("/life/habits",{method:"POST",body:JSON.stringify(data)}), logHabit:(id:number,data:{value:number;completed:boolean;note:string})=>req<LifeHabit>(`/life/habits/${id}/log`,{method:"POST",body:JSON.stringify(data)}), deleteHabit:(id:number)=>req<void>(`/life/habits/${id}`,{method:"DELETE"}),
  routines:()=>req<LifeRoutine[]>("/life/routines"), addRoutine:(data:Record<string,unknown>)=>req<LifeRoutine>("/life/routines",{method:"POST",body:JSON.stringify(data)}), addRoutineStep:(id:number,data:{title:string;duration_minutes:number})=>req<LifeRoutineStep>(`/life/routines/${id}/steps`,{method:"POST",body:JSON.stringify(data)}), completeRoutineStep:(id:number,step:number)=>req<{progress:number}>(`/life/routines/${id}/complete?step_id=${step}`,{method:"POST"}),
  workouts:()=>req<LifeWorkout[]>("/life/workouts"), addWorkout:(data:Record<string,unknown>)=>req<LifeWorkout>("/life/workouts",{method:"POST",body:JSON.stringify(data)}), completeWorkout:(id:number)=>req<{id:number;completed:boolean}>(`/life/workouts/${id}/complete`,{method:"POST"}), deleteWorkout:(id:number)=>req<void>(`/life/workouts/${id}`,{method:"DELETE"}), workoutExercises:(id:number)=>req<LifeWorkoutExercise[]>(`/life/workouts/${id}/exercises`), addWorkoutExercise:(id:number,data:Record<string,unknown>)=>req<LifeWorkoutExercise>(`/life/workouts/${id}/exercises`,{method:"POST",body:JSON.stringify(data)}), deleteWorkoutExercise:(id:number)=>req<void>(`/life/workout-exercises/${id}`,{method:"DELETE"}),
  recipes:(q="")=>req<LifeRecipe[]>(`/life/recipes${q?`?q=${encodeURIComponent(q)}`:""}`), addRecipe:(data:Record<string,unknown>)=>req<LifeRecipe>("/life/recipes",{method:"POST",body:JSON.stringify(data)}), deleteRecipe:(id:number)=>req<void>(`/life/recipes/${id}`,{method:"DELETE"}), recipePreview:(id:number)=>req<{missing:{name:string;quantity:number;unit:string;missing_quantity:number}[]}>(`/life/recipes/${id}/shopping-preview`), recipeToShopping:(id:number)=>req<{added:number}>(`/life/recipes/${id}/shopping-list`,{method:"POST"}),
  shopping:()=>req<LifeShoppingItem[]>("/life/shopping"), addShopping:(data:Record<string,unknown>)=>req<LifeShoppingItem>("/life/shopping",{method:"POST",body:JSON.stringify(data)}), toggleShopping:(id:number)=>req<{id:number;purchased:boolean}>(`/life/shopping/${id}/toggle`,{method:"POST"}), updateShopping:(id:number,data:Record<string,unknown>)=>req<LifeShoppingItem>(`/life/shopping/${id}`,{method:"PUT",body:JSON.stringify(data)}),deleteShopping:(id:number)=>req<void>(`/life/shopping/${id}`,{method:"DELETE"}),
  pantry:()=>req<LifePantryItem[]>("/life/pantry"), addPantry:(data:Record<string,unknown>)=>req<LifePantryItem>("/life/pantry",{method:"POST",body:JSON.stringify(data)}), updatePantry:(id:number,data:Record<string,unknown>)=>req<LifePantryItem>(`/life/pantry/${id}`,{method:"PUT",body:JSON.stringify(data)}),deletePantry:(id:number)=>req<void>(`/life/pantry/${id}`,{method:"DELETE"}),
  trips:()=>req<LifeTrip[]>("/life/trips"), addTrip:(data:Record<string,unknown>)=>req<LifeTrip>("/life/trips",{method:"POST",body:JSON.stringify(data)}), deleteTrip:(id:number)=>req<void>(`/life/trips/${id}`,{method:"DELETE"}), itinerary:(id:number)=>req<LifeTripActivity[]>(`/life/trips/${id}/itinerary`), addTripActivity:(id:number,data:Record<string,unknown>)=>req<LifeTripActivity>(`/life/trips/${id}/itinerary`,{method:"POST",body:JSON.stringify(data)}), deleteTripActivity:(id:number)=>req<void>(`/life/itinerary/${id}`,{method:"DELETE"}),tripChecklist:(id:number)=>req<LifeTripChecklist[]>(`/life/trips/${id}/checklist`),addTripChecklist:(id:number,title:string,category:string)=>req<LifeTripChecklist>(`/life/trips/${id}/checklist`,{method:"POST",body:JSON.stringify({title,category})}),toggleTripChecklist:(id:number)=>req<{id:number;checked:boolean}>(`/life/trip-checklist/${id}/toggle`,{method:"POST"}),deleteTripChecklist:(id:number)=>req<void>(`/life/trip-checklist/${id}`,{method:"DELETE"}),
  events:()=>req<LifeEvent[]>("/life/events"), addEvent:(data:Record<string,unknown>)=>req<LifeEvent>("/life/events",{method:"POST",body:JSON.stringify(data)}), updateEvent:(id:number,data:Record<string,unknown>)=>req<LifeEvent>(`/life/events/${id}`,{method:"PUT",body:JSON.stringify(data)}),deleteEvent:(id:number)=>req<void>(`/life/events/${id}`,{method:"DELETE"}),
  media:(type?:string)=>req<LifeMedia[]>(`/life/media${type?`?media_type=${type}`:""}`), addMedia:(data:Record<string,unknown>)=>req<LifeMedia>("/life/media",{method:"POST",body:JSON.stringify(data)}), updateMedia:(id:number,data:Record<string,unknown>)=>req<LifeMedia>(`/life/media/${id}`,{method:"PUT",body:JSON.stringify(data)}), deleteMedia:(id:number)=>req<void>(`/life/media/${id}`,{method:"DELETE"}),
  meals:()=>req<LifeMeal[]>("/life/meals"), addMeal:(data:Record<string,unknown>)=>req<LifeMeal>("/life/meals",{method:"POST",body:JSON.stringify(data)}), consumeMeal:(id:number)=>req<{id:number;consumed:boolean}>(`/life/meals/${id}/consume`,{method:"POST"}), deleteMeal:(id:number)=>req<void>(`/life/meals/${id}`,{method:"DELETE"}),
  interests:(kind?:string)=>req<LifeInterest[]>(`/life/interests${kind?`?kind=${kind}`:""}`), addInterest:(data:Record<string,unknown>)=>req<LifeInterest>("/life/interests",{method:"POST",body:JSON.stringify(data)}), updateInterest:(id:number,data:Record<string,unknown>)=>req<LifeInterest>(`/life/interests/${id}`,{method:"PUT",body:JSON.stringify(data)}), deleteInterest:(id:number)=>req<void>(`/life/interests/${id}`,{method:"DELETE"}),
  calendar:(start:string,end:string)=>req<LifeCalendarItem[]>(`/life/calendar?start=${start}&end=${end}`), analytics:(start?:string,end?:string)=>req<LifeAnalytics>(`/life/analytics${start&&end?`?start=${start}&end=${end}`:""}`), insights:()=>req<{generated_at:string;source:string;suggestions:{type:string;text:string;count:number}[]}>("/life/insights"), exportData:()=>req<Record<string,unknown>>("/life/export.json"),
  notificationSettings:()=>req<{key:string;enabled:boolean}[]>("/life/notifications/settings"), setNotification:(key:string,enabled:boolean)=>req<{key:string;enabled:boolean}>(`/life/notifications/settings/${key}`,{method:"PUT",body:JSON.stringify({enabled})}),
  notifications:()=>req<LifeNotification[]>("/life/notifications"),
};
export type LifeWorkout={id:number;name:string;sport:string;day:string;duration_minutes:number;place:string;description:string;intensity:number|null;notes:string;completed:boolean};
export type LifeWorkoutExercise={id:number;name:string;muscle_group:string;sets:{reps?:number;weight?:number;rest_seconds?:number}[];notes:string};
export type LifeRecipe={id:number;name:string;category:string;ingredients:{name:string;quantity:number;unit:string}[];instructions:string;portions:number;prep_minutes:number;cook_minutes:number;difficulty:string;tags:string[];favorite:boolean};
export type LifeShoppingItem={id:number;name:string;quantity:number;unit:string;category:string;expected_price:number|null;purchased:boolean;notes:string};
export type LifePantryItem={id:number;name:string;quantity:number;unit:string;category:string;expiry:string|null;location:string};
export type LifeTrip={id:number;name:string;destination:string;country:string;start_date:string;end_date:string;description:string;companions:string[];budget:number|null;status:string;notes:string};
export type LifeTripActivity={id:number;day:string;title:string;kind:string;starts_at:string;location:string;url:string;notes:string};
export type LifeTripChecklist={id:number;title:string;category:string;checked:boolean};
export type LifeEvent={id:number;title:string;category:string;starts_at:string;ends_at:string|null;location:string;description:string};
export type LifeMedia={id:number;media_type:string;title:string;status:string;genre:string;progress:number;total:number|null;rating:number|null;notes:string;description:string;cover_url:string;year:number|null;platform:string;author:string;page_count:number|null;seasons:number|null;episodes:number|null;current_season:number;current_episode:number;hours_played:number};
export type LifeMeal={id:number;day:string;meal_type:string;recipe_id:number|null;title:string;portions:number;notes:string;consumed:boolean};
export type LifeInterest={id:number;kind:string;title:string;category:string;status:string;target_date:string|null;rating:number|null;hours:number;url:string;details:string};
export type LifeCalendarItem={kind:string;id:number;date:string;title:string;status:string;category:string;end_date?:string};
export type LifeAnalytics={period:{start:string;end:string};tasks:{completed:number;due:number;overdue:number;estimated_minutes_completed:number};habits:{scheduled:number;completed_logs:number;active:number};fitness:{sessions:number;completed:number;minutes:number;sports:string[]};goals:{active:number;measurable:number};entertainment:{completed:number;in_progress:number;tracked:number};daily:{day:string;tasks_completed:number;workout_minutes:number;habit_completions:number}[]};
export type LifeNotification={key:string;kind:string;id:number;title:string;due:string;detail:string};
export type Grade = { id: number; course_id: number; course_name: string; course_color: string; value: number; weight: number; kind: string; day: string; description: string; period: "first" | "second" | "annual"; school_year: string; status: "provisional" | "final"; note: string };
export type GradeSummary = { course_id: number; course_name: string; color: string; count: number; arithmetic_average: number | null; weighted_average: number | null };

export type Account = { id: number; name: string; kind: string; initial_cents: number; balance_cents: number; tx_count: number };
export type Category = { id: number; name: string; type: "expense" | "income"; color: string };
export type Tx = {
  id: number; type: "expense" | "income"; amount_cents: number; day: string; note: string;
  account_id: number; account_name: string; category_id: number | null; category_name: string; category_color: string;
};
export type Summary = {
  balance_cents: number; income_cents: number; expense_cents: number;
  by_category: { name: string; color: string; cents: number }[]; recent: Tx[]; accounts: Account[];
};
export type NewTx = { type: string; amount_cents: number; day: string; note: string; account_id: number; category_id: number | null };

const j = (b: unknown) => JSON.stringify(b);
export const fin = {
  summary: (month: string) => req<Summary>(`/finance/summary?month=${month}`),
  accounts: () => req<Account[]>("/finance/accounts"),
  addAccount: (name: string, kind: string, initial_cents: number) =>
    req<Account>("/finance/accounts", { method: "POST", body: j({ name, kind, initial_cents }) }),
  delAccount: (id: number) => req<void>(`/finance/accounts/${id}`, { method: "DELETE" }),
  categories: () => req<Category[]>("/finance/categories"),
  addCategory: (name: string, type: string, color: string) =>
    req<Category>("/finance/categories", { method: "POST", body: j({ name, type, color }) }),
  delCategory: (id: number) => req<void>(`/finance/categories/${id}`, { method: "DELETE" }),
  txs: (month: string, q = "") => req<Tx[]>(`/finance/transactions?month=${month}&q=${encodeURIComponent(q)}`),
  addTx: (t: NewTx) => req<Tx>("/finance/transactions", { method: "POST", body: j(t) }),
  delTx: (id: number) => req<void>(`/finance/transactions/${id}`, { method: "DELETE" }),
};

export const eur = (cents: number) =>
  (cents / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
export const toCents = (s: string) => Math.round(parseFloat(s.replace(",", ".")) * 100);
export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export type BudgetRow = { id: number; category_id: number; category_name: string; color: string; limit_cents: number; spent_cents: number };
export type ReportRow = { month: string; income_cents: number; expense_cents: number; net_worth_cents: number };
export const fin2 = {
  budgets: (month: string) => req<BudgetRow[]>(`/finance/budgets?month=${month}`),
  setBudget: (category_id: number, limit_cents: number) =>
    req<{ ok: boolean }>("/finance/budgets", { method: "POST", body: JSON.stringify({ category_id, limit_cents }) }),
  delBudget: (id: number) => req<void>(`/finance/budgets/${id}`, { method: "DELETE" }),
  report: (periods: number) => req<ReportRow[]>(`/finance/report?periods=${periods}`),
};

export type Goal = { id: number; name: string; target_cents: number; saved_cents: number; deadline: string | null };
export type Rec = { id: number; note: string; type: "expense" | "income"; amount_cents: number; freq: string; next_day: string; active: boolean; account_name: string; category_name: string };
export const fin3 = {
  goals: () => req<Goal[]>("/finance/goals"),
  addGoal: (name: string, target_cents: number, deadline: string | null) =>
    req<Goal>("/finance/goals", { method: "POST", body: JSON.stringify({ name, target_cents, deadline }) }),
  goalAdd: (id: number, delta_cents: number) =>
    req<Goal>(`/finance/goals/${id}/add`, { method: "POST", body: JSON.stringify({ delta_cents }) }),
  delGoal: (id: number) => req<void>(`/finance/goals/${id}`, { method: "DELETE" }),
  recurring: () => req<Rec[]>("/finance/recurring"),
  addRec: (r: { note: string; type: string; amount_cents: number; account_id: number; category_id: number | null; freq: string; start: string }) =>
    req<Rec>("/finance/recurring", { method: "POST", body: JSON.stringify(r) }),
  toggleRec: (id: number) => req<Rec>(`/finance/recurring/${id}/toggle`, { method: "POST" }),
  delRec: (id: number) => req<void>(`/finance/recurring/${id}`, { method: "DELETE" }),
};

export const fin4 = {
  updateTx: (id: number, t: NewTx) => req<Tx>(`/finance/transactions/${id}`, { method: "PUT", body: JSON.stringify(t) }),
  updateAccount: (id: number, name: string, kind: string, initial_cents: number) =>
    req<Account>(`/finance/accounts/${id}`, { method: "PUT", body: JSON.stringify({ name, kind, initial_cents }) }),
  updateCategory: (id: number, name: string, type: string, color: string) =>
    req<Category>(`/finance/categories/${id}`, { method: "PUT", body: JSON.stringify({ name, type, color }) }),
  exportAll: () => req<{ transactions: Tx[] } & Record<string, unknown>>("/finance/export"),
};

export type TTStatus = { configured: boolean; connected: boolean };
export type TTTask = { id: string; project_id: string; project_name: string; project_color: string; title: string; priority: number; due_date: string | null; overdue: boolean };
export type TTTasks = { today: string; week_end: string; projects: { id: string; name: string; color: string | null }[]; tasks: TTTask[] };
export const tt = {
  status: () => req<TTStatus>("/ticktick/status"),
  tasks: () => req<TTTasks>("/ticktick/tasks"),
  createTask: (title: string, project_id: string | null, due: string | null, priority: number) =>
    req<{ ok: boolean }>("/ticktick/tasks", { method: "POST", body: JSON.stringify({ title, project_id, due, priority }) }),
  complete: (project_id: string, id: string) =>
    req<{ ok: boolean }>(`/ticktick/tasks/${project_id}/${id}/complete`, { method: "POST" }),
  disconnect: () => req<void>("/ticktick/connection", { method: "DELETE" }),
};

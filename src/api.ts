const BASE = import.meta.env.VITE_API_BASE ?? "/api";

export type Note = { id: number; title: string; content: string; created_at: string };

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (res.status === 401) window.dispatchEvent(new Event("nexus:unauthorized"));
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
export type TTTasks = { today: string; week_end: string; projects: { id: string; name: string }[]; tasks: TTTask[] };
export const tt = {
  status: () => req<TTStatus>("/ticktick/status"),
  tasks: () => req<TTTasks>("/ticktick/tasks"),
  createTask: (title: string, project_id: string | null, due: string | null, priority: number) =>
    req<{ ok: boolean }>("/ticktick/tasks", { method: "POST", body: JSON.stringify({ title, project_id, due, priority }) }),
  complete: (project_id: string, id: string) =>
    req<{ ok: boolean }>(`/ticktick/tasks/${project_id}/${id}/complete`, { method: "POST" }),
  disconnect: () => req<void>("/ticktick/connection", { method: "DELETE" }),
};

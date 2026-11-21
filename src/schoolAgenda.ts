import { academic, type StudyTask, type AcademicExam } from "./api";

export type SchoolEntry = {
  key: string;
  date: string;
  title: string;
  course: string;
  type: string;
  completed: boolean;
  source: "agenda" | "exams";
};

export function localDay(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function inNextWeek(entries: SchoolEntry[], today: Date) {
  const end = new Date(today);
  end.setDate(end.getDate() + 7);
  const from = localDay(today);
  const until = localDay(end);
  return entries.filter(entry => !entry.completed && entry.date >= from && entry.date < until);
}

export async function loadSchoolAgenda(): Promise<SchoolEntry[]> {
  const [tasks, exams] = await Promise.all([academic.tasks(), academic.exams()]);
  return schoolEntries(tasks, exams);
}

export function schoolEntries(tasks: StudyTask[], exams: AcademicExam[]) {
  const entries: SchoolEntry[] = exams.map(exam => ({
    key: "exam-" + exam.id, title: exam.title, course: exam.course_name, date: exam.exam_date,
    type: exam.kind === "oral" ? "Interrogazione" : "Verifica", completed: exam.prep_status === "taken", source: "exams",
  }));
  for (const task of tasks) {
    if (!task.due_date || task.done || task.status === "done" || task.status === "cancelled") continue;
    entries.push({
      key: "task-" + task.id, title: task.title, course: task.course_name, date: task.due_date,
      type: task.kind === "exam" ? "Verifica" : task.kind === "oral" ? "Interrogazione" : "Attività",
      completed: false, source: "agenda",
    });
  }
  return entries.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "it"));
}

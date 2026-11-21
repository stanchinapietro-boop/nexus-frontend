import { req } from "./api";
export const projectStates = { idea: "Idea", planning: "Pianificazione", active: "Attivo", paused: "In pausa", completed: "Completato", archived: "Archiviato" };
export type ProjectFields = { title: string; description: string; status: keyof typeof projectStates; progress: number; milestone: string; target_date: string | null };
export type Project = ProjectFields & { id: number; updated_at: string };
export type EventFields = { title: string; category: string; location: string; description: string; starts_at: string; ends_at: string | null };
export type LifeEvent = EventFields & { id: number };
function crud<T, F>(path: string) {
  return {
    list: () => req<T[]>(path),
    save: (id: number | null, fields: F) => req<T>(id === null ? path : path + "/" + id, {
      method: id === null ? "POST" : "PUT", body: JSON.stringify(fields),
    }),
    remove: (id: number) => req<void>(path + "/" + id, { method: "DELETE" }),
  };
}
export const projects = crud<Project, ProjectFields>("/projects");
export const events = crud<LifeEvent, EventFields>("/life/events");

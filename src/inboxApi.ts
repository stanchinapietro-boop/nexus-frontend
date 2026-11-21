import { req } from "./api";

export const kindLabels = {
  task: "Attività", idea: "Idea", note: "Nota", reminder: "Promemoria",
  event: "Evento", expense: "Spesa", project: "Progetto", other: "Altro",
};
export const statusLabels = {
  new: "Nuovo", processing: "In lavorazione", completed: "Completato", archived: "Archiviato",
};

export type InboxKind = keyof typeof kindLabels;
export type InboxStatus = keyof typeof statusLabels;
export type InboxFields = {
  title: string;
  content: string;
  kind: InboxKind;
  tags: string[];
  due_date: string | null;
  destination: string | null;
};
export type InboxItem = InboxFields & {
  id: number;
  status: InboxStatus;
  source: string;
  created_at: string;
  updated_at: string;
  note_id: number | null;
  project_id: number | null;
  task_id: number | null;
  event_id: number | null;
  converted_at: string | null;
};

const changed = "nexus:inbox-updated";
export function onInboxChange(refresh: () => void) {
  window.addEventListener(changed, refresh);
  return () => window.removeEventListener(changed, refresh);
}

async function write<T>(path: string, method: string, data?: unknown) {
  const value = await req<T>(path, { method, body: data === undefined ? undefined : JSON.stringify(data) });
  window.dispatchEvent(new Event(changed));
  return value;
}

export const inboxApi = {
  list: () => req<InboxItem[]>("/inbox"),
  create: (fields: InboxFields, requestId: string) =>
    write<InboxItem>("/inbox", "POST", { ...fields, source: "quick_capture", request_id: requestId }),
  update: (id: number, fields: Partial<InboxFields & { status: InboxStatus }>) =>
    write<InboxItem>(`/inbox/${id}`, "PUT", fields),
  remove: (id: number) => write<void>(`/inbox/${id}`, "DELETE"),
  convert: (id: number, target: "project" | "task" | "event", starts_at?: string) =>
    write<InboxItem>(`/inbox/${id}/${target}`, "POST", starts_at ? { starts_at } : undefined),
  toNote: (id: number) => write<InboxItem>(`/inbox/${id}/note`, "POST"),
};

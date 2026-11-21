import { useEffect, useState } from "react";
import { getZoneOptions, usePrefs } from "./prefs";
import { req } from "./api";

export const noticeCategories = {
  task: "Attività", event: "Eventi", deadline: "Scadenze", project: "Progetti",
  finance: "Finanze", academic: "Scuola", system: "Sistema", ai: "AI", automation: "Automazioni",
};
export type NoticeCategory = keyof typeof noticeCategories;
export type Notice = {
  id: number; category: NoticeCategory; title: string; message: string; note_id: number | null;
  created_at: string; read_at: string | null;
};

export function notifyChanged() {
  window.dispatchEvent(new Event("nexus:notifications-changed"));
}

export const notifications = {
  list: (params: URLSearchParams) => req<Notice[]>("/notifications?" + params),
  count: () => req<{ count: number }>("/notifications/unread-count"),
  setRead: (id: number, read: boolean) => req<Notice>(`/notifications/${id}/read`, {
    method: "PUT", body: JSON.stringify({ read }),
  }),
  readAll: () => req<void>("/notifications/read-all", { method: "PUT" }),
  remove: (id: number) => req<void>("/notifications/" + id, { method: "DELETE" }),
};

export function useUnreadCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let serial = 0;
    const refresh = async () => {
      if (document.hidden) return;
      const request = ++serial;
      try {
        const result = await notifications.count();
        if (request === serial) setCount(result.count);
      } catch {
        if (request === serial) setCount(null);
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    window.addEventListener("nexus:notifications-changed", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      serial++;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("nexus:notifications-changed", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return count;
}

export function NotificationBadge() {
  const count = useUnreadCount();
  const prefs = usePrefs();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!prefs.quietFrom || !prefs.quietTo) return;
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, [prefs.quietFrom, prefs.quietTo]);
  const time = now.toLocaleTimeString("en-GB", { ...getZoneOptions(prefs), hourCycle: "h23", hour: "2-digit", minute: "2-digit" });
  const start = prefs.quietFrom, end = prefs.quietTo;
  const quiet = start && end && (start <= end ? time >= start && time < end : time >= start || time < end);
  if (!count || !prefs.badges || quiet) return null;
  return <span className="rounded-full bg-accent px-1.5 text-xs font-semibold text-black"
    aria-label={count + " notifiche da leggere"}>{count > 99 ? "99+" : count}</span>;
}

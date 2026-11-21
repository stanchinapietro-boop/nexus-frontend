import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { req } from "../api";
import { onInboxChange } from "../inboxApi";
type Activity = { module: string; id: number; title: string; action: string; timestamp: string; to: string };

export default function ActivityFeed() {
  const [module, setModule] = useState("");
  const [items, setItems] = useState<Activity[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => onInboxChange(() => setAttempt(n => n + 1)), []);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    setItems(null);
    req<Activity[]>("/activity" + (module ? "?module=" + module : ""), { signal: controller.signal })
      .then(rows => { if (!controller.signal.aborted) setItems(rows); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [module, attempt]);
  return <section className="rounded-xl border border-line bg-panel p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Attività recente</h2>
      <select aria-label="Filtra attività per modulo" className="rounded-lg border border-line bg-ink p-2 text-sm" value={module} onChange={e => setModule(e.target.value)}>
        <option value="">Tutti i moduli collegati</option><option value="inbox">Inbox</option><option value="knowledge">Second Brain</option><option value="projects">Projects</option><option value="academic">Academic</option>
      </select></div>
    {error ? <p role="alert">Attività non disponibili. <button className="text-accent" onClick={() => setAttempt(n => n + 1)}>Riprova</button></p>
      : !items ? <p role="status">Caricamento…</p> : !items.length ? <p className="mt-3 text-mute">Nessuna attività registrata.</p>
      : <ul className="mt-3 divide-y divide-line">{items.map(item => <li key={item.module + item.id}><Link to={item.to} className="block break-words py-2 hover:text-accent">
        {item.title}<span className="block text-xs text-mute">{item.action} · {new Date(item.timestamp).toLocaleString("it-IT", {dateStyle:"short", timeStyle:"short"})}</span></Link></li>)}</ul>}
  </section>;
}

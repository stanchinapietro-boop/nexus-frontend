import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { req, tt, type TTTask } from "../api";
import { NAV } from "../nav";

type Hit = { id: number | string; group: string; title: string; detail: string; day: string | null; to: string };
type Matches = { results: Hit[]; unavailable: string[]; per_category: number };
function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("it");
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const term = (params.get("q") ?? "").slice(0, 100);
  const q = term.trim();
  const [response, setResponse] = useState<Matches | null>(null);
  const [error, setError] = useState(false);
  const [tasks, setTasks] = useState<TTTask[]>([]);
  const [tickError, setTickError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setTickError(false);
    tt.status().then(async status => status.connected ? (await tt.tasks()).tasks : []).then(rows => {
      if (active) setTasks(rows);
    }).catch(() => { if (active) { setTasks([]); setTickError(true); } });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => {
    setResponse(null);
    setError(false);
    if (q.length < 2) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      req<Matches>("/search?q=" + encodeURIComponent(q), { signal: controller.signal })
        .then(data => { if (!controller.signal.aborted) setResponse(data); })
        .catch(() => { if (!controller.signal.aborted) setError(true); });
    }, 180);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [q, attempt]);
  const words = normalize(q).split(/\s+/);
  const matches = (value: string) => words.every(word => normalize(value).includes(word));
  const modules: Hit[] = NAV.filter(item => item.path !== "/search" && matches(item.label)).map(item => ({
    id: item.path, title: item.label, group: "Moduli", day: null, detail: item.ready ? "" : "In programma", to: item.path,
  }));
  const tick: Hit[] = q.length < 2 ? [] : tasks.filter(t => matches(t.title + " " + t.project_name)).slice(0, 8).map(t => ({
    id: t.project_id + "-" + t.id, title: t.title, group: "TickTick", detail: t.project_name, day: t.due_date, to: "/tasks",
  }));
  const groups = new Map<string, Hit[]>();
  for (const hit of [...modules, ...(response?.results ?? []), ...tick]) {
    const group = groups.get(hit.group) ?? [];
    group.push(hit);
    groups.set(hit.group, group);
  }
  const failed = [...(response?.unavailable ?? []), ...(tickError ? ["TickTick"] : []), ...(error ? ["archivio NEXUS"] : [])];
  return <section className="mx-auto max-w-3xl space-y-4"><h1 className="text-3xl font-semibold">Cerca in NEXUS</h1>
    <label className="block">Cerca tra i moduli e i tuoi dati<input autoFocus type="search" maxLength={100} value={term}
      onChange={e => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })} className="mt-2 w-full rounded-lg border border-line bg-panel p-3"/></label>
    {q.length < 2 && <p className="text-sm text-mute">Digita almeno due caratteri per cercare nei tuoi dati.</p>}
    {q.length >= 2 && !response && !error && <p role="status">Ricerca…</p>}
    {failed.length > 0 && <p role="alert">Ricerca parziale. Fonti non disponibili: {failed.join(", ")}. <button className="text-accent" onClick={() => setAttempt(n => n + 1)}>Riprova</button></p>}
    {Array.from(groups, ([name, hits]) => <section key={name} className="rounded-xl border border-line bg-panel p-4"><h2 className="font-semibold">{name}</h2>
      <ul className="divide-y divide-line">{hits.map(hit => <li key={hit.id}><Link className="block break-words py-3 hover:text-accent" to={hit.to}>
        {hit.title}<span className="block text-sm text-mute">{[hit.day, hit.detail].filter(Boolean).join(" · ")}</span></Link></li>)}</ul></section>)}
    {response && !groups.size && !failed.length && <p>Nessun risultato per questa ricerca.</p>}
  </section>;
}

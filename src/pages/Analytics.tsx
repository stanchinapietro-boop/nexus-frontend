import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, GraduationCap, Activity, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { req } from "../api";
import { displayDay, usePrefs } from "../prefs";
import { btn, field } from "../planner";

const measures = [
  { key: "notes", title: "Note create", module: "Second Brain", path: "/knowledge", icon: BookOpen },
  { key: "events", title: "Eventi con inizio nel periodo", module: "Calendario", path: "/calendar", icon: CalendarDays },
  { key: "study", title: "Sessioni di studio completate", module: "Academic", path: "/academic?sezione=study", icon: GraduationCap },
  { key: "workouts", title: "Allenamenti completati", module: "Health & Fitness", path: "/health", icon: Activity },
] as const satisfies ReadonlyArray<{key:string;title:string;module:string;path:string;icon:LucideIcon}>;
type Measure = typeof measures[number]["key"];
type Period = { start:string; end:string } & Record<Measure,number>;
type Report = {current:Period; previous:Period};

function dateLabel(day:string) {
  return new Intl.DateTimeFormat("it-IT", {day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(day + "T12:00:00Z"));
}

export default function Analytics() {
  const prefs = usePrefs();
  const [days, setDays] = useState("7");
  const [end, setEnd] = useState(() => displayDay(new Date(),prefs));
  const [module, setModule] = useState("");
  const [result, setResult] = useState<Report|null>(null);
  const [error, setError] = useState("");
  const [attempt, retry] = useState(0);
  const zone = prefs.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError("");
    if (end) {
      req<Report>("/analytics?" + new URLSearchParams({end,days,zone}), {signal:controller.signal})
        .then(report=>{if (!controller.signal.aborted) setResult(report);})
        .catch(err=>{if (!controller.signal.aborted) setError(err.message);});
    }
    return () => controller.abort();
  },[end,days,zone,attempt]);
  return <section className="mx-auto max-w-5xl space-y-5">
    <header className="nexus-report-header"><h1 className="text-3xl font-semibold">Analytics</h1>
      <p className="mt-2 text-mute">Confronta i record del periodo con quelli dei giorni precedenti.</p></header>
    <div className="grid gap-3 sm:grid-cols-3">
      <label>Intervallo<select aria-label="Intervallo" className={field} value={days} onChange={e=>setDays(e.target.value)}>
        {[7,30,90].map(d=><option key={d} value={d}>{d} giorni</option>)}</select></label>
      <label>Fino al giorno<input className={field} type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label>
      <label>Modulo<select aria-label="Modulo" className={field} value={module} onChange={e=>setModule(e.target.value)}>
        <option value="">Tutti i moduli</option>{measures.map(m=><option key={m.key} value={m.key}>{m.module}</option>)}</select></label>
    </div>
    {!end ? <p>Seleziona una data di fine.</p> : error ? <div role="alert">{error} <button className={btn} onClick={()=>retry(n=>n+1)}>Riprova</button></div> :
      !result ? <p role="status">Caricamento del confronto…</p> : <>
        <p className="text-sm text-mute">{dateLabel(result.current.start)} – {dateLabel(result.current.end)} · Confronto con {dateLabel(result.previous.start)} – {dateLabel(result.previous.end)} · {zone}</p>
        <div className="grid gap-4 sm:grid-cols-2">{measures.filter(m=>!module || m.key===module).map(m=>{
          const current=result.current[m.key], previous=result.previous[m.key], max=Math.max(1,current,previous);
          return <article key={m.key} aria-label={m.title} className="rounded-xl border border-line bg-panel p-5">
            <Link className="inline-flex items-center gap-2 text-sm text-accent" to={m.path}><m.icon size={16}/>{m.module}</Link>
            <h2 className="mt-2 font-semibold">{m.title}</h2><div className="my-3 text-3xl font-semibold">{current}</div>
            <div aria-hidden="true" className="space-y-1">
              <div className="h-1 rounded bg-accent" style={{width:current/max*100+"%"}}/>
              <div className="h-1 rounded bg-mute" style={{width:previous/max*100+"%"}}/>
            </div><p className="mt-2 text-sm text-mute">Periodo precedente: {previous}</p>
            {!current && !previous && <p className="mt-1 text-sm">Nessun record nei due periodi.</p>}
          </article>;
        })}</div>
      </>}
  </section>;
}

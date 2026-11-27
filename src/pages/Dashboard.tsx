import {weekSummary,type WeekSummary} from "../planner";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { academic, api, eur, fin, type Note, type StudyTask, type Summary } from "../api";
import { events, projects, projectStates, type LifeEvent, type Project } from "../coreRecords";
import DashboardLayout from "../DashboardLayout";
import { useAssistantStatus } from "../useAssistantStatus";
import { openQuickCapture } from "../QuickCapture";
import { displayDay, getClockOptions, getDateOptions, getZoneOptions, usePrefs } from "../prefs";
import { inNextWeek, localDay, schoolEntries, type SchoolEntry } from "../schoolAgenda";
import ActivityFeed from "./ActivityFeed";
import DailyFocus, { type FocusOption } from "./DailyFocus";
import { TodayTasks, useTasks } from "./Tasks";

const panel = "rounded-xl border border-line bg-panel p-4 sm:p-5";
const action = "text-sm font-medium text-accent underline-offset-4 hover:underline";
const headerAction = "flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm hover:bg-raised";
type Data<T> = { value: T } | { error: true } | null;

function AssistantWidget() {
  const {provider,retry} = useAssistantStatus();
  return <section className={panel}><h2 className="font-semibold">Stato AI</h2>
    <p role="status" className="my-2 text-sm text-mute">{{
      checking:"Verifica configurazione…", missing:"Provider AI da configurare. Il piano locale è disponibile.",
      configured:"Provider configurato sul server.", error:"Stato del provider indisponibile.",
    }[provider]}</p>
    {provider==="error" && <button onClick={retry} className={action+" mr-3"}>Riprova</button>}
    <Link to="/ai" className={action}>Apri assistente</Link></section>;
}

function PlannerWeek({today}:{today:string}){
  const [summary,setSummary]=useState<WeekSummary|null>(null),[failed,setFailed]=useState(false);
  useEffect(()=>{let active=true;weekSummary(today).then(v=>{if(active)setSummary(v);}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[today]);
  return <div className={panel}><Link className={action} to="/life?tab=settimana">La settimana nel Planner</Link>
    {summary?<p className="mt-2 text-sm">{summary.weekly_objectives_done} / {summary.weekly_objectives} obiettivi · {summary.habit_completions} abitudini completate · {summary.focus_minutes} min di focus</p>:<p>{failed?"Riepilogo indisponibile.":"Caricamento…"}</p>}</div>;
}

function NoteHistory({ notes, today }: { notes: Note[]; today: string }) {
  const prefs = usePrefs();
  const counts = new Map<string, number>();
  for (const note of notes) {
    const raw = note.created_at;
    // SQLite serializza senza offset i timestamp UTC delle installazioni locali.
    const created = new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(raw) ? raw : raw + "Z");
    if (Number.isFinite(created.getTime())) {
      const day = displayDay(created, prefs);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
  }
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today + "T12:00:00");
    day.setDate(day.getDate() - 6 + i);
    return { day, count: counts.get(localDay(day)) ?? 0 };
  });
  const max = Math.max(1, ...days.map(row => row.count));
  return <ol className="mt-4 grid grid-cols-7 gap-1" aria-label="Note create negli ultimi sette giorni">{days.map(({ day, count }) => <li key={localDay(day)} className="text-center text-xs">
    <span>{count}</span><div className="mx-auto flex h-12 w-3 items-end"><div className="w-full rounded-t bg-accent" style={{height: (100 * count / max) + "%"}} /></div>
    <time dateTime={localDay(day)} className="text-mute">{day.toLocaleDateString("it-IT", { weekday: "short" })}</time>
  </li>)}</ol>;
}

function WeeklyProgress({ tasks, day }: { tasks: StudyTask[]; day: string }) {
  const start = new Date(day + "T12:00:00");
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const first = localDay(start), until = localDay(end);
  const week = tasks.filter(t => t.status !== "cancelled" && t.due_date && t.due_date >= first && t.due_date < until);
  if (!week.length) return null;
  const done = week.filter(t => t.done || t.status === "done").length;
  return <div className="my-3"><p className="text-sm">{done} su {week.length} completate tra le attività in scadenza questa settimana</p>
    <progress className="w-full" aria-label="Avanzamento scolastico settimanale" value={done} max={week.length}/></div>;
}

export default function Dashboard() {
  const prefs = usePrefs();
  const [now, setNow] = useState(() => new Date());
  const today = displayDay(now, prefs);
  const month = today.slice(0, 7);
  const [status, setStatus] = useState("…");
  const tick = useTasks();
  const [notes, setNotes] = useState<Data<Note[]>>(null);
  const [school, setSchool] = useState<Data<{ tasks: StudyTask[]; entries: SchoolEntry[] }>>(null);
  const [eventRows, setEvents] = useState<Data<LifeEvent[]>>(null);
  const [projectRows, setProjects] = useState<Data<Project[]>>(null);
  const [finance, setFinance] = useState<Data<Summary>>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    function refresh() { setAttempt(n => n + 1); }
    window.addEventListener("nexus:inbox-updated", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("nexus:inbox-updated", refresh); };
  }, []);
  useEffect(() => {
    let active = true;
    api.health().then(() => { if (active) setStatus("online"); }).catch(() => { if (active) setStatus("offline"); });
    api.listNotes().then(value => { if (active) setNotes({ value }); }).catch(() => { if (active) setNotes({ error: true }); });
    Promise.all([academic.tasks(), academic.exams()]).then(([tasks, exams]) => {
      if (active) setSchool({ value: { tasks, entries: schoolEntries(tasks, exams) } });
    }).catch(() => { if (active) setSchool({ error: true }); });
    events.list().then(value => { if (active) setEvents({ value }); }).catch(() => { if (active) setEvents({ error: true }); });
    projects.list().then(value => { if (active) setProjects({ value }); }).catch(() => { if (active) setProjects({ error: true }); });
    fin.summary(month).then(value => { if (active) setFinance({ value }); }).catch(() => { if (active) setFinance({ error: true }); });
    return () => { active = false; };
  }, [attempt, today, month]);
  const rows = school && "value" in school ? school.value : null;
  const noteRows = notes && "value" in notes ? notes.value : null;
  const balance = finance && "value" in finance ? finance.value : null;
  const personalEvents = eventRows && "value" in eventRows ? eventRows.value : null;
  const upcoming = personalEvents?.filter(e => new Date(e.ends_at || e.starts_at) >= now).slice(0, 5);
  const portfolio = projectRows && "value" in projectRows ? projectRows.value : null;
  const ongoing = portfolio?.filter(p => ["planning", "active", "paused"].includes(p.status));
  const next = inNextWeek(rows?.entries ?? [], new Date(today + "T12:00:00"));
  const retry = <button className={action} onClick={() => setAttempt(n => n + 1)}>Riprova</button>;
  const unavailable = (failed: boolean) => failed ? <p role="alert" className="text-sm">Dati non disponibili. {retry}</p> : <p role="status">Caricamento…</p>;
  const hour = Number(new Intl.DateTimeFormat("en-GB", { ...getZoneOptions(prefs), hour: "2-digit", hourCycle: "h23" }).format(now));
  const openTasks = (rows?.tasks ?? []).filter(t => !t.done && t.status !== "done" && t.status !== "cancelled");
  const focus: FocusOption[] = [
    ...(tick.data?.tasks ?? []).map(t => ({ key: "tt-" + t.project_id + "-" + t.id, title: t.title, to: "/tasks", source: "TickTick" })),
    ...openTasks.map(t => ({ key: "school-" + t.id, title: t.title, to: "/academic?sezione=agenda", source: t.course_name || "Academic" })),
    ...(rows?.entries ?? []).filter(e => e.source === "exams" && !e.completed && e.date >= today).map(e => ({ key: e.key, title: e.title, to: "/academic?sezione=exams", source: e.type })),
  ];
  const overdue = openTasks.filter(t => t.due_date && t.due_date < today).length;
  const dueToday = (rows?.tasks ?? []).filter(t => t.due_date === today && t.status !== "cancelled");
  const schoolWidget = <section className={panel}>
    <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-semibold">Scuola nei prossimi 7 giorni</h2><Link className={action} to="/calendar">Apri calendario</Link></header>
    {!rows ? unavailable(Boolean(school)) : next.length === 0 ? <p className="text-mute">Nessuna scadenza scolastica in programma.</p>
      : <ul className="divide-y divide-line">{next.map(entry => <li key={entry.key}><Link className="block py-3 hover:text-accent" to={"/academic?sezione=" + entry.source}>
        <span className="block break-words font-medium">{entry.title}</span><span className="text-sm text-mute">{[entry.date === today ? "Oggi" : new Date(entry.date + "T12:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" }), entry.type, entry.course].filter(Boolean).join(" · ")}</span>
      </Link></li>)}</ul>}
  </section>;
  return <div className="mx-auto max-w-6xl space-y-5">
    <header className="nexus-report-header space-y-3">
      <h1 className="text-3xl font-semibold">{hour < 12 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera"}</h1>
      <p className="text-mute">{now.toLocaleDateString("it-IT", getDateOptions(prefs))} · {now.toLocaleTimeString("it-IT", getClockOptions(prefs))} · Backend {status}</p>
      <div className="flex flex-wrap gap-2">
        <Link className={headerAction} to="/ai"><Sparkles size={16}/> AI Assistant</Link>
      </div>
    </header>
    <DashboardLayout widgets={{
      tasks: <TodayTasks tasks={tick}/>,
      school: schoolWidget,
      focus: <div className="space-y-2"><DailyFocus key={today} day={today} options={focus} partial={!rows || !!tick.error || !tick.status}/><PlannerWeek today={today}/><Link className="text-accent" to="/life">Apri il piano del giorno</Link> · <Link className="text-accent" to="/life?tab=settimana">Settimana</Link></div>,
      capture: <section className={panel}><h2 className="font-semibold">Raccolta rapida</h2><p className="my-2 text-sm text-mute">Raccogli un pensiero e organizzalo dalla tua Inbox.</p>
        <button onClick={() => openQuickCapture()} className={action}>Aggiungi all’Inbox</button></section>,
      notes: <section className={panel}><header className="mb-3 flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Note recenti</h2><Link className={action} to="/knowledge">Apri Second Brain</Link></header>
        {!noteRows ? unavailable(Boolean(notes)) : <><p className="text-sm text-mute">Note salvate: {noteRows.length}</p><ul className="divide-y divide-line">{noteRows.slice(0, 4).map(note => <li key={note.id}>
          <Link className="block break-words py-2 hover:text-accent" to={"/knowledge?nota=" + note.id}>{note.title}</Link></li>)}</ul></>}
      </section>,
      history: <ActivityFeed/>,
      chart: <section className={panel}><h2 className="font-semibold">Note create negli ultimi 7 giorni</h2>{noteRows ? <NoteHistory notes={noteRows} today={today}/> : unavailable(Boolean(notes))}</section>,
      upcoming: <section className={panel}><div className="flex justify-between gap-2"><h2 className="font-semibold">Prossimi eventi</h2><Link to="/calendar" className={action}>Calendario</Link></div>
        {!upcoming ? unavailable(Boolean(eventRows)) : !upcoming.length ? <p className="mt-2 text-mute">Nessun appuntamento in programma.</p> :
         <ul className="mt-2 divide-y divide-line">{upcoming.map(e=><li key={e.id}><Link className="block break-words py-2" to={"/calendar?evento="+e.id}>
         {e.title}<span className="block text-sm text-mute">{new Date(e.starts_at).toLocaleString("it-IT",{...getZoneOptions(prefs),dateStyle:"short",timeStyle:"short"})}</span></Link></li>)}</ul>}</section>,
      projects: <section className={panel}><div className="flex justify-between gap-2"><h2 className="font-semibold">Progetti in corso</h2><Link to="/projects" className={action}>Tutti i progetti</Link></div>
        {!ongoing ? unavailable(Boolean(projectRows)) : !ongoing.length ? <p className="mt-2 text-mute">Nessun progetto in pianificazione, attivo o in pausa.</p> :
         <ul className="divide-y divide-line">{ongoing.slice(0,4).map(p=><li key={p.id}><Link className="block break-words py-2" to={"/projects?id="+p.id}>
          {p.title}<span className="block text-sm text-mute">{projectStates[p.status]} · {p.progress}% · Aggiornato il {new Date(p.updated_at).toLocaleDateString("it-IT")}</span>
          {p.milestone && <span className="text-sm">{p.milestone}</span>}</Link></li>)}</ul>}</section>,
      ai: <AssistantWidget/>,
      modules: <section className={panel}><h2 className="font-semibold">Panoramica</h2>
        <Link to="/finance" className="mt-3 block text-accent">Finance</Link>{balance ? <p>Saldo {eur(balance.balance_cents)} · Uscite del mese {eur(balance.expense_cents)}</p> : unavailable(Boolean(finance))}
        <Link to="/academic?sezione=agenda" className="mt-3 block text-accent">Academic</Link>{rows ? <p>{openTasks.length} attività aperte · {overdue} in ritardo</p> : unavailable(Boolean(school))}
      </section>,
      insights: <section className={panel}><h2 className="font-semibold">Attività scolastiche in scadenza oggi</h2>{rows ? <p className="mt-2">{dueToday.length ? `${dueToday.filter(t => t.done || t.status === "done").length} completate su ${dueToday.length} in scadenza` : "Nessuna attività scolastica in scadenza oggi."}</p> : unavailable(Boolean(school))}
        {rows && <WeeklyProgress tasks={rows.tasks} day={today}/>}
        <Link className={action} to="/academic?sezione=agenda">Apri agenda</Link></section>
    }}/>
  </div>;
}

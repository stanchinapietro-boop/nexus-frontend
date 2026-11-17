import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, CalendarDays, CalendarRange, Flag, Inbox, LayoutGrid, Plus, RefreshCw, Sunrise, X } from "lucide-react";
import { tt, type TTStatus, type TTTask, type TTTasks } from "../api";

const input = "w-full rounded-lg border border-line bg-ink px-3 py-2 text-base";
const card = "rounded-2xl border border-line bg-panel p-5";
const PRIO: Record<number, [string, string]> = { 5: ["Alta", "#ef4444"], 3: ["Media", "#f59e0b"], 1: ["Bassa", "#0ea5e9"] };

function useTasks() {
  const [status, setStatus] = useState<TTStatus | null>(null);
  const [data, setData] = useState<TTTasks | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const s = await tt.status();
      setStatus(s);
      if (s.connected) { setData(await tt.tasks()); setError(""); }
    } catch (e) {
      setError(e instanceof Error && e.message.includes("401") ? "L'autorizzazione è scaduta: ricollega TickTick." : "Impossibile leggere i task. Il backend è acceso?");
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { status, data, error, load, setData };
}

const todayLocal = () => new Date().toLocaleDateString("sv-SE");
const fmtShort = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });

function dueLabel(t: TTTask): { text: string; color: string } | null {
  if (!t.due_date) return null;
  const today = todayLocal();
  if (t.overdue) return { text: fmtShort(t.due_date), color: "#ef4444" };
  if (t.due_date === today) return { text: "Oggi", color: "#3b82f6" };
  if (t.due_date === addDays(today, 1)) return { text: "Domani", color: "#f59e0b" };
  return { text: fmtShort(t.due_date), color: "#8d8d94" };
}

function Row({ t, onDone }: { t: TTTask; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const color = PRIO[t.priority]?.[1] ?? "#8d8d94";
  const lbl = dueLabel(t);
  return (
    <div className={`flex items-center gap-3 border-b border-line/60 px-2 py-3 transition-all last:border-0 hover:bg-white/[0.03] md:py-2.5 ${busy ? "opacity-40" : ""}`}>
      <button aria-label="Completa task" disabled={busy} onClick={() => { setBusy(true); onDone(); }} className="shrink-0">
        <span className="flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors" style={{ borderColor: color, background: busy ? color : color + "14" }}>
          {busy && <Check size={12} className="text-black" />}
        </span>
      </button>
      <div className={`min-w-0 flex-1 truncate ${busy ? "line-through" : ""}`}>{t.title}</div>
      <span className="hidden items-center gap-1.5 rounded-full bg-white/[0.05] px-2 py-0.5 text-xs text-mute sm:flex">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.project_color }} />{t.project_name}
      </span>
      {lbl && <span className="shrink-0 text-xs font-medium" style={{ color: lbl.color }}>{lbl.text}</span>}
    </div>
  );
}

function Connect({ status }: { status: TTStatus | null }) {
  if (!status) return null;
  if (!status.configured)
    return (
      <div className={card}>
        <h2 className="font-medium">Configura TickTick</h2>
        <p className="mt-1 text-sm text-mute">Crea il file <code>apps\api\.env</code> (parti da <code>.env.example</code>) con Client ID e Client Secret della tua app su developer.ticktick.com, poi riavvia il backend.</p>
      </div>
    );
  return (
    <div className={card}>
      <h2 className="font-medium">Collega TickTick</h2>
      <p className="mt-1 text-sm text-mute">Verrai portato su TickTick per autorizzare la lettura e la creazione dei task.</p>
      <a href="/api/ticktick/login" className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 font-medium text-black">Collega account</a>
    </div>
  );
}

export function TodayTasks() {
  const { status, data, error, load, setData } = useTasks();
  if (!status && !error) return null;
  const list = (data?.tasks ?? []).filter((t) => t.overdue || t.due_date === data?.today);
  const late = list.filter((t) => t.overdue).length;
  return (
    <div className={`${card} mt-6`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="font-medium">Task di oggi</div>
        <Link to="/tasks" className="text-sm text-accent">Tutti</Link>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {status && !status.connected && <p className="text-sm text-mute">TickTick non è collegato. <Link to="/tasks" className="text-accent">Collega</Link></p>}
      {data && list.length === 0 && <p className="text-sm text-mute">Niente in scadenza oggi.</p>}
      {late > 0 && <p className="mb-2 text-sm text-red-400">{late} in ritardo</p>}
      <div className="grid gap-2">
        {list.slice(0, 5).map((t) => (
          <Row key={t.id} t={t} onDone={() => tt.complete(t.project_id, t.id).then(() => data && setData({ ...data, tasks: data.tasks.filter((x) => x.id !== t.id) })).catch(load)} />
        ))}
      </div>
    </div>
  );
}

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

type Quad = { key: string; title: string; hint: string; color: string; urgent: boolean; important: boolean };

function Quadrant({ q, tasks, onOpen }: { q: Quad; tasks: TTTask[]; onOpen: () => void }) {
  return (
    <button onClick={onOpen} aria-label={`${q.title}: ${tasks.length} task. Tocca per aprire`}
      className="flex h-56 min-w-0 flex-col overflow-hidden rounded-2xl border p-3 text-left transition active:scale-[0.98] md:h-72"
      style={{ borderColor: q.color + "55", background: `linear-gradient(180deg, ${q.color}1f, rgb(24 24 26) 65%)` }}>
      <span className="mb-2 flex items-start justify-between gap-1">
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold leading-tight" style={{ color: q.color }}>{q.title}</span>
          <span className="block text-[11px] text-mute">{q.hint}</span>
        </span>
        <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: q.color + "26", color: q.color }}>{tasks.length}</span>
      </span>
      <span className="block min-h-0 flex-1 space-y-1.5 overflow-hidden">
        {tasks.slice(0, 6).map((t) => (
          <span key={t.id} className="flex items-center gap-2 text-[13px]">
            <span className="h-3.5 w-3.5 shrink-0 rounded border-2" style={{ borderColor: PRIO[t.priority]?.[1] ?? "#8d8d94" }} />
            <span className="truncate">{t.title}</span>
          </span>
        ))}
        {tasks.length === 0 && <span className="block pt-6 text-center text-xs text-mute">Nessun task</span>}
      </span>
      {tasks.length > 6 && <span className="block pt-1 text-[11px] text-mute">+{tasks.length - 6} altri · tocca per aprire</span>}
    </button>
  );
}

function QuadrantSheet({ q, tasks, onClose, onDone, onAdd }: { q: Quad; tasks: TTTask[]; onClose: () => void; onDone: (t: TTTask) => void; onAdd: (title: string) => void }) {
  const [title, setTitle] = useState("");
  const submit = () => { if (!title.trim()) return; onAdd(title.trim()); setTitle(""); };
  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-ink" role="dialog" aria-label={q.title}>
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 pb-3" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
        <div><h2 className="font-semibold" style={{ color: q.color }}>{q.title}</h2><div className="text-xs text-mute">{q.hint} · {tasks.length}</div></div>
        <button aria-label="Chiudi" onClick={onClose} className="rounded-full border border-line p-2.5"><X size={18} /></button>
      </header>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {tasks.map((t) => <Row key={t.id} t={t} onDone={() => onDone(t)} />)}
        {tasks.length === 0 && <p className="px-2 pt-4 text-sm text-mute">Nessun task in questo riquadro.</p>}
      </div>
      <div className="border-t border-line bg-panel p-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <input className={input} placeholder="Nuovo task qui (Invio per salvare)" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      </div>
    </div>
  );
}

function Matrix({ data, urgentDays, onDone, onAdd }: { data: TTTasks; urgentDays: number; onDone: (t: TTTask) => void; onAdd: (title: string, urgent: boolean, important: boolean) => void }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const limit = addDays(data.today, urgentDays);
  const isUrgent = (t: TTTask) => t.overdue || (!!t.due_date && t.due_date <= limit);
  const isImportant = (t: TTTask) => t.priority >= 3;
  const quads: Quad[] = [
    { key: "q1", title: "Urgente e importante", hint: "Fai subito", color: "#ef4444", urgent: true, important: true },
    { key: "q2", title: "Importante, non urgente", hint: "Pianifica", color: "#f59e0b", urgent: false, important: true },
    { key: "q3", title: "Urgente, non importante", hint: "Sbrigalo o delega", color: "#0ea5e9", urgent: true, important: false },
    { key: "q4", title: "Né urgente né importante", hint: "Dopo o elimina", color: "#71717a", urgent: false, important: false },
  ];
  const tasksOf = (q: Quad) => data.tasks.filter((t) => isUrgent(t) === q.urgent && isImportant(t) === q.important);
  const openQ = quads.find((q) => q.key === openKey);
  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:gap-3">
        {quads.map((q) => <Quadrant key={q.key} q={q} tasks={tasksOf(q)} onOpen={() => setOpenKey(q.key)} />)}
      </div>
      {openQ && <QuadrantSheet q={openQ} tasks={tasksOf(openQ)} onClose={() => setOpenKey(null)} onDone={onDone} onAdd={(title) => onAdd(title, openQ.urgent, openQ.important)} />}
    </>
  );
}

function DatePill({ value, onChange, today }: { value: string; onChange: (v: string) => void; today: string }) {
  const [open, setOpen] = useState(false);
  const opts: [string, string][] = [["Oggi", today], ["Domani", addDays(today, 1)], ["Tra una settimana", addDays(today, 7)]];
  const label = value ? (value === today ? "Oggi" : value === addDays(today, 1) ? "Domani" : fmtShort(value)) : "Data";
  const pick = (v: string) => { onChange(v); setOpen(false); };
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${value ? "bg-accent/15 text-accent" : "text-mute hover:bg-raised hover:text-white"}`}>
        <CalendarDays size={15} />{label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-60 rounded-xl border border-line bg-panel p-2 shadow-2xl shadow-black/60">
            {opts.map(([l, v]) => (
              <button key={l} onClick={() => pick(v)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-raised">
                {l}<span className="text-xs text-mute">{fmtShort(v)}</span>
              </button>
            ))}
            <input type="date" aria-label="Scegli una data" className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2" value={value} onChange={(e) => pick(e.target.value)} />
            {value && <button onClick={() => pick("")} className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-raised">Rimuovi data</button>}
          </div>
        </>
      )}
    </div>
  );
}

const FLAG_ORDER = [0, 1, 3, 5];
function PrioFlag({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const color = PRIO[value]?.[1] ?? "#8d8d94";
  return (
    <button type="button" aria-label={`Priorità: ${PRIO[value]?.[0] ?? "nessuna"}. Tocca per cambiare`} onClick={() => onChange(FLAG_ORDER[(FLAG_ORDER.indexOf(value) + 1) % FLAG_ORDER.length])}
      className="rounded-lg p-2 hover:bg-raised"><Flag size={16} style={{ color }} fill={value ? color : "none"} /></button>
  );
}

const SECTION = (t: TTTask, today: string): { k: string; label: string } => {
  if (!t.due_date) return { k: "9", label: "Senza data" };
  if (t.overdue) return { k: "0", label: "In ritardo" };
  if (t.due_date === today) return { k: "1", label: "Oggi" };
  if (t.due_date === addDays(today, 1)) return { k: "2", label: "Domani" };
  if (t.due_date <= addDays(today, 6)) { const f = fmtShort(t.due_date); return { k: "3" + t.due_date, label: f.charAt(0).toUpperCase() + f.slice(1) }; }
  return { k: "4", label: "Più avanti" };
};

export default function Tasks() {
  const { status, data, error, load, setData } = useTasks();
  const [params] = useSearchParams();
  const [sel, setSelState] = useState<string>(() => { try { return localStorage.getItem("nexus.tasks.sel") || "today"; } catch { return "today"; } });
  const [urgent, setUrgentState] = useState<number>(() => {
    try { const r = localStorage.getItem("nexus.tasks.urgent"); return r === null ? 1 : Number(r) || 0; } catch { return 1; }
  });
  const setSel = (v: string) => { setSelState(v); try { localStorage.setItem("nexus.tasks.sel", v); } catch { /* ignora */ } };
  const setUrgent = (n: number) => { setUrgentState(n); try { localStorage.setItem("nexus.tasks.urgent", String(n)); } catch { /* ignora */ } };
  const [title, setTitle] = useState(""); const [due, setDue] = useState(""); const [prio, setPrio] = useState(0);
  const [msg, setMsg] = useState("");

  const done = (t: TTTask) => tt.complete(t.project_id, t.id).then(() => data && setData({ ...data, tasks: data.tasks.filter((x) => x.id !== t.id) })).catch(load);
  const today = data?.today ?? todayLocal();
  const tomorrow = addDays(today, 1);
  const weekEnd = addDays(today, 6);
  const tasks = data?.tasks ?? [];
  const inToday = (t: TTTask) => t.overdue || t.due_date === today;
  const inWeek = (t: TTTask) => t.overdue || (!!t.due_date && t.due_date <= weekEnd);

  async function create(text: string, d: string | null, pr: number, project: string | null) {
    try { await tt.createTask(text, project, d, pr); setMsg(""); load(); return true; }
    catch { setMsg("Creazione non riuscita."); return false; }
  }
  async function add() {
    if (!title.trim()) return;
    const project = sel.startsWith("p:") ? sel.slice(2) : null;
    const d = due || (sel === "today" ? today : sel === "tomorrow" ? tomorrow : null);
    if (await create(title.trim(), d, prio, project)) { setTitle(""); setDue(""); setPrio(0); }
  }

  const visible = tasks.filter((t) =>
    sel === "today" ? inToday(t) : sel === "tomorrow" ? t.due_date === tomorrow : sel === "week" ? inWeek(t)
      : sel.startsWith("p:") ? t.project_id === sel.slice(2) : true);
  const groups = Object.entries(visible.reduce<Record<string, { label: string; list: TTTask[] }>>((acc, t) => {
    const g = SECTION(t, today); (acc[g.k] ??= { label: g.label, list: [] }).list.push(t); return acc;
  }, {})).sort(([a], [b]) => a.localeCompare(b));

  const projColor = (id: string) => tasks.find((x) => x.project_id === id)?.project_color ?? "#8d8d94";
  const item = (id: string, label: string, icon: ReactNode, count?: number) => (
    <button key={id} onClick={() => setSel(id)} aria-current={sel === id ? "page" : undefined}
      className={`relative flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${sel === id ? "bg-white/[0.07] font-medium text-white" : "text-mute hover:bg-white/[0.04] hover:text-white"}`}>
      {sel === id && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" />}
      {icon}
      <span className="flex-1 whitespace-nowrap text-left">{label}</span>
      {count !== undefined && count > 0 && <span className="text-xs tabular-nums text-mute">{count}</span>}
    </button>
  );
  const heading: Record<string, string> = { all: "Tutti", today: "Oggi", tomorrow: "Domani", week: "Prossimi 7 giorni", matrix: "Matrice di Eisenhower" };
  const title2 = heading[sel] ?? data?.projects.find((p) => "p:" + p.id === sel)?.name ?? "Lista";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-sm font-medium uppercase tracking-[0.18em] text-mute">Tasks</h1>
        {status?.connected && <button onClick={() => tt.disconnect().then(() => { setData(null); load(); })} className="rounded-lg px-3 py-1.5 text-sm text-mute hover:bg-raised hover:text-red-400">Scollega</button>}
      </div>
      {params.get("ticktick") === "ok" && <p className="mb-3 text-sm text-green-400">TickTick collegato.</p>}
      {params.get("ticktick") === "errore" && <p className="mb-3 text-sm text-red-400">Collegamento non riuscito. Riprova.</p>}
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      {status && !status.connected && <Connect status={status} />}

      {status?.connected && data && (
        <div className="tk-layout">
          <nav aria-label="Liste" className="tk-side">
            {item("all", "Tutti", <Inbox size={17} color="#a1a1aa" />, tasks.length)}
            {item("today", "Oggi", <CalendarDays size={17} color="#3b82f6" />, tasks.filter(inToday).length)}
            {item("tomorrow", "Domani", <Sunrise size={17} color="#f59e0b" />, tasks.filter((t) => t.due_date === tomorrow).length)}
            {item("week", "Prossimi 7 giorni", <CalendarRange size={17} color="#a855f7" />, tasks.filter(inWeek).length)}
            {item("matrix", "Matrice", <LayoutGrid size={17} color="#ef4444" />)}
            <div className="tk-group px-3 pb-1 pt-5 text-[11px] font-medium uppercase tracking-[0.16em] text-mute">Liste</div>
            {data.projects.map((p) => item("p:" + p.id, p.name, <span className="mx-1 h-2 w-2 shrink-0 rounded-full" style={{ background: projColor(p.id) }} />, tasks.filter((t) => t.project_id === p.id).length))}
          </nav>

          <section className="min-w-0">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">{title2}</h2>
                {sel !== "matrix" && <p className="mt-1 text-sm text-mute">{visible.length} {visible.length === 1 ? "task" : "task"}</p>}
              </div>
              <div className="flex items-center gap-2">
                {sel === "matrix" && (
                  <label className="flex items-center gap-2 text-sm text-mute"><span className="hidden sm:inline">Urgente se scade</span>
                    <select className="rounded-lg border border-line bg-panel px-2 py-1.5 text-white" value={urgent} onChange={(e) => setUrgent(Number(e.target.value))}>
                      <option value={0}>oggi</option><option value={1}>entro domani</option><option value={2}>entro 2 giorni</option>
                      <option value={3}>entro 3 giorni</option><option value={7}>entro 7 giorni</option>
                    </select>
                  </label>
                )}
                <button aria-label="Aggiorna" onClick={load} className="rounded-lg border border-line bg-panel p-2 text-mute hover:text-white"><RefreshCw size={15} /></button>
              </div>
            </div>
            {msg && <p className="mb-2 text-sm text-red-400">{msg}</p>}

            {sel === "matrix" ? (
              <Matrix data={data} urgentDays={urgent} onDone={done} onAdd={(text, u, i) => create(text, u ? today : null, i ? 5 : 0, null)} />
            ) : (
              <>
                <div className="mb-5 flex items-center gap-1 rounded-2xl border border-line bg-panel/80 px-3 py-1.5 transition-colors focus-within:border-accent/60">
                  <Plus size={18} className="shrink-0 text-mute" />
                  <input className="min-w-0 flex-1 bg-transparent px-1.5 py-2 text-base outline-none placeholder:text-mute" placeholder="Aggiungi un task, premi Invio"
                    value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
                  <DatePill value={due} onChange={setDue} today={today} />
                  <PrioFlag value={prio} onChange={setPrio} />
                </div>
                {groups.map(([k, g]) => (
                  <div key={k} className="mb-5">
                    <h3 className={`mb-1 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider ${k === "0" ? "text-red-400" : "text-mute"}`}>
                      {g.label}<span className="font-normal normal-case tracking-normal opacity-70">{g.list.length}</span>
                    </h3>
                    <div className="rounded-2xl border border-line bg-panel/60 px-1">
                      {g.list.map((t) => <Row key={t.id} t={t} onDone={() => done(t)} />)}
                    </div>
                  </div>
                ))}
                {visible.length === 0 && (
                  <div className="mt-14 flex flex-col items-center gap-2 text-center text-mute">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05]"><Check size={22} /></span>
                    <p>Niente da fare qui. Goditi il momento.</p>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

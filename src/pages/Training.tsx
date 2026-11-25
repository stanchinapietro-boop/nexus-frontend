import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { req } from "../api";
import { lifeApi, type LifeWorkout } from "../lifeResources";
import { btn, field, panel } from "../planner";
import { displayDay, usePrefs } from "../prefs";

type Draft = Omit<LifeWorkout, "completed" | "id">;
function empty(day: string, volley: boolean): Draft {
  return { day, name: "", sport: volley ? "Volley" : "", notes: "", description: "", place: "", duration_minutes: 0, intensity: null };
}

export default function Training({ volley }: { volley: boolean }) {
  const prefs = usePrefs();
  const today = displayDay(new Date(), prefs);
  const [rows, setRows] = useState<LifeWorkout[] | null>(null);
  const [reload, setReload] = useState(0);
  const [draft, setDraft] = useState(() => empty(today, volley));
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setError("");
    lifeApi.workouts().then(data => { if (live) setRows(data); }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [reload]);
  const visible = rows?.filter(row => !volley || ["volley", "volleyball", "pallavolo", "beach volley"].includes(row.sport.toLowerCase().trim()));
  const completed = visible?.filter(row => row.completed);
  function reset() { setEditing(null); setDraft(empty(today, volley)); }
  async function mutate(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-4xl space-y-4">
    <h1 className="text-3xl font-semibold">{volley ? "Volley" : "Health & Fitness"}</h1>
    <Link className="text-accent" to={volley ? "/health" : "/volley"}>{volley ? "Tutti gli sport" : "Apri il diario Volley"}</Link>
    <form className={panel} onSubmit={event => {
      event.preventDefault();
      void mutate(async () => {
        const result = await req<LifeWorkout>("/life/workouts" + (editing === null ? "" : "/" + editing),
          { method: editing === null ? "POST" : "PUT", body: JSON.stringify(draft) });
        setRows(old => [...(old ?? []).filter(row => row.id !== result.id), result].sort((a,b) => b.day.localeCompare(a.day)));
        reset();
      });
    }}>
      <h2 className="font-semibold">{editing === null ? "Registra allenamento" : "Modifica allenamento"}</h2>
      <fieldset disabled={busy || rows === null} className="grid gap-3 sm:grid-cols-2">
        <label>Nome allenamento<input required maxLength={160} className={field} value={draft.name} onChange={e => setDraft({...draft, name:e.target.value})}/></label>
        {!volley && <label>Sport<input required maxLength={40} className={field} value={draft.sport} onChange={e => setDraft({...draft, sport:e.target.value})}/></label>}
        <label>Data<input required type="date" className={field} value={draft.day} onChange={e => setDraft({...draft, day:e.target.value})}/></label>
        <label>Durata in minuti<input required type="number" min={0} max={1440} className={field} value={draft.duration_minutes} onChange={e => setDraft({...draft, duration_minutes:Number(e.target.value)})}/></label>
        <label>Intensità da 1 a 10<input type="number" min={1} max={10} className={field} value={draft.intensity ?? ""} onChange={e => setDraft({...draft, intensity:e.target.value ? Number(e.target.value) : null})}/></label>
        <label>Note tecniche<textarea maxLength={4000} className={field} value={draft.notes} onChange={e => setDraft({...draft, notes:e.target.value})}/></label>
        <button className={btn} disabled={!draft.name.trim() || !draft.sport.trim()}>Salva allenamento</button>
        {editing !== null && <button className={btn} type="button" onClick={reset}>Annulla modifica</button>}
      </fieldset>
    </form>
    {error && <p role="alert">{error} <button className={btn} onClick={() => setReload(n => n+1)}>Ricarica storico</button></p>}
    <section className={panel}><h2 className="font-semibold">Storico allenamenti</h2>
      {completed && <p>{completed.length} sessioni completate · {completed.reduce((total,row) => total + row.duration_minutes, 0)} minuti</p>}
      {!visible && !error && <p role="status">Caricamento…</p>}
      {visible?.length === 0 && <p>Nessun allenamento registrato.</p>}
      {visible?.map(row => <article key={row.id} className="space-y-2 border-t border-line py-3">
        <h3>{row.name}</h3><p className="text-sm text-mute">{row.day} · {row.sport} · {row.duration_minutes} min{row.intensity !== null && " · Intensità " + row.intensity + "/10"}</p>
        {row.notes && <p className="whitespace-pre-wrap">{row.notes}</p>}
        <button className={btn} disabled={busy} onClick={() => {
          const { id, completed: _completed, ...fields } = row; setDraft(fields); setEditing(id);
        }}>Modifica</button>{" "}
        <button className={btn} aria-pressed={row.completed} disabled={busy} onClick={() => void mutate(async () => {
          const result = await req<{completed:boolean}>("/life/workouts/"+row.id+"/complete",{method:"POST"});
          setRows(old => old?.map(item => item.id === row.id ? {...item, completed: result.completed} : item) ?? null);
        })}>{row.completed ? "Completato" : "Segna completato"}</button>
      </article>)}
    </section>
  </div>;
}

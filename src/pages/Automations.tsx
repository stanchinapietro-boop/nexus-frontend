import { useEffect, useState } from "react";
import { req } from "../api";
import { btn, field, panel } from "../planner";

type Rule = { enabled: boolean; lead_minutes: number; category: string; version: number };
type Run = { event_id: number; starts_at: string; checked_at: string; status: string; attempts: number; error_code: string | null };
type Overview = { available: boolean; rule: Rule | null; runs: Run[] };

export default function Automations() {
  const [data, setData] = useState<Overview | null>(null);
  const [draft, setDraft] = useState<Rule | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setData(null);
    setDraft(null);
    req<Overview>("/automations", { signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) { setData(value); setDraft(value.rule); }
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [revision]);

  async function save() {
    setBusy(true);
    setError("");
    try {
      const rule = await req<Rule>("/automations/calendar-reminder", { method: "PUT", body: JSON.stringify(draft) });
      setData(old => old && { ...old, rule });
      setDraft(rule);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return <section className="mx-auto max-w-3xl space-y-4">
    <h1 className="text-3xl font-semibold">Automazioni</h1>
    {error && <p role="alert">{error} <button className={btn} onClick={() => setRevision(n => n+1)}>Ricarica regola</button></p>}
    {!data && !error && <p role="status">Caricamento automazioni…</p>}
    {data && !data.available && <p>Le automazioni calendario sono disabilitate in questo ambiente.</p>}
    {data && draft && <>
      <form className={panel} onSubmit={e => { e.preventDefault(); void save(); }}>
        <h2 className="font-semibold">Promemoria calendario</h2>
        <p className="mb-3 text-sm text-mute">Crea una notifica interna quando un evento entra nell’intervallo scelto.</p>
        <fieldset disabled={busy} className="grid gap-3">
          <label><input type="checkbox" checked={draft.enabled} onChange={e => setDraft({...draft, enabled:e.target.checked})}/> Attiva promemoria</label>
          <label>Anticipo in minuti<input className={field} type="number" min={5} max={1440} required value={draft.lead_minutes || ""} onChange={e => setDraft({...draft, lead_minutes:Number(e.target.value)})}/></label>
          <label>Categoria evento (vuota per tutte)<input className={field} maxLength={30} value={draft.category} onChange={e => setDraft({...draft, category:e.target.value})}/></label>
          <button className={btn} disabled={JSON.stringify(draft) === JSON.stringify(data.rule)}>{busy ? "Salvataggio…" : "Salva regola"}</button>
        </fieldset>
        <p role="status" className="mt-2 text-sm">{data.rule?.enabled ? "Regola salvata e attiva" : "Regola disattivata"}</p>
      </form>
      <section className={panel}><header className="flex items-center justify-between gap-2"><h2 className="font-semibold">Ultime esecuzioni</h2>
        <button className={btn} disabled={busy || JSON.stringify(draft) !== JSON.stringify(data.rule)} onClick={() => setRevision(n => n+1)}>Aggiorna registro</button></header>
        {!data.runs.length && <p className="mt-3 text-mute">Nessun promemoria elaborato.</p>}
        <ul>{data.runs.map(run => <li key={run.event_id+"-"+run.starts_at} className="border-b border-line py-2">
          {run.status === "sent" ? "Notifica creata" : "Invio fallito"} · Evento {run.event_id} · {new Date(run.checked_at).toLocaleString("it-IT")}
          <small className="block text-mute">Tentativi: {run.attempts}{run.error_code && " · SQLSTATE " + run.error_code}</small>
        </li>)}</ul>
      </section>
    </>}
  </section>;
}

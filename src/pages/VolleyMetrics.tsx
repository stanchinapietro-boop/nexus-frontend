import { useEffect, useRef, useState } from "react";
import { req } from "../api";
import { btn, field } from "../planner";

const skills = { serve: "Battuta", receive: "Ricezione", attack: "Attacco", block: "Muro" };
type Skill = keyof typeof skills;
type Total = { skill: Skill; attempts: number; successful: number };

export default function VolleyMetrics({ workoutId }: { workoutId: number }) {
  const path = "/life/volley/" + workoutId + "/metrics";
  const [totals, setTotals] = useState<Total[] | null>(null);
  const [skill, setSkill] = useState<Skill>("serve");
  const [attempts, setAttempts] = useState("");
  const [successful, setSuccessful] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const pending = useRef<{ payload: string; id: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    req<Total[]>(path, { signal: controller.signal }).then(setTotals).catch(e => {
      if (!controller.signal.aborted) setError(e.message);
    });
    return () => controller.abort();
  }, [path, reload]);

  async function save() {
    const values = { skill, attempts: Number(attempts), successful: Number(successful) };
    const payload = JSON.stringify(values);
    if (pending.current?.payload !== payload) pending.current = { payload, id: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      const result = await req<Total[]>(path, { method: "POST", body: JSON.stringify({ ...values, id: pending.current.id }) });
      setTotals(result);
      setAttempts("");
      setSuccessful("");
      pending.current = null;
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return <section aria-label="Metriche tecniche" className="space-y-3">
    <div aria-live="polite">
      {totals === null && !error && "Caricamento metriche…"}
      {totals?.length === 0 && "Nessuna serie registrata."}
      {totals?.map(t => <p key={t.skill}>{skills[t.skill]} · {t.successful}/{t.attempts} ({Math.round(100 * t.successful / t.attempts)}%)</p>)}
    </div>
    {error && <p role="alert">{error} {totals === null && <button className={btn} onClick={() => setReload(n => n + 1)}>Riprova</button>}</p>}
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={busy || totals === null} className="grid gap-2 sm:grid-cols-3">
        <label>Fondamentale<select className={field} value={skill} onChange={e => setSkill(e.target.value as Skill)}>
          {Object.entries(skills).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
        </select></label>
        <label>Tentativi<input className={field} type="number" required min={1} max={10000} value={attempts} onChange={e => setAttempts(e.target.value)}/></label>
        <label>Riuscite<input className={field} type="number" required min={0} max={attempts || 10000} value={successful} onChange={e => setSuccessful(e.target.value)}/></label>
        <button className={btn}>{busy ? "Salvataggio…" : "Registra serie"}</button>
      </fieldset>
    </form>
  </section>;
}

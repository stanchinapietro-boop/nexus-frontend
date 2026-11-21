import PersonalEvents from "./PersonalEvents";
import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { loadSchoolAgenda, type SchoolEntry } from "../schoolAgenda";



function monthKey(date: Date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}

export default function Calendar() {
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();
  const requested = params.get("giorno");
  const [month, setMonth] = useState(() => new Date());
  useEffect(() => {
    if (requested && /^\d{4}-\d{2}-\d{2}$/.test(requested)) {
      const day = new Date(requested + "T12:00:00");
      if (Number.isFinite(day.getTime())) setMonth(day);
    }
  }, [requested]);
  const [entries, setEntries] = useState<SchoolEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    loadSchoolAgenda().then(rows => { if (active) setEntries(rows); }).catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const key = monthKey(month);
  useEffect(() => {
    if (hash && !loading) document.getElementById(hash.slice(1))?.scrollIntoView?.({ block: "center" });
  }, [hash, loading, key]);
  const days = new Map<string, SchoolEntry[]>();
  for (const entry of entries) {
    if (!entry.date.startsWith(key + "-")) continue;
    const group = days.get(entry.date) ?? [];
    group.push(entry);
    days.set(entry.date, group);
  }
  const selectMonth = (value: Date) => {
    setMonth(value);
    if (params.size || hash) setParams({}, { replace: true });
  };
  const shift = (offset: number) => selectMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1));
  const button = "rounded-lg border border-line px-3 py-2 hover:bg-raised";
  return <section className="mx-auto max-w-3xl space-y-5">
    <h1 className="text-3xl font-semibold">Calendario</h1>
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="mr-auto text-xl capitalize">{month.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}</h2>
      <button className={button} onClick={() => shift(-1)} aria-label="Mese precedente">←</button>
      <button className={button} onClick={() => selectMonth(new Date())}>Oggi</button>
      <button className={button} onClick={() => shift(1)} aria-label="Mese successivo">→</button>
    </div>
    <PersonalEvents month={key}/>
    <h2 className="text-xl font-semibold">Scadenze scolastiche</h2>
    {loading ? <p role="status">Caricamento…</p> : error ? <p role="alert">Impossibile caricare il calendario. <button className="underline" onClick={() => setAttempt(n => n + 1)}>Riprova</button></p>
      : !days.size ? <p className="text-mute">Nessuna scadenza scolastica in questo mese.</p>
      : Array.from(days, ([date, rows]) => <section key={date} className="rounded-xl border border-line bg-panel p-4">
        <h3 className="mb-2 font-semibold capitalize">{new Date(date + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</h3>
        <ul className="divide-y divide-line">{rows.map(row => <li id={row.key} key={row.key} className={"rounded py-2 " + (hash === "#" + row.key ? "bg-raised px-2" : "")}>
          <Link to={"/academic?sezione=" + row.source} className="break-words hover:text-accent">{row.title}</Link><div className="text-sm text-mute">{[row.type, row.course].filter(Boolean).join(" · ")}</div>
        </li>)}</ul>
      </section>)}
    <Link to="/academic" className="inline-block text-accent">Apri Academic</Link>
  </section>;
}

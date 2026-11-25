import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { req } from "../api";
import { btn, field, panel } from "../planner";

type GraphNode = { key: string; title: string; kind: string; path: string };
type Connection = { origin: GraphNode; destination: GraphNode };
type Page = { connections: Connection[]; next_before: number | null };

export default function NeuralMap() {
  const [term, setTerm] = useState("");
  const [history, setHistory] = useState<number[]>([]);
  const before = history[history.length - 1];
  const [page, setPage] = useState<Page | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setPage(null); setSelected(null); setError("");
    const params = new URLSearchParams({ q: term.trim() });
    if (before) params.set("before", String(before));
    const timer = window.setTimeout(() => {
      req<Page>("/graph?" + params, { signal: controller.signal }).then(result => {
        if (!controller.signal.aborted) setPage(result);
      }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    }, 150);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [term, before, attempt]);
  const connected = page?.connections.filter(edge => edge.origin.key === selected?.key || edge.destination.key === selected?.key);
  function node(item: GraphNode) {
    return <button className="min-w-0 flex-1 break-words rounded-xl border border-line bg-raised p-3 text-left"
      aria-pressed={selected?.key === item.key} onClick={() => setSelected(item)}>
      <small className="block text-mute">{item.kind}</small>{item.title}</button>;
  }
  return <section className="mx-auto max-w-5xl space-y-4">
    <h1 className="text-3xl font-semibold">Neural Map</h1>
    <p className="text-sm text-mute">Collegamenti tra elementi Inbox e record creati tramite conversione.</p>
    <label className="block">Cerca nei titoli<input className={field} maxLength={100} value={term}
      onChange={e => { setTerm(e.target.value); setHistory([]); }}/></label>
    {error && <p role="alert">{error} <button className={btn} onClick={() => setAttempt(n => n+1)}>Riprova</button></p>}
    {!error && !page && <p role="status">Caricamento collegamenti…</p>}
    {page && !page.connections.length && <p>{term ? "Nessun collegamento corrispondente." : "Nessuna conversione Inbox collegata."}</p>}
    {!!page?.connections.length && <>
      <div className="flex items-center gap-2"><button className={btn} aria-label="Riduci zoom" disabled={zoom <= 0.75} onClick={() => setZoom(z => z-.25)}>−</button>
        <span>{zoom*100}%</span><button className={btn} aria-label="Aumenta zoom" disabled={zoom >= 2} onClick={() => setZoom(z => z+.25)}>+</button></div>
      <div tabIndex={0} aria-label="Mappa delle conversioni" className="max-h-96 overflow-auto rounded-xl border border-line bg-panel p-3">
        <ul className="space-y-3" style={{width: (zoom*100)+"%", minWidth: (20*zoom)+"rem", fontSize: zoom+"rem"}}>
          {page.connections.map(({origin,destination}) => <li key={origin.key+destination.key} className="flex items-center gap-2">
            {node(origin)}<span aria-label="Convertito in" className="text-accent">→</span>{node(destination)}
          </li>)}
        </ul>
      </div></>}
    {selected && <aside className={panel}><h2 className="font-semibold">{selected.title}</h2>
      <Link className="text-accent" to={selected.path}>Apri in {selected.kind}</Link>
      {connected?.map(({origin,destination}) => <p key={origin.key+destination.key}>{origin.title} → {destination.title}</p>)}</aside>}
    <div className="flex gap-2">{history.length > 0 && <button className={btn} onClick={() => setHistory(h => h.slice(0,-1))}>Precedenti</button>}
      {page?.next_before && <button className={btn} onClick={() => setHistory(h => [...h,page.next_before!])}>Altri collegamenti</button>}</div>
  </section>;
}

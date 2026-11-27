import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { req } from "../api";
import { btn, field, panel } from "../planner";

type GraphNode = { key: string; title: string; kind: string; path: string };
type Connection = { origin: GraphNode; destination: GraphNode };
type Page = { connections: Connection[]; next_before: number | null };

export default function NeuralMap() {
  const [term, setTerm] = useState("");
  const [relation, setRelation] = useState("inbox");
  const [history, setHistory] = useState<number[]>([]);
  const before = history[history.length - 1];
  const [page, setPage] = useState<Page | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<"edges" | "nodes">("edges");
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setPage(null); setSelected(null); setError("");
    const params = new URLSearchParams({ q: term.trim(), relation });
    if (before) params.set("before", String(before));
    const timer = window.setTimeout(() => {
      req<Page>("/graph?" + params, { signal: controller.signal }).then(result => {
        if (!controller.signal.aborted) setPage(result);
      }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    }, 150);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [term, before, attempt, relation]);
  const connected = page?.connections.filter(edge => edge.origin.key === selected?.key || edge.destination.key === selected?.key);
  const nodes = new Map<string, GraphNode>();
  for (const edge of page?.connections ?? []) {
    nodes.set(edge.origin.key, edge.origin);
    nodes.set(edge.destination.key, edge.destination);
  }
  function node(item: GraphNode) {
    return <button className="min-w-0 flex-1 break-words rounded-xl border border-line bg-raised p-3 text-left"
      aria-pressed={selected?.key === item.key} onClick={() => setSelected(item)}>
      <small className="block text-mute">{item.kind}</small>{item.title}</button>;
  }
  return <section className="mx-auto max-w-5xl space-y-4">
    <h1 className="text-3xl font-semibold">Neural Map</h1>
    <label className="block">Relazione<select className={field} value={relation}
      onChange={e => { setRelation(e.target.value); setHistory([]); }}>
      <option value="inbox">Conversioni Inbox</option><option value="project-blocks">Blocchi di calendario e progetti</option>
    </select></label>
    <label className="block">Cerca nei titoli<input className={field} maxLength={100} value={term}
      onChange={e => { setTerm(e.target.value); setHistory([]); }}/></label>
    {error && <p role="alert">{error} <button className={btn} onClick={() => setAttempt(n => n+1)}>Riprova</button></p>}
    {!error && !page && <p role="status">Caricamento collegamenti…</p>}
    {page && !page.connections.length && <p>{term ? "Nessun collegamento corrispondente." : relation === "inbox" ? "Nessuna conversione Inbox collegata." : "Nessun blocco di calendario collegato a un progetto."}</p>}
    {!!page?.connections.length && <>
      <div role="group" aria-label="Vista della mappa" className="flex gap-2">
        <button className={btn} aria-pressed={view==="edges"} onClick={()=>setView("edges")}>Collegamenti</button>
        <button className={btn} aria-pressed={view==="nodes"} onClick={()=>setView("nodes")}>Per nodo</button>
      </div>
      <div className="flex items-center gap-2"><button className={btn} aria-label="Riduci zoom" disabled={zoom <= 0.75} onClick={() => setZoom(z => z-.25)}>−</button>
        <span>{zoom*100}%</span><button className={btn} aria-label="Aumenta zoom" disabled={zoom >= 2} onClick={() => setZoom(z => z+.25)}>+</button></div>
      <div tabIndex={0} aria-label="Mappa dei collegamenti" className="max-h-96 overflow-auto rounded-xl border border-line bg-panel p-3">
        <ul className="space-y-3" style={{width: (zoom*100)+"%", minWidth: (20*zoom)+"rem", fontSize: zoom+"rem"}}>
          {view==="nodes" ? Array.from(nodes.values(), item => <li key={item.key} className="flex">{node(item)}</li>) : page.connections.map(({origin,destination}) => <li key={origin.key+destination.key} className="flex items-center gap-2">
            {node(origin)}<span aria-label={relation === "inbox" ? "Convertito in" : "Pianificato per"} className="text-accent">→</span>{node(destination)}
          </li>)}
        </ul>
      </div></>}
    {selected && <aside className={panel}><h2 className="font-semibold">{selected.title}</h2>
      <Link className="text-accent" to={selected.path}>Apri in {selected.kind}</Link>
      <p>{connected?.length === 1 ? "1 collegamento" : (connected?.length ?? 0) + " collegamenti"} in questa pagina</p>
      {connected?.map(({origin,destination}) => <p key={origin.key+destination.key}>{origin.title} → {destination.title}</p>)}</aside>}
    <div className="flex gap-2">{history.length > 0 && <button className={btn} onClick={() => setHistory(h => h.slice(0,-1))}>Precedenti</button>}
      {page?.next_before && <button className={btn} onClick={() => setHistory(h => [...h,page.next_before!])}>Altri collegamenti</button>}</div>
  </section>;
}

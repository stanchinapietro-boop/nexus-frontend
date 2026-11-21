import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { buttonClass, inputClass, default as InboxForm } from "../InboxForm";
import { inboxApi, kindLabels, onInboxChange, statusLabels, type InboxItem, type InboxKind, type InboxStatus } from "../inboxApi";
import { openQuickCapture } from "../QuickCapture";

const actions = buttonClass + " min-h-10";
const normal = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("it");

function summaryTime(value: string) {
  const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : value + "Z");
  return Number.isFinite(date.getTime()) ? date.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }) : value;
}

type CardProps = { item: InboxItem; onMessage: (message: string) => void };

function InboxCard({ item, onMessage }: CardProps) {
  const [eventTime, setEventTime] = useState("");
  const [schedule, setSchedule] = useState(false);
  const [edit, setEdit] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);

  async function act(action: () => Promise<unknown>, success: string) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError("");
    try { await action(); onMessage(success); }
    catch (err) {
      setError(err instanceof Error && err.message.includes("422")
        ? "I dati superano i limiti della destinazione. Per Academic usa un titolo entro 160 caratteri e un testo entro 1000. Per un evento i limiti sono 180 e 4000."
        : "Operazione non confermata. Ricarica l’elenco per verificare lo stato.");
    }
    finally { lock.current = false; setPending(false); }
  }

  return <article aria-label={item.title} className="min-w-0 space-y-3 rounded-xl border border-line bg-panel p-4">
    {edit ? <InboxForm item={item} onCancel={() => setEdit(false)} onSave={async values => {
      await inboxApi.update(item.id, values); setEdit(false); onMessage("Modifiche salvate.");
    }} /> : <>
      <header><p className="text-xs text-mute">{kindLabels[item.kind]} · {statusLabels[item.status]}</p>
        <h2 className="mt-1 break-words text-lg font-semibold">{item.title}</h2></header>
      {item.content && item.content !== item.title && <p className="whitespace-pre-wrap break-words text-sm">{item.content}</p>}
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-mute">
        <div><dt className="inline">Creato il </dt><dd className="inline"><time dateTime={item.created_at}>{summaryTime(item.created_at)}</time></dd></div>
        <div><dt className="inline">Fonte · </dt><dd className="inline">{item.source === "quick_capture" ? "Acquisizione rapida" : item.source}</dd></div>
        {item.due_date && <div><dt className="inline">Data · </dt><dd className="inline">{new Date(item.due_date + "T12:00:00").toLocaleDateString("it-IT")}</dd></div>}
        {item.destination && <div className="break-words"><dt className="inline">Destinazione prevista · </dt><dd className="inline">{item.destination}</dd></div>}
      </dl>
      {item.tags.length > 0 && <ul aria-label="Tag" className="flex flex-wrap gap-1">{item.tags.map(tag =>
        <li key={tag} className="max-w-full break-words rounded bg-raised px-2 py-1 text-xs">{tag}</li>)}</ul>}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm"><span className="sr-only">Stato di {item.title}</span>
          <select className={actions + " bg-panel"} value={item.status} disabled={pending} onChange={event => {
            const status = event.target.value as InboxStatus;
            void act(() => inboxApi.update(item.id, { status }), "Stato aggiornato.");
          }}>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        </label>
        <button className={actions} disabled={pending} onClick={() => { setError(""); setEdit(true); }}>Modifica</button>
        {item.note_id != null ? <Link className={actions + " text-accent"} to={"/knowledge?nota=" + item.note_id}>Apri nota</Link>
          : item.project_id ? <Link className={actions} to={"/projects?id=" + item.project_id}>Apri progetto</Link>
          : item.task_id ? <Link className={actions} to="/academic?sezione=agenda">Apri attività scolastiche</Link>
          : item.event_id ? <Link className={actions} to={"/calendar?evento=" + item.event_id}>Apri evento</Link>
          : item.converted_at ? <span className="text-xs text-mute">La destinazione collegata è stata eliminata.</span>
          : <button className={actions} disabled={pending} onClick={() => void act(() => inboxApi.toNote(item.id), "Nota creata in Second Brain.")}>Converti in nota</button>}
        {!item.converted_at && <details><summary className="cursor-pointer rounded-lg border border-line px-3 py-2 text-sm">Altre destinazioni</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className={actions} disabled={pending} onClick={() => void act(() => inboxApi.convert(item.id, "task"), "Attività creata in Academic.")}>Crea attività scolastica</button>
            <button className={actions} disabled={pending} onClick={() => void act(() => inboxApi.convert(item.id, "project"), "Progetto creato.")}>Crea progetto</button>
            <button className={actions} disabled={pending} onClick={() => setSchedule(!schedule)}>Pianifica evento</button>
          </div>
          {schedule && <form className="mt-3 space-y-2" onSubmit={e=>{e.preventDefault(); if(eventTime) void act(()=>inboxApi.convert(item.id,"event",new Date(eventTime).toISOString()),"Evento creato.");}}>
            <label className="block">Inizio evento<input required type="datetime-local" className={inputClass} value={eventTime} onChange={e=>setEventTime(e.target.value)}/></label>
            <button className={actions} disabled={pending || !eventTime}>Crea evento</button></form>}
        </details>}
        <button className={actions + " text-red-300"} disabled={pending} onClick={() => {
          if (window.confirm("Eliminare dall’Inbox «" + item.title + "»?")) void act(() => inboxApi.remove(item.id), "Elemento eliminato dall’Inbox.");
        }}>Elimina</button>
      </div>
    </>}
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
  </article>;
}

export default function Inbox() {
  const [params, setParams] = useSearchParams();
  const selected = params.get("id");
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"active" | "all" | InboxStatus>("active");
  const [kind, setKind] = useState<InboxKind | "all">("all");
  const [tag, setTag] = useState("");
  const [message, setMessage] = useState("");
  const refresh = () => setAttempt(n => n + 1);
  useEffect(() => onInboxChange(refresh), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    inboxApi.list().then(rows => { if (active) setItems(rows); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  const words = normal(query.trim()).split(/\s+/).filter(Boolean);
  const tags = [...new Set(items.flatMap(item => item.tags))].sort((a, b) => a.localeCompare(b, "it"));
  const visible = items.filter(item => {
    if (selected) return String(item.id) === selected;
    if (state === "active" && item.status !== "new" && item.status !== "processing") return false;
    if (state !== "active" && state !== "all" && state !== item.status) return false;
    if (kind !== "all" && kind !== item.kind) return false;
    if (tag && !item.tags.includes(tag)) return false;
    const haystack = normal([item.title, item.content, ...item.tags, kindLabels[item.kind], item.destination || ""].join(" "));
    return words.every(word => haystack.includes(word));
  });

  return <section className="mx-auto max-w-4xl space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-semibold">Inbox</h1>
      <div className="flex flex-wrap gap-2"><button className={buttonClass} onClick={refresh} disabled={loading}>Ricarica</button>
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black" onClick={openQuickCapture}>Nuova acquisizione</button></div>
    </header>
    {selected ? <button className={actions} onClick={() => { setParams({}); setState("all"); setKind("all"); setTag(""); setQuery(""); }}>Tutta l’Inbox</button>
      : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">Cerca in Inbox<input type="search" className={inputClass} value={query} onChange={e => setQuery(e.target.value)} /></label>
        <label className="text-sm">Stato<select className={inputClass} value={state} onChange={e => setState(e.target.value as typeof state)}>
          <option value="active">Da organizzare</option><option value="all">Tutti gli stati</option>
          {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-sm">Tipo<select className={inputClass} value={kind} onChange={e => setKind(e.target.value as typeof kind)}>
          <option value="all">Tutti i tipi</option>{Object.entries(kindLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-sm">Tag<select className={inputClass} value={tag} onChange={e => setTag(e.target.value)}>
          <option value="">Tutti i tag</option>{(tag && !tags.includes(tag) ? [...tags, tag] : tags).map(value => <option key={value}>{value}</option>)}</select></label>
      </div>}
    {message && <p role="status" className="text-sm text-accent">{message}</p>}
    {error && <p role="alert">Aggiornamento dell’Inbox non riuscito. <button className="text-accent" onClick={refresh}>Riprova</button></p>}
    {loading && <p role="status" className="text-sm text-mute">Caricamento…</p>}
    {!loading && !error && !visible.length && <p className="rounded-xl border border-line p-4 text-mute">{selected ? "Elemento non disponibile." : !items.length ? "La tua Inbox è vuota." : "Nessun elemento corrisponde ai filtri."}</p>}
    {visible.map(item => <InboxCard key={item.id} item={item} onMessage={setMessage} />)}
  </section>;
}

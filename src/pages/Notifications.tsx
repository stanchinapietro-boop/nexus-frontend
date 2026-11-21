import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { noticeCategories, notifications, notifyChanged, type Notice, type NoticeCategory } from "../notifications";

const button = "rounded-lg border border-line px-3 py-2 text-sm hover:bg-raised disabled:opacity-50";
const select = "mt-1 block w-full rounded-lg border border-line bg-panel px-3 py-2";
const pageSize = 40;

export default function Notifications() {
  const [category, setCategory] = useState<NoticeCategory | "">("");
  const [readFilter, setReadFilter] = useState("");
  const [cursor, setCursor] = useState<number[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [rows, setRows] = useState<Notice[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const before = cursor[cursor.length - 1];
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    const params = new URLSearchParams({ limit: String(pageSize + 1) });
    if (category) params.set("category", category);
    if (readFilter) params.set("unread", readFilter);
    if (before !== undefined) params.set("before", String(before));
    notifications.list(params).then(items => {
      if (!active) return;
      // Una mutazione può rimuovere l'ultima riga della pagina filtrata.
      if (!items.length && before !== undefined) {
        setCursor(previous => previous.slice(0, -1));
        return;
      }
      setRows(items.slice(0, pageSize));
      setHasMore(items.length > pageSize);
    }).catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [category, readFilter, before, attempt]);

  async function change(action: () => Promise<unknown>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setActionError("");
    try {
      await action();
      notifyChanged();
      setAttempt(v => v + 1);
    } catch {
      setActionError("Modifica non confermata. Aggiorna l’elenco per verificarla.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return <section className="mx-auto max-w-3xl space-y-4">
    <header className="flex flex-wrap items-baseline justify-between gap-3">
      <h1 className="text-3xl font-semibold">Notifiche</h1>
      <button className={button} disabled={busy} onClick={() => setAttempt(v => v + 1)}>Aggiorna</button>
    </header>
    <div className="flex flex-wrap items-end gap-3">
      <label>Categoria<select className={select} value={category} onChange={e => {
        setCursor([]); setCategory(e.target.value as NoticeCategory | "");
      }}><option value="">Tutte le categorie</option>
        {Object.entries(noticeCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label>Stato<select className={select} value={readFilter} onChange={e => {
        setCursor([]); setReadFilter(e.target.value);
      }}><option value="">Tutti gli stati</option><option value="true">Da leggere</option><option value="false">Lette</option></select></label>
      <button className={button} disabled={busy || loading || loadError || !rows.length}
        onClick={() => void change(notifications.readAll)}>Segna tutte le notifiche come lette</button>
    </div>
    {actionError && <p role="alert">{actionError}</p>}
    {loading ? <p role="status">Caricamento…</p>
      : loadError ? <p role="alert">Impossibile caricare le notifiche. <button className="text-accent" onClick={() => setAttempt(v => v + 1)}>Riprova</button></p>
      : !rows.length ? <p className="text-mute">{category || readFilter ? "Nessuna notifica corrisponde ai filtri." : "Nessuna notifica ricevuta."}</p>
      : <ul className="space-y-2">{rows.map(row => <li key={row.id} className="rounded-xl border border-line bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-mute">
          <span>{noticeCategories[row.category]} · {row.read_at ? "Letta" : "Da leggere"}</span>
          <time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}</time>
        </div>
        <h2 className="mt-2 break-words font-medium">{row.title}</h2>
        <p className="break-words text-sm text-mute">{row.message}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {row.note_id !== null && <Link to={"/knowledge?nota=" + row.note_id} className="rounded-lg px-2 py-2 text-sm text-accent">Apri nota</Link>}
          <button className={button} disabled={busy} onClick={() => void change(() => notifications.setRead(row.id, !row.read_at))}>
            {row.read_at ? "Segna da leggere" : "Segna come letta"}</button>
          <button className={button} disabled={busy} onClick={() => {
            if (window.confirm("Eliminare questa notifica?")) void change(() => notifications.remove(row.id));
          }}>Elimina</button>
        </div>
      </li>)}</ul>}
    {!loading && !loadError && (cursor.length > 0 || hasMore) && <div className="flex gap-2">
      {cursor.length > 0 && <button className={button} onClick={() => setCursor(c => c.slice(0, -1))}>Precedenti</button>}
      {hasMore && <button className={button} onClick={() => setCursor(c => [...c, rows[rows.length - 1].id])}>Successive</button>}
    </div>}
  </section>;
}

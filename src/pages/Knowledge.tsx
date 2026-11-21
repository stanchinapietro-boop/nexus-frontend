import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { api, type Note } from "../api";

type Draft = { id?: number; title: string; content: string };
const field = "mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-base";
const button = "rounded-lg border border-line px-3 py-2 hover:bg-raised";

export default function Knowledge() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("nota");
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api.listNotes().then(rows => { if (active) setNotes(rows); })
      .catch(() => { if (active) setError("Impossibile caricare le note."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => {
    if (params.get("nuova") === "1") {
      setDraft({ title: "", content: "" });
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || busy || !draft.title.trim()) return;
    setBusy(true);
    setError("");
    try {
      const title = draft.title.trim();
      const saved = draft.id === undefined
        ? await api.createNote(title, draft.content)
        : await api.updateNote(draft.id, title, draft.content);
      setNotes(rows => draft.id === undefined ? [saved, ...rows] : rows.map(row => row.id === saved.id ? saved : row));
      setQuery("");
      setParams({}, { replace: true });
      setDraft(null);
    } catch { setError("Salvataggio non riuscito. Il testo è ancora nel modulo."); }
    finally { setBusy(false); }
  }

  async function remove(note: Note) {
    if (busy || !window.confirm('Eliminare la nota «' + note.title + '»?')) return;
    setBusy(true);
    setError("");
    try {
      await api.deleteNote(note.id);
      setNotes(rows => rows.filter(row => row.id !== note.id));
      if (selectedId) setParams({}, { replace: true });
    } catch { setError("Eliminazione non riuscita. Riprova."); }
    finally { setBusy(false); }
  }

  const term = query.trim().toLocaleLowerCase("it");
  const visible = notes.filter(note => (!selectedId || selectedId === String(note.id)) && (note.title + " " + note.content).toLocaleLowerCase("it").includes(term));
  return <section className="mx-auto max-w-3xl space-y-5">
    <header className="flex items-center justify-between gap-3">
      <h1 className="text-3xl font-semibold">Second Brain</h1>
      {!draft && !loading && <button className={button} disabled={busy} onClick={() => setDraft({ title: "", content: "" })}>Nuova nota</button>}
    </header>
    {error && <p role="alert" className="text-red-400">{error} {!draft && <button className="underline" onClick={() => setAttempt(n => n + 1)}>Ricarica</button>}</p>}
    {draft ? <form onSubmit={save} className="space-y-4 rounded-xl border border-line bg-panel p-4">
      <label className="block">Titolo<input autoFocus required maxLength={200} className={field} value={draft.title} disabled={busy}
        onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
      <label className="block">Testo<textarea rows={8} className={field} value={draft.content} disabled={busy}
        onChange={e => setDraft({ ...draft, content: e.target.value })} /></label>
      <div className="flex gap-3"><button disabled={busy || !draft.title.trim()} className="rounded-lg bg-accent px-4 py-2 font-medium text-black disabled:opacity-50">Salva</button>
        <button type="button" className={button} disabled={busy} onClick={() => { setDraft(null); setError(""); }}>Annulla</button></div>
    </form> : loading ? <p role="status">Caricamento…</p> : <>
      {selectedId && <button className={button} onClick={() => { setParams({}); setQuery(""); }}>Tutte le note</button>}
      <label className="block">Cerca nelle note<input type="search" className={field} value={query} onChange={e => setQuery(e.target.value)} /></label>
      {!visible.length && !error && <p className="text-mute">{selectedId && !notes.some(n => String(n.id) === selectedId) ? "Questa nota non è disponibile." : notes.length ? "Nessuna nota corrisponde alla ricerca." : "Non hai ancora salvato note."}</p>}
      {visible.map(note => <article key={note.id} className="space-y-3 rounded-xl border border-line bg-panel p-4">
        <h2 className="break-words text-lg font-semibold">{note.title}</h2>
        <p className="whitespace-pre-wrap break-words">{note.content}</p>
        <div className="flex gap-3"><button disabled={busy} className={button} onClick={() => { setError(""); setDraft({ id: note.id, title: note.title, content: note.content }); }}>Modifica</button>
          <button disabled={busy} className={button} onClick={() => remove(note)}>Elimina</button></div>
      </article>)}
    </>}
  </section>;
}

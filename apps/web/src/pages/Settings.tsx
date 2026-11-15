import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { api, type Note } from "../api";

export default function SettingsPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const load = () =>
    api.listNotes().then(setNotes).catch(() => setError("Backend non raggiungibile. Avvia le API."));
  useEffect(() => { load(); }, []);

  async function add() {
    if (!title.trim()) return;
    try {
      await api.createNote(title.trim(), content);
      setTitle(""); setContent(""); setError("");
      load();
    } catch { setError("Salvataggio non riuscito."); }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Impostazioni</h1>

      <section className="mt-6 rounded-xl border border-line bg-panel p-4">
        <h2 className="font-medium">Test database</h2>
        <p className="mt-1 text-sm text-mute">Salva una nota e controlla che resti dopo il riavvio.</p>
        <input
          value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo"
          className="mt-3 w-full rounded-lg border border-line bg-ink px-3 py-2 text-base"
        />
        <textarea
          value={content} onChange={(e) => setContent(e.target.value)} placeholder="Testo (facoltativo)" rows={3}
          className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-2 text-base"
        />
        <button onClick={add} className="mt-2 rounded-lg bg-accent px-4 py-2 font-medium text-black">
          Salva nota
        </button>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </section>

      <ul className="mt-4 grid gap-2">
        {notes.map((n) => (
          <li key={n.id} className="flex items-start justify-between gap-3 rounded-lg border border-line bg-panel p-3">
            <div className="min-w-0">
              <div className="font-medium">{n.title}</div>
              {n.content && <div className="whitespace-pre-wrap text-sm text-mute">{n.content}</div>}
            </div>
            <button
              aria-label="Elimina nota"
              onClick={() => api.deleteNote(n.id).then(load)}
              className="text-mute hover:text-red-400"
            >
              <Trash2 size={18} />
            </button>
          </li>
        ))}
        {notes.length === 0 && !error && <li className="text-sm text-mute">Nessuna nota salvata.</li>}
      </ul>
    </div>
  );
}

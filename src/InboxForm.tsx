import { useRef, useState, type FormEvent } from "react";
import { kindLabels, type InboxFields, type InboxItem, type InboxKind } from "./inboxApi";

export const inputClass = "mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-base";
export const buttonClass = "rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-raised disabled:opacity-50";
const submitClass = "rounded-lg bg-accent px-4 py-2 font-semibold text-black disabled:opacity-50";

function requestId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, n => n.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

type Props = {
  item?: InboxItem;
  onSave: (values: InboxFields, token: string) => Promise<void>;
  onCancel: () => void;
  onBusy?: (busy: boolean) => void;
};

export default function InboxForm({ item, onSave, onCancel, onBusy }: Props) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [content, setContent] = useState(item?.content ?? "");
  const [kind, setKind] = useState<InboxKind | "">(item?.kind ?? "");
  const [tagText, setTagText] = useState(item?.tags.join(", ") ?? "");
  const [date, setDate] = useState(item?.due_date ?? "");
  const [destination, setDestination] = useState(item?.destination ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const lastRequest = useRef({ payload: "", token: "" });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending.current) return;
    const body = content.trim();
    const finalTitle = title.trim() || Array.from(body.split(/\r?\n/, 1)[0]).slice(0, 200).join("");
    if (!finalTitle || (!item && !body)) { setError("Scrivi il contenuto da raccogliere."); return; }
    const tags = [...new Set(tagText.split(",").map(tag => tag.trim()).filter(Boolean))];
    if (tags.length > 20 || tags.some(tag => Array.from(tag).length > 48)) {
      setError("Usa al massimo 20 tag di massimo 48 caratteri ciascuno.");
      return;
    }
    const values: InboxFields = { title: finalTitle, content: body, kind: kind || "other", tags, due_date: date || null, destination: destination.trim() || null };
    sending.current = true;
    setBusy(true);
    onBusy?.(true);
    setError("");
    try {
      const payload = JSON.stringify(values);
      if (lastRequest.current.payload !== payload) lastRequest.current = { payload, token: requestId() };
      await onSave(values, lastRequest.current.token);
    } catch (ex) {
      const reason = ex instanceof Error && /^Errore \d{3}$/.test(ex.message) ? " (" + ex.message + ")" : "";
      setError("Salvataggio non confermato" + reason + ". Puoi riprovare mantenendo questi campi.");
    } finally {
      sending.current = false;
      setBusy(false);
      onBusy?.(false);
    }
  }

  return <form onSubmit={submit} className="space-y-4">
    <fieldset disabled={busy} className="space-y-3">
      {item && <label className="block">Titolo<input className={inputClass} required autoFocus maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label>}
      <label className="block">Contenuto<textarea className={inputClass} autoFocus={!item} required={!item} rows={4} maxLength={20000}
        value={content} onChange={e => setContent(e.target.value)} placeholder="Cosa vuoi ricordare?" /></label>
      <details open={item ? true : undefined}><summary className="cursor-pointer py-1 text-sm font-medium text-accent">Dettagli facoltativi</summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <label className="block">Tipo<select className={inputClass} value={kind} onChange={e => setKind(e.target.value as InboxKind | "")}>
            <option value="">Da classificare</option>{Object.entries(kindLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
          <label className="block">Data<input className={inputClass} type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
          <label className="block">Tag <span className="text-xs text-mute">(separati da virgole)</span><input className={inputClass} value={tagText} onChange={e => setTagText(e.target.value)} /></label>
          <label className="block">Destinazione prevista<input className={inputClass} value={destination} maxLength={80} onChange={e => setDestination(e.target.value)} /></label>
        </div>
      </details>
    </fieldset>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button className={submitClass} disabled={busy || (!item && !content.trim())}>{busy ? "Salvataggio…" : item ? "Salva modifiche" : "Salva in Inbox"}</button>
      <button type="button" className={buttonClass} disabled={busy} onClick={onCancel}>Annulla</button>
    </div>
  </form>;
}

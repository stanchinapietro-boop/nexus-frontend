import { useEffect, useRef, useState } from "react";
import { ArrowRight, Clock3, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NAV } from "./nav";
import { setPrefs, usePrefs } from "./prefs";
import { openQuickCapture } from "./QuickCapture";

type Command = { id: string; label: string; path?: string; hint?: string };
const commands: Command[] = [
  { id: "capture", label: "Acquisizione rapida", hint: "Ctrl/⌘ Alt I" },
  { id: "plan-day", label: "Pianifica la giornata", path: "/life?tab=oggi" },
  { id: "plan-week", label: "Pianifica la settimana e apri la revisione", path: "/life?tab=settimana" },
  { id: "plan-focus", label: "Avvia una sessione focus", path: "/life?tab=focus" },
  { id: "plan-matrix", label: "Apri matrice di Eisenhower", path: "/life?tab=matrice" },
  { id: "plan-goal", label: "Crea obiettivo personale", path: "/life?tab=obiettivi" },
  { id: "plan-habit", label: "Crea abitudine", path: "/life?tab=abitudini" },
  { id: "new-project", label: "Nuovo progetto", path: "/projects?nuovo=1" },
  { id: "new-event", label: "Nuovo evento", path: "/calendar?nuovo=1" },
  { id: "new-task", label: "Nuova attività scolastica", path: "/academic?sezione=agenda" },
  { id: "new-note", label: "Nuova nota", path: "/knowledge?nuova=1" },
  { id: "new-transaction", label: "Nuova transazione", path: "/finance?nuova=1" },
  ...NAV.map(item => ({ id: item.path, label: "Apri " + item.label, path: item.path, hint: item.ready ? undefined : "In programma" })),
];
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("it");

export default function CommandPalette({ onDismiss }: { onDismiss: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const { recentCommands } = usePrefs();
  const navigate = useNavigate();
  const clean = query.trim();
  const available = commands.filter(cmd => normalize(cmd.label).includes(normalize(clean)));
  const recent = clean ? [] : recentCommands.flatMap(id => available.filter(cmd => cmd.id === id));
  const results: Command[] = [...recent, ...available.filter(cmd => !recent.includes(cmd))];
  if (clean) results.push({ id: "global-search", label: "Cerca «" + clean + "» in NEXUS", path: "/search?q=" + encodeURIComponent(clean) });
  const index = Math.min(selected, results.length - 1);

  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    return () => node.close();
  }, []);
  useEffect(() => { document.getElementById("cmd-" + index)?.scrollIntoView?.({ block: "nearest" }); }, [index]);
  function run(cmd: Command) {
    if (cmd.id !== "global-search") setPrefs({ recentCommands: [cmd.id, ...recentCommands.filter(id => id !== cmd.id)].slice(0, 5) });
    dialog.current?.close();
    onDismiss();
    if (cmd.id === "capture") openQuickCapture();
    else if (cmd.path) navigate(cmd.path);
  }
  return <dialog ref={dialog} aria-labelledby="palette-title" onCancel={onDismiss}
    onClick={event => { if (event.target === dialog.current) onDismiss(); }}
    className="m-auto w-[min(92vw,38rem)] max-w-none overflow-visible rounded-2xl border border-line bg-panel p-0 text-white shadow-2xl backdrop:bg-black/70">
    <div className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3"><h2 id="palette-title" className="font-semibold">Comandi rapidi</h2>
        <button type="button" aria-label="Chiudi comandi rapidi" onClick={onDismiss} className="grid h-10 w-10 place-items-center rounded-lg text-mute hover:bg-raised"><X size={18}/></button></div>
      <label className="flex items-center gap-2 rounded-lg border border-line bg-ink px-3 focus-within:border-accent"><Search size={18} className="shrink-0 text-mute" />
        <input autoFocus role="combobox" aria-label="Cerca un comando o un contenuto" aria-expanded="true" aria-controls="palette-list"
          aria-autocomplete="list" aria-activedescendant={"cmd-" + index} placeholder="Cerca un comando o un contenuto…"
          className="min-w-0 flex-1 bg-transparent py-3 outline-none" value={query}
          onChange={e => { setQuery(e.target.value); setSelected(0); }}
          onKeyDown={e => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setSelected((index + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length);
            } else if (e.key === "Enter" && results[index]) { e.preventDefault(); run(results[index]); }
          }} /></label>
      <ul id="palette-list" role="listbox" aria-label="Comandi" className="mt-2 max-h-[min(48dvh,24rem)] overflow-y-auto">
        {results.map((cmd, i) => <li role="option" aria-selected={i === index} id={"cmd-" + i} key={cmd.id}
          onMouseEnter={() => setSelected(i)} onMouseDown={e => e.preventDefault()} onClick={() => run(cmd)}
          className={"flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm " + (i === index ? "bg-accent/15 text-accent" : "text-mute")}>
          {recent.includes(cmd) ? <Clock3 aria-label="Recente" size={15}/> : <ArrowRight aria-hidden="true" size={15}/>}
          <span className="min-w-0 flex-1 break-words">{cmd.label}</span>
          {cmd.hint && <small>{cmd.hint}</small>}
        </li>)}
      </ul>
    </div>
  </dialog>;
}

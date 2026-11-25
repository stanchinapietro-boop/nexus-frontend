import { newProfileId } from "./configuration";
import { useState } from "react";
import { appearance, defaultAppearance, setPrefs, usePrefs, type Workspace } from "./prefs";

const control = "min-h-11 rounded-lg border border-line bg-ink px-3 py-2";
export default function WorkspaceSettings() {
  const prefs = usePrefs();
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState(false);
  const active = prefs.profiles.find(row => row.id === prefs.activeProfile)!;
  const label = name.trim();
  const full = prefs.profiles.length >= 24;
  function activate(next: Workspace, profiles = prefs.profiles) {
    const saved = profiles.map(row => row.id === active.id ? { ...row, appearance: appearance(prefs) } : row);
    setPrefs({ profiles: saved, activeProfile: next.id, ...next.appearance });
    setName("");
    setConfirm(false);
  }
  function create(duplicate: boolean) {
    if (!label || full) return;
    const next = { id: newProfileId(), name: label, appearance: duplicate ? appearance(prefs) : defaultAppearance };
    activate(next, [...prefs.profiles, next]);
  }
  function remove() {
    const remaining = prefs.profiles.filter(row => row.id !== active.id);
    if (remaining.length) activate(remaining[0], remaining);
  }
  return <div className="space-y-3">
    <label className="block">Workspace attivo<select className={control + " block w-full"} value={active.id}
      onChange={e => { const next = prefs.profiles.find(row => row.id === e.target.value); if (next) activate(next); }}>
      {prefs.profiles.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
    <p className="text-sm text-mute">Ogni workspace conserva tema, navigazione, preferiti e layout della dashboard. I record personali sono condivisi.</p>
    <label className="block">Nome workspace<input className={control + " block w-full"} maxLength={60} value={name} onChange={e => setName(e.target.value)} /></label>
    <div className="flex flex-wrap gap-2">
      <button className={control} disabled={!label || full} onClick={() => create(false)}>Crea</button>
      <button className={control} disabled={!label || full} onClick={() => create(true)}>Duplica</button>
      <button className={control} disabled={!label} onClick={() => {
        setPrefs({ activeProfile: active.id, profiles: prefs.profiles.map(row => row.id === active.id ? { ...row, name: label } : row) }); setName("");
      }}>Rinomina</button>
      <button className={control} disabled={prefs.profiles.length === 1} onClick={() => setConfirm(true)}>Elimina workspace</button>
    </div>
    {confirm && <div className="space-y-2"><p>Eliminare la configurazione di {active.name}?</p>
      <button className={control} onClick={remove}>Conferma eliminazione</button>{" "}
      <button className={control} onClick={() => setConfirm(false)}>Annulla</button></div>}
  </div>;
}

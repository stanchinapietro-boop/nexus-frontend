import { newProfileId } from "./configuration";
import { useState } from "react";
import { appearance, defaultAppearance, defaultWidgets, setPrefs, usePrefs, widgetNames, workspacePatch, type WidgetId, type Workspace } from "./prefs";

const control = "min-h-11 rounded-lg border border-line bg-ink px-3 py-2";
const presets: {name:string; widgets:WidgetId[]; wide:WidgetId[]}[] = [
  {name:"Minimal", widgets:["focus","capture","notes"], wide:["focus"]},
  {name:"Command Center", widgets:defaultWidgets, wide:["history"]},
  {name:"Produttività", widgets:["tasks","focus","upcoming","capture","history"], wide:["focus"]},
  {name:"AI Workspace", widgets:["ai","projects","notes","capture"], wide:["ai"]},
  {name:"Finanza", widgets:["modules","capture","upcoming"], wide:["modules"]},
  {name:"Accademico", widgets:["school","insights","focus","notes"], wide:["school"]},
  {name:"Ingegneria", widgets:["projects","notes","upcoming","tasks"], wide:["projects"]},
  {name:"Cinematico", widgets:["chart","upcoming","history"], wide:["chart","upcoming","history"]},
];
export default function WorkspaceSettings() {
  const prefs = usePrefs();
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [presetName,setPresetName] = useState(presets[0].name);
  const preset = presets.find(row=>row.name===presetName)!;
  const active = prefs.profiles.find(row => row.id === prefs.activeProfile)!;
  const label = name.trim();
  const full = prefs.profiles.length >= 24;
  function activate(next: Workspace, profiles = prefs.profiles) {
    setPrefs(workspacePatch(prefs,next,profiles));
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
    <details className="rounded-xl border border-line bg-panel p-4"><summary className="cursor-pointer font-medium">Preset dashboard</summary>
      <label className="mt-3 block">Anteprima preset<select className={control+" ml-2"} value={presetName} onChange={e=>setPresetName(e.target.value)}>
        {presets.map(row=><option key={row.name}>{row.name}</option>)}</select></label>
      <ul aria-label="Anteprima disposizione widget" className="my-3 grid grid-cols-2 gap-2">
        {preset.widgets.map(key=><li key={key} className={"rounded-lg border border-line bg-raised p-2 text-sm "+(preset.wide.includes(key)?"col-span-2":"")}>{widgetNames[key]}</li>)}</ul>
      <button className={control} disabled={full} onClick={()=>{
        const next = {id:newProfileId(), name:label || preset.name, appearance:{...appearance(prefs),
          dashboardOrder:[...preset.widgets,...defaultWidgets.filter(id=>!preset.widgets.includes(id))],
          dashboardHidden:defaultWidgets.filter(id=>!preset.widgets.includes(id)), dashboardWide:[...preset.wide], dashboardSizes:{}}};
        activate(next,[...prefs.profiles,next]);
      }}>Crea workspace da preset</button>
      {full && <p className="text-sm text-mute">Limite di 24 workspace raggiunto.</p>}
    </details>
    {confirm && <div className="space-y-2"><p>Eliminare la configurazione di {active.name}?</p>
      <button className={control} onClick={remove}>Conferma eliminazione</button>{" "}
      <button className={control} onClick={() => setConfirm(false)}>Annulla</button></div>}
  </div>;
}

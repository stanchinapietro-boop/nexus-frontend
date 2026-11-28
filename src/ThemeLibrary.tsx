import { useState } from "react";
import { setPrefs, usePrefs } from "./prefs";
import { colorNames, palette, validSavedTheme, type Colors, type SavedTheme } from "./themes";

const button = "min-h-10 rounded-lg border border-line px-3 disabled:opacity-40";
export default function ThemeLibrary() {
  const prefs = usePrefs();
  const [key, chooseKey] = useState<keyof Colors>("ink");
  const [selected, chooseTheme] = useState("");
  const [name, setName] = useState("");
  const [hex, setHex] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [incoming, setIncoming] = useState<SavedTheme | null>(null);
  const colors = { ...palette(prefs.theme), ...prefs.colors };
  const label = name.trim();
  const exists = prefs.savedThemes.some(row => row.name === label);
  const saved = prefs.savedThemes.find(row => row.name === selected);
  const canAdd = !!label && !exists && prefs.savedThemes.length < 24;
  function edit(value: string) {
    setHex(value);
    if (/^#[0-9a-f]{6}$/i.test(value)) {
      const color=value.toLowerCase();
      setPrefs({colors:{...prefs.colors,[key]:color},recentColors:[color,...prefs.recentColors.filter(v=>v!==color)].slice(0,8)}); setHex(null);
    }
  }
  function current(title: string): SavedTheme {
    return {name:title,theme:prefs.theme,accent:prefs.accent,colors:prefs.colors};
  }
  function activate(t: SavedTheme) {
    setPrefs({theme:t.theme,accent:t.accent,colors:t.colors}); chooseTheme(t.name); setName(t.name); setHex(null);
  }
  function append(t: SavedTheme) {
    setPrefs({savedThemes:[...prefs.savedThemes,t],theme:t.theme,accent:t.accent,colors:t.colors});
    chooseTheme(t.name); setName(t.name); setIncoming(null); setHex(null);
  }
  function download() {
    const blob = new Blob([JSON.stringify({format:"nexus.theme.v1",theme:current(label || "NEXUS")},null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="nexus-theme.json"; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  function duplicate() {
    if (!saved || prefs.savedThemes.length >= 24) return;
    let n = 1;
    let title: string;
    do {
      const suffix = n === 1 ? " (copia)" : " (copia " + n + ")";
      title = saved.name.slice(0, 60 - suffix.length).trimEnd() + suffix;
      n++;
    } while (prefs.savedThemes.some(t => t.name === title));
    append({...saved, name:title, colors:{...saved.colors}});
  }
  return <div className="space-y-4">
    {!!prefs.recentColors.length && <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-mute">Colori recenti</span>
      {prefs.recentColors.map(color=><button key={color} className="rounded border border-line px-2 py-1 text-sm" aria-label={"Usa "+color}
        onClick={()=>edit(color)}><span aria-hidden="true" className="mr-1 inline-block h-3 w-3 rounded-full border border-line" style={{background:color}}/>{color}</button>)}</div>}
    <div className="flex flex-wrap items-center gap-3">
      <label>Elemento <select className={button+" bg-ink"} value={key} onChange={e=>{chooseKey(e.target.value as keyof Colors);setHex(null);}}>
        {Object.entries(colorNames).map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label>
      <input aria-label="Colore elemento" type="color" value={colors[key]} onChange={e=>edit(e.target.value)}/>
      <label>HEX <input className={button+" w-28 bg-ink"} maxLength={7} value={hex ?? colors[key]} aria-invalid={hex !== null}
        onChange={e=>edit(e.target.value)} onBlur={()=>setHex(null)}/></label>
      <button className={button} onClick={()=>{setPrefs({colors:{}});setHex(null);}}>Ripristina colori del preset</button>
      <button className={button} disabled={prefs.colors[key]===undefined} onClick={()=>{
        const colors={...prefs.colors}; delete colors[key]; setPrefs({colors}); setHex(null);
      }}>Ripristina questo colore</button>
    </div>
    <label className="block">Temi personali <select className={button+" bg-ink"} value={saved?.name ?? ""} onChange={e=>{
      const t=prefs.savedThemes.find(row=>row.name===e.target.value);if(t) activate(t); else {chooseTheme("");setName("");}
    }}><option value="">Tema corrente</option>{prefs.savedThemes.map(t=><option key={t.name}>{t.name}</option>)}</select></label>
    <label className="block">Nome tema <input className={button+" bg-ink"} maxLength={60} value={name} onChange={e=>setName(e.target.value)}/></label>
    <div className="flex flex-wrap gap-2">
      <button className={button} disabled={!canAdd} onClick={()=>append(current(label))}>Salva come nuovo tema</button>
      <button className={button} disabled={!saved || prefs.savedThemes.length>=24} onClick={duplicate}>Duplica tema salvato</button>
      <button className={button} disabled={!saved} onClick={()=>setPrefs({savedThemes:prefs.savedThemes.map(t=>t===saved?current(t.name):t)})}>Aggiorna tema selezionato</button>
      <button className={button} disabled={!saved || !label || exists} onClick={()=>{
        setPrefs({savedThemes:prefs.savedThemes.map(t=>t===saved?{...t,name:label}:t)});chooseTheme(label);
      }}>Rinomina tema</button>
      <button className={button} disabled={!saved} onClick={()=>{
        if (saved && window.confirm("Eliminare il tema "+saved.name+" dalla libreria?")) {
          setPrefs({savedThemes:prefs.savedThemes.filter(t=>t!==saved)});chooseTheme("");setName("");
        }
      }}>Elimina tema</button>
      <button className={button} onClick={download}>Esporta tema</button>
    </div>
    <label className="block">Importa tema<input className="block" type="file" accept="application/json,.json" onChange={async e=>{
      const file=e.target.files?.[0];e.target.value="";setIncoming(null);setError("");if(!file)return;
      try {
        if(file.size>8192)throw Error();
        const data=JSON.parse(await file.text());
        if(data.format!=="nexus.theme.v1"||!validSavedTheme(data.theme))throw Error();
        setIncoming(data.theme);setName(data.theme.name);
      }catch{setError("File tema non valido.");}
    }}/></label>
    {incoming && <div className="flex items-center gap-2"><span>Importa {incoming.name}</span>
      <button className={button} disabled={!canAdd} onClick={()=>append({...incoming,name:label})}>Conferma importazione</button>
      <button className={button} onClick={()=>setIncoming(null)}>Annulla</button></div>}
    {exists && label !== selected && <p className="text-sm text-mute">Scegli un nome libero per creare una copia.</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}

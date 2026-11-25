import ConfigurationFiles from "../ConfigurationFiles";
import ThemeLibrary from "../ThemeLibrary";
import WorkspaceSettings from "../WorkspaceSettings";
import { isTheme, themes } from "../themes";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api, tt, type TTStatus } from "../api";
import { logout } from "../auth";
import { DashboardControls } from "../DashboardLayout";
import { getClockOptions, getDateOptions, prefsSaved, setPrefs, usePrefs, validZone } from "../prefs";

const field = "w-full rounded-lg border border-line bg-ink px-3 py-2 text-base";
const button = "inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-4 text-sm hover:bg-raised";
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-3 rounded-xl border border-line bg-panel p-4 sm:p-5"><h2 className="text-lg font-semibold">{title}</h2>{children}</section>;
}

export default function SettingsPage() {
  const prefs = usePrefs();
  const [zone, setZone] = useState(prefs.timeZone);
  const [zoneError, setZoneError] = useState("");
  const [connection, setConnection] = useState<TTStatus | null>(null);
  const [health, setHealth] = useState<"loading" | "ok" | "error">("loading");
  const [tickError, setTickError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [exportState, setExportState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [now, setNow] = useState(() => new Date());
  const exportBusy = useRef(false);
  useEffect(() => { setZone(prefs.timeZone); setZoneError(""); }, [prefs.timeZone]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    setHealth("loading");
    setTickError(false);
    setConnection(null);
    api.health().then(() => { if (active) setHealth("ok"); }).catch(() => { if (active) setHealth("error"); });
    tt.status().then(value => { if (active) setConnection(value); }).catch(() => { if (active) setTickError(true); });
    return () => { active = false; };
  }, [attempt]);
  async function exportNotes() {
    if (exportBusy.current) return;
    exportBusy.current = true;
    setExportState("busy");
    try {
      const notes = await api.listNotes();
      const exported = new Date().toISOString();
      const file = new Blob([JSON.stringify({ format: "nexus.notes.v1", exported, notes }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = "nexus-note-" + exported.slice(0, 10) + ".json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportState("done");
    } catch { setExportState("error"); }
    finally { exportBusy.current = false; }
  }
  return <div className="mx-auto max-w-3xl space-y-4">
    <h1 className="text-3xl font-semibold">Impostazioni</h1>
    <p className="text-sm text-mute">Aspetto, orario e layout si conservano in questo browser.</p>
    {!prefsSaved() && <p role="alert" className="text-amber-300">Il browser ha bloccato il salvataggio delle preferenze.</p>}
    <Panel title="Data e ora del Command Center">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1"><span>Formato data</span><select className={field} value={prefs.dateFormat} onChange={e => setPrefs({ dateFormat: e.target.value === "numeric" ? "numeric" : "long" })}>
          <option value="long">Giorno e mese in lettere</option><option value="numeric">Giorno/mese/anno</option></select></label>
        <label className="space-y-1"><span>Formato ora</span><select className={field} value={prefs.clock} onChange={e => setPrefs({ clock: e.target.value as typeof prefs.clock })}>
          <option value="system">Automatico</option><option value="24">24 ore</option><option value="12">12 ore</option></select></label>
      </div>
      <form className="flex flex-wrap items-end gap-2" onSubmit={e => {
        e.preventDefault();
        const name = zone.trim();
        if (name && !validZone(name)) { setZoneError("Inserisci un fuso valido, per esempio Europe/Rome."); return; }
        setPrefs({ timeZone: name }); setZone(name); setZoneError("");
      }}>
        <label className="min-w-0 flex-auto space-y-1"><span>Fuso orario</span><input value={zone} list="fusi-orari" className={field} placeholder="Automatico dal dispositivo"
          onChange={e => { setZone(e.target.value); setZoneError(""); }} aria-invalid={!!zoneError} />
          <datalist id="fusi-orari">{["Europe/Rome", "Europe/London", "UTC", "America/New_York", "Asia/Tokyo"].map(value => <option value={value} key={value}/>)}</datalist></label>
        <button className={button}>Applica</button>
      </form>
      {zoneError && <p role="alert" className="text-amber-300">{zoneError}</p>}
      <p className="text-sm text-mute">{now.toLocaleDateString("it-IT", getDateOptions(prefs))} · {now.toLocaleTimeString("it-IT", getClockOptions(prefs))} · {prefs.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
    </Panel>
    <Panel title="Workspace"><WorkspaceSettings key={prefs.activeProfile}/></Panel>
    <Panel title="Aspetto e navigazione">
      <label className="block">Tema<select aria-label="Tema" className={field} value={prefs.theme} onChange={e => {
        const id = e.target.value;
        if (isTheme(id)) setPrefs({ theme: id, accent: themes[id][1], colors: {} });
      }}>
        {Object.entries(themes).map(([id, [label]]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="flex items-center justify-between gap-3">Colore principale<input aria-label="Colore principale" type="color" value={prefs.accent}
        className="h-10 w-14" onChange={e => setPrefs({ accent: e.target.value })} /></label>
        <label className="space-y-1"><span>Spaziatura dashboard</span><select className={field} value={prefs.density} onChange={e => setPrefs({ density: e.target.value === "compact" ? "compact" : "standard" })}>
          <option value="standard">Standard</option><option value="compact">Compatta</option></select></label></div>
      <div><Link className={button} to="/menu">Gestisci i moduli e i preferiti</Link></div>
    </Panel>
    <Panel title="Editor dei temi"><ThemeLibrary/></Panel>
    <Panel title="Dashboard"><DashboardControls /></Panel>
    <Panel title="Configurazione personale"><ConfigurationFiles/></Panel>
    <Panel title="Integrazioni">
      <p>TickTick · {tickError ? "Stato non disponibile" : connection ? connection.connected ? "Collegato" : connection.configured ? "Da collegare" : "Da configurare" : "Verifica in corso…"}</p>
      <Link className={button} to="/tasks">Apri TickTick in NEXUS</Link>
    </Panel>
    <Panel title="Notifiche">
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={prefs.badges} onChange={e=>setPrefs({badges:e.target.checked})}/>Mostra il conteggio delle notifiche da leggere</label>
      <p className="text-sm text-mute">Per nascondere il conteggio in una fascia oraria, imposta entrambi gli orari.</p>
      <div className="flex flex-wrap gap-3"><label>Dalle<input type="time" className={field} value={prefs.quietFrom} onChange={e=>setPrefs({quietFrom:e.target.value})}/></label>
        <label>Alle<input type="time" className={field} value={prefs.quietTo} onChange={e=>setPrefs({quietTo:e.target.value})}/></label></div>
      <Link className={button} to="/notifications">Apri il centro notifiche</Link></Panel>
    <Panel title="Dati e connessione">
      <p role="status">API · {health === "ok" ? "Raggiungibile" : health === "loading" ? "Verifica in corso…" : "Connessione non riuscita"}</p>
      <div className="flex flex-wrap gap-2"><button className={button} onClick={() => setAttempt(n => n + 1)}>Verifica connessione</button>
        <Link className={button} to="/knowledge">Gestisci le note</Link>
        <button className={button} disabled={exportState === "busy"} onClick={exportNotes}>{exportState === "busy" ? "Preparazione…" : "Esporta note in JSON"}</button></div>
      {exportState === "error" && <p role="alert" className="text-amber-300">Impossibile esportare le note. Riprova quando l’API è raggiungibile.</p>}
      {exportState === "done" && <p role="status">Download delle note avviato.</p>}
    </Panel>
    <Panel title="Sessione"><button className={button} onClick={logout}>Esci da NEXUS</button></Panel>
  </div>;
}

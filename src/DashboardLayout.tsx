import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, GripVertical, SlidersHorizontal } from "lucide-react";
import {allWidgets,widgetFormats,type WidgetFormat} from "./prefs";
import { defaultWide, defaultWidgets, prefsSaved, setPrefs, usePrefs, widgetLimit, widgetNames, widgetType, type WidgetId, type WidgetInstance } from "./prefs";

const control = "inline-flex min-h-10 items-center justify-center rounded-lg border border-line px-3 text-sm hover:bg-raised disabled:opacity-40";
const catalog: Record<WidgetId, [string, string]> = {
  tasks:["Produttività","Attività di oggi dalla connessione TickTick."],
  focus:["Produttività","Priorità salvate e riepilogo settimanale del Planner."],
  school:["Academic","Scadenze di attività ed esami nei prossimi sette giorni."],
  capture:["Personale","Acquisizione di una nuova voce nella Inbox."],
  notes:["Second Brain","Ultime note salvate con collegamenti ai record."],
  history:["Sistema","Attività recenti registrate nei moduli."],
  chart:["Second Brain","Conteggio giornaliero delle note create."],
  modules:["Finanza e Academic","Saldo, uscite del mese e attività scolastiche aperte."],
  projects:["Progetti","Stato, avanzamento e traguardi dei progetti."],
  upcoming:["Calendario","Appuntamenti in corso o futuri."],
  ai:["AI","Configurazione del provider e accesso al piano del giorno."],
  insights:["Academic","Attività in scadenza oggi e avanzamento settimanale."],
  clock:["Tempo","Ora e data nel fuso del workspace."],exams:["Academic","Prossimi esami aperti in ordine di data."],
  balance:["Finanza","Saldo complessivo dei conti registrati."],income:["Finanza","Entrate registrate nel mese corrente."],
  spending:["Finanza","Uscite del mese raggruppate per categoria."],goals:["Personale","Obiettivi attivi e progressi registrati."],
  habits:["Produttività","Abitudini previste oggi e completamenti."],deadlines:["Academic","Prossime attività scolastiche aperte."],
  health:["Salute","Ultime sessioni di allenamento completate."],
};

export function DashboardControls({ available = allWidgets }: { available?: WidgetId[] }) {
  const prefs = usePrefs();
  const saved = { dashboardOrder: prefs.dashboardOrder, dashboardHidden: prefs.dashboardHidden, dashboardWide: prefs.dashboardWide, dashboardSizes:prefs.dashboardSizes };
  type Layout = typeof saved;
  const [draft, setDraft] = useState<Layout | null>(null);
  const [past,setPast] = useState<Layout[]>([]);
  const [future,setFuture] = useState<Layout[]>([]);
  const [search,setSearch] = useState("");
  const [baseline, setBaseline] = useState("");
  const [dragging, setDragging] = useState<WidgetInstance | null>(null);
  const layout = draft ?? saved;
  const order = layout.dashboardOrder.filter(key => available.includes(widgetType(key)));
  const matches = available.filter(id=>[widgetNames[id],...catalog[id]].join(" ").toLocaleLowerCase("it")
    .includes(search.trim().toLocaleLowerCase("it")));
  const conflict = draft !== null && baseline !== JSON.stringify(saved);
  function edit(patch: Partial<Layout>) {
    if (!draft) setBaseline(JSON.stringify(saved));
    setPast(steps=>[...steps.slice(-29),layout]);
    setFuture([]);
    setDraft({ ...layout, ...patch });
  }
  function closeDraft() { setDraft(null); setPast([]); setFuture([]); }
  function undo() {
    if (!past.length) return;
    setDraft(past[past.length-1]); setPast(past.slice(0,-1)); setFuture([...future,layout]);
  }
  function redo() {
    if (!future.length) return;
    setDraft(future[future.length-1]); setFuture(future.slice(0,-1)); setPast([...past,layout]);
  }
  function move(id: WidgetInstance, target: WidgetInstance) {
    if (id === target || !order.includes(id) || !order.includes(target)) return;
    const reordered = [...order];
    reordered.splice(order.indexOf(id), 1);
    reordered.splice(order.indexOf(target), 0, id);
    let position = 0;
    edit({ dashboardOrder: layout.dashboardOrder.map(key => available.includes(widgetType(key)) ? reordered[position++] : key) });
  }
  function duplicate(id: WidgetInstance) {
    if (layout.dashboardOrder.length >= widgetLimit) return;
    const type = widgetType(id);
    let sequence = 1;
    while (layout.dashboardOrder.includes(`${type}~${sequence}`)) sequence++;
    const copy: WidgetInstance = `${type}~${sequence}`;
    const next = [...layout.dashboardOrder];
    next.splice(next.indexOf(id) + 1, 0, copy);
    const sizes={...layout.dashboardSizes};
    if(sizes[id]) sizes[copy]=sizes[id];
    edit({ dashboardOrder: next, dashboardSizes:sizes, dashboardWide: layout.dashboardWide.includes(id) ? [...layout.dashboardWide, copy] : layout.dashboardWide });
  }
  function removeCopy(id: WidgetInstance) {
    const sizes={...layout.dashboardSizes};delete sizes[id];
    edit({
      dashboardSizes:sizes,
      dashboardOrder: layout.dashboardOrder.filter(k => k !== id),
      dashboardHidden: layout.dashboardHidden.filter(k => k !== id),
      dashboardWide: layout.dashboardWide.filter(k => k !== id),
    });
  }
  return <div className="space-y-3">
    <details className="rounded-xl border border-line bg-panel p-3"><summary className="cursor-pointer font-medium">Aggiungi widget</summary>
      <label className="my-3 block text-sm">Cerca nella libreria<input className="mt-1 block w-full rounded-lg border border-line bg-ink p-2"
        type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label>
      {!matches.length && <p role="status" className="text-sm text-mute">Nessun widget corrispondente.</p>}
      <ul className="grid gap-2 sm:grid-cols-2">{matches.map(id=>{
        const hidden=order.find(key=>widgetType(key)===id && layout.dashboardHidden.includes(key));
        const count=order.filter(key=>widgetType(key)===id && !layout.dashboardHidden.includes(key)).length;
        return <li key={id} className="flex flex-col items-start gap-1 rounded-lg border border-line bg-raised p-3">
          <span className="text-xs text-mute">{catalog[id][0]}</span><strong>{widgetNames[id]}</strong>
          <p className="mb-2 grow text-sm text-mute">{catalog[id][1]}</p>
          <span role="status" className="text-xs text-mute">Nel layout: {count}</span>
          <button className={control} disabled={!hidden && layout.dashboardOrder.length>=widgetLimit}
            onClick={()=>hidden ? edit({dashboardHidden:layout.dashboardHidden.filter(key=>key!==hidden)}) : order.includes(id) ? duplicate(id) : edit({dashboardOrder:[...layout.dashboardOrder,id]})}
            aria-label={"Aggiungi alla dashboard "+widgetNames[id]}>{hidden ? "Mostra widget" : order.includes(id) ? "Aggiungi copia" : "Aggiungi widget"}</button>
        </li>;
      })}</ul>
    </details>
    <p className="text-sm text-mute">Scegli visibilità, ordine e formato. Su telefono i widget occupano una colonna.</p>
    <ul className="divide-y divide-line">{order.map((id, index) => {
      const visible = !layout.dashboardHidden.includes(id);
      const wide = layout.dashboardWide.includes(id);
      const type = widgetType(id);
      const name = widgetNames[type] + (id === type ? "" : " · copia " + id.split("~")[1]);
      return <li key={id} className="flex flex-wrap items-center gap-2 py-2" onDragOver={e => { if (dragging) e.preventDefault(); }}
        onDrop={e => { e.preventDefault(); if (dragging) move(dragging, id); setDragging(null); }}>
        <span draggable title={"Trascina " + name} className="cursor-grab p-2 text-mute" onDragStart={e => { e.dataTransfer.setData("text/plain", id); setDragging(id); }} onDragEnd={() => setDragging(null)}><GripVertical size={16}/></span>
        <label className="flex min-h-11 min-w-36 flex-1 items-center gap-2"><input type="checkbox" checked={visible}
          onChange={() => edit({ dashboardHidden: visible ? [...layout.dashboardHidden, id] : layout.dashboardHidden.filter(key => key !== id) })} />{name}</label>
        <select aria-label={"Formato per "+name} className={control+" bg-ink"} value={layout.dashboardSizes[id] ?? (wide?"full":"2x1")}
          onChange={e=>{const size=e.target.value as WidgetFormat;const rest=layout.dashboardWide.filter(key=>key!==id);
            edit({dashboardSizes:{...layout.dashboardSizes,[id]:size},dashboardWide:size==="full"||size==="4x1"?[...rest,id]:rest});}}>
          {Object.entries(widgetFormats).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
        <button className={control} aria-label={"Duplica " + name} disabled={layout.dashboardOrder.length >= widgetLimit}
          onClick={() => duplicate(id)}>Duplica</button>
        {(id !== type || !defaultWidgets.includes(type)) && <button className={control} aria-label={"Rimuovi " + name} onClick={() => removeCopy(id)}>Rimuovi</button>}
        <button className={control} aria-label={"Sposta su " + name} disabled={index === 0} onClick={() => move(id, order[index - 1])}><ArrowUp size={16}/></button>
        <button className={control} aria-label={"Sposta giù " + name} disabled={index === order.length - 1} onClick={() => move(id, order[index + 1])}><ArrowDown size={16}/></button>
      </li>;
    })}</ul>
    <button className={control} onClick={() => edit({ dashboardOrder: defaultWidgets, dashboardHidden: [], dashboardWide: defaultWide, dashboardSizes:{} })}>Ripristina layout</button>
    {draft && <div className="flex flex-wrap gap-2">
      <button className={control} disabled={!past.length || conflict} onClick={undo}>Annulla ultimo passo</button>
      <button className={control} disabled={!future.length || conflict} onClick={redo}>Ripeti ultimo passo</button>
      <button className={control} disabled={conflict || JSON.stringify(draft)===baseline} onClick={() => { setPrefs(draft); closeDraft(); }}>Applica layout</button>
      <button className={control} onClick={closeDraft}>Annulla modifiche</button>
      {conflict && <p role="alert">Il layout salvato è cambiato. Annulla le modifiche per caricare la nuova versione.</p>}
    </div>}
    {!prefsSaved() && <p role="alert" className="text-sm text-amber-300">Il browser ha bloccato il salvataggio. Le scelte valgono per questa sessione.</p>}
  </div>;
}

export default function DashboardLayout({ widgets }: { widgets: Partial<Record<WidgetId, ReactNode>> }) {
  const prefs = usePrefs();
  const [editing, setEditing] = useState(false);
  const available = allWidgets.filter(id => widgets[id] != null);
  const visible = prefs.dashboardOrder.filter(id => available.includes(widgetType(id)) && !prefs.dashboardHidden.includes(id));
  return <>
    <div className="flex justify-end"><button className={control + " gap-2"} aria-expanded={editing}
      aria-controls="dashboard-preferenze" onClick={() => setEditing(v => !v)}><SlidersHorizontal size={16} />{editing ? "Chiudi personalizzazione" : "Personalizza dashboard"}</button></div>
    {editing && <section id="dashboard-preferenze" aria-label="Personalizzazione dashboard" className="rounded-xl border border-line bg-panel p-4"><DashboardControls key={prefs.activeProfile} available={available}/></section>}
    {visible.length ? <div className={"nexus-widget-grid grid grid-cols-1 items-start " + (prefs.density === "compact" ? "gap-2" : "gap-5")}>
      {visible.map(id => <div key={id} data-widget={id} data-size={prefs.dashboardSizes[id]??(prefs.dashboardWide.includes(id)?"full":"2x1")} className="min-w-0">{widgets[widgetType(id)]}</div>)}
    </div> : <p className="rounded-xl border border-line p-5 text-mute">Tutti i widget sono nascosti. Apri «Personalizza dashboard» per mostrarli.</p>}
  </>;
}

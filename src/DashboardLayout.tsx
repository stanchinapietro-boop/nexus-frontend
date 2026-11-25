import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, GripVertical, SlidersHorizontal } from "lucide-react";
import { defaultWide, defaultWidgets, prefsSaved, setPrefs, usePrefs, widgetNames, type WidgetId } from "./prefs";

const control = "inline-flex min-h-10 items-center justify-center rounded-lg border border-line px-3 text-sm hover:bg-raised disabled:opacity-40";

export function DashboardControls({ available = defaultWidgets }: { available?: WidgetId[] }) {
  const prefs = usePrefs();
  const saved = { dashboardOrder: prefs.dashboardOrder, dashboardHidden: prefs.dashboardHidden, dashboardWide: prefs.dashboardWide };
  type Layout = typeof saved;
  const [draft, setDraft] = useState<Layout | null>(null);
  const [baseline, setBaseline] = useState("");
  const [dragging, setDragging] = useState<WidgetId | null>(null);
  const layout = draft ?? saved;
  const order = layout.dashboardOrder.filter(key => available.includes(key));
  const conflict = draft !== null && baseline !== JSON.stringify(saved);
  function edit(patch: Partial<Layout>) {
    if (!draft) setBaseline(JSON.stringify(saved));
    setDraft({ ...layout, ...patch });
  }
  function move(id: WidgetId, target: WidgetId) {
    if (id === target || !order.includes(id) || !order.includes(target)) return;
    const reordered = [...order];
    reordered.splice(order.indexOf(id), 1);
    reordered.splice(order.indexOf(target), 0, id);
    let position = 0;
    edit({ dashboardOrder: layout.dashboardOrder.map(key => available.includes(key) ? reordered[position++] : key) });
  }
  return <div className="space-y-3">
    <p className="text-sm text-mute">Scegli i widget da mostrare. La larghezza estesa si applica agli schermi con due colonne.</p>
    <ul className="divide-y divide-line">{order.map((id, index) => {
      const visible = !layout.dashboardHidden.includes(id);
      const wide = layout.dashboardWide.includes(id);
      const name = widgetNames[id];
      return <li key={id} className="flex flex-wrap items-center gap-2 py-2" onDragOver={e => { if (dragging) e.preventDefault(); }}
        onDrop={e => { e.preventDefault(); if (dragging) move(dragging, id); setDragging(null); }}>
        <span draggable title={"Trascina " + name} className="cursor-grab p-2 text-mute" onDragStart={e => { e.dataTransfer.setData("text/plain", id); setDragging(id); }} onDragEnd={() => setDragging(null)}><GripVertical size={16}/></span>
        <label className="flex min-h-11 min-w-36 flex-1 items-center gap-2"><input type="checkbox" checked={visible}
          onChange={() => edit({ dashboardHidden: visible ? [...layout.dashboardHidden, id] : layout.dashboardHidden.filter(key => key !== id) })} />{name}</label>
        <button className={control} aria-pressed={wide} aria-label={"Larghezza estesa per " + name} onClick={() => edit({ dashboardWide: wide ? layout.dashboardWide.filter(key => key !== id) : [...layout.dashboardWide, id] })}>
          {wide ? "Estesa" : "Normale"}
        </button>
        <button className={control} aria-label={"Sposta su " + name} disabled={index === 0} onClick={() => move(id, order[index - 1])}><ArrowUp size={16}/></button>
        <button className={control} aria-label={"Sposta giù " + name} disabled={index === order.length - 1} onClick={() => move(id, order[index + 1])}><ArrowDown size={16}/></button>
      </li>;
    })}</ul>
    <button className={control} onClick={() => edit({ dashboardOrder: defaultWidgets, dashboardHidden: [], dashboardWide: defaultWide })}>Ripristina layout</button>
    {draft && <div className="flex flex-wrap gap-2">
      <button className={control} disabled={conflict} onClick={() => { setPrefs(draft); setDraft(null); }}>Applica layout</button>
      <button className={control} onClick={() => setDraft(null)}>Annulla modifiche</button>
      {conflict && <p role="alert">Il layout salvato è cambiato. Annulla le modifiche per caricare la nuova versione.</p>}
    </div>}
    {!prefsSaved() && <p role="alert" className="text-sm text-amber-300">Il browser ha bloccato il salvataggio. Le scelte valgono per questa sessione.</p>}
  </div>;
}

export default function DashboardLayout({ widgets }: { widgets: Partial<Record<WidgetId, ReactNode>> }) {
  const prefs = usePrefs();
  const [editing, setEditing] = useState(false);
  const available = defaultWidgets.filter(id => widgets[id] != null);
  const visible = prefs.dashboardOrder.filter(id => available.includes(id) && !prefs.dashboardHidden.includes(id));
  return <>
    <div className="flex justify-end"><button className={control + " gap-2"} aria-expanded={editing}
      aria-controls="dashboard-preferenze" onClick={() => setEditing(v => !v)}><SlidersHorizontal size={16} />{editing ? "Chiudi personalizzazione" : "Personalizza dashboard"}</button></div>
    {editing && <section id="dashboard-preferenze" aria-label="Personalizzazione dashboard" className="rounded-xl border border-line bg-panel p-4"><DashboardControls available={available}/></section>}
    {visible.length ? <div className={"grid grid-cols-1 items-start md:grid-cols-2 " + (prefs.density === "compact" ? "gap-2" : "gap-5")}>
      {visible.map(id => <div key={id} data-widget={id} className={"min-w-0 " + (prefs.dashboardWide.includes(id) ? "md:col-span-2" : "")}>{widgets[id]}</div>)}
    </div> : <p className="rounded-xl border border-line p-5 text-mute">Tutti i widget sono nascosti. Apri «Personalizza dashboard» per mostrarli.</p>}
  </>;
}

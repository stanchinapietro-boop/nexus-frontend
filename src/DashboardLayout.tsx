import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, SlidersHorizontal } from "lucide-react";
import { defaultWide, defaultWidgets, prefsSaved, setPrefs, usePrefs, widgetNames, type WidgetId } from "./prefs";

const control = "inline-flex min-h-10 items-center justify-center rounded-lg border border-line px-3 text-sm hover:bg-raised disabled:opacity-40";

export function DashboardControls({ available = defaultWidgets }: { available?: WidgetId[] }) {
  const prefs = usePrefs();
  const order = prefs.dashboardOrder.filter(key => available.includes(key));
  function move(id: WidgetId, offset: number) {
    const other = order[order.indexOf(id) + offset];
    if (!other) return;
    const next = prefs.dashboardOrder.map(key => key === id ? other : key === other ? id : key);
    setPrefs({ dashboardOrder: next });
  }
  return <div className="space-y-3">
    <p className="text-sm text-mute">Scegli i widget da mostrare. La larghezza estesa si applica agli schermi con due colonne.</p>
    <ul className="divide-y divide-line">{order.map((id, index) => {
      const visible = !prefs.dashboardHidden.includes(id);
      const wide = prefs.dashboardWide.includes(id);
      const name = widgetNames[id];
      return <li key={id} className="flex flex-wrap items-center gap-2 py-2">
        <label className="flex min-h-11 min-w-36 flex-1 items-center gap-2"><input type="checkbox" checked={visible}
          onChange={() => setPrefs({ dashboardHidden: visible ? [...prefs.dashboardHidden, id] : prefs.dashboardHidden.filter(key => key !== id) })} />{name}</label>
        <button className={control} aria-pressed={wide} aria-label={"Larghezza estesa per " + name} onClick={() => setPrefs({ dashboardWide: wide ? prefs.dashboardWide.filter(key => key !== id) : [...prefs.dashboardWide, id] })}>
          {wide ? "Estesa" : "Normale"}
        </button>
        <button className={control} aria-label={"Sposta su " + name} disabled={index === 0} onClick={() => move(id, -1)}><ArrowUp size={16}/></button>
        <button className={control} aria-label={"Sposta giù " + name} disabled={index === order.length - 1} onClick={() => move(id, 1)}><ArrowDown size={16}/></button>
      </li>;
    })}</ul>
    <button className={control} onClick={() => setPrefs({ dashboardOrder: defaultWidgets, dashboardHidden: [], dashboardWide: defaultWide, density: "standard" })}>Ripristina layout</button>
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

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Download, Pencil } from "lucide-react";
import { fin4, eur } from "../api";
import { setPrefs, usePrefs } from "../prefs";

export function Donut({ data, total }: { data: { name: string; color: string; cents: number }[]; total: number }) {
  const d = data.length ? data : [{ name: "", color: "#2e2e32", cents: 1 }];
  return (
    <div className="relative mx-auto h-52 w-52 shrink-0">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={d} dataKey="cents" nameKey="name" innerRadius="70%" outerRadius="100%" paddingAngle={d.length > 1 ? 2 : 0} stroke="none">
            {d.map((x, i) => <Cell key={i} fill={x.color} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-xs text-mute">Spese del mese</div>
        <div className="text-xl font-semibold">{eur(total)}</div>
      </div>
    </div>
  );
}

export function InlineName({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  if (!editing)
    return (
      <button className="flex items-center gap-2 text-left font-medium" onClick={() => { setV(value); setEditing(true); }} title="Rinomina">
        {value} <Pencil size={12} className="text-mute" />
      </button>
    );
  const done = () => { setEditing(false); if (v.trim() && v.trim() !== value) onSave(v.trim()); };
  return (
    <input autoFocus value={v} onChange={(e) => setV(e.target.value)} onBlur={done}
      onKeyDown={(e) => e.key === "Enter" && done()} className="rounded border border-accent bg-ink px-2 py-1" />
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center justify-between py-2">
      <span>{label}</span>
      <span className={`h-6 w-11 rounded-full p-0.5 transition-colors ${on ? "bg-accent" : "bg-raised"}`}>
        <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

const COLORS = ["#ff6a1a", "#f59e0b", "#22c55e", "#14b8a6", "#0ea5e9", "#6366f1", "#a855f7", "#ec4899", "#ef4444", "#a1a1aa"];
const TABS: [string, string][] = [["budget", "Budget"], ["obiettivi", "Obiettivi"], ["ricorrenti", "Ricorrenti"], ["report", "Report"]];
const WIDGETS: [string, string][] = [["saldo", "Saldo totale"], ["mese", "Entrate e uscite"], ["categorie", "Spese per categoria"], ["ultimi", "Ultimi movimenti"]];

function save(name: string, mime: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: mime }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

export function Impostazioni() {
  const p = usePrefs();
  const [err, setErr] = useState("");
  const flip = (list: string[], k: string, on: boolean) => (on ? list.filter((x) => x !== k) : [...list, k]);
  const card = "rounded-2xl border border-line bg-panel p-5";
  async function exportJson() {
    try { save("nexus-finance-backup.json", "application/json", JSON.stringify(await fin4.exportAll(), null, 2)); setErr(""); }
    catch { setErr("Esportazione non riuscita. Il backend è acceso?"); }
  }
  async function exportCsv() {
    try {
      const d = await fin4.exportAll();
      const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
      const rows = d.transactions.map((t) => [t.day, t.type === "income" ? "Entrata" : "Uscita", (t.amount_cents / 100).toFixed(2).replace(".", ","), q(t.account_name), q(t.category_name), q(t.note)].join(";"));
      save("movimenti.csv", "text/csv", "\uFEFF" + ["Data;Tipo;Importo;Conto;Categoria;Nota", ...rows].join("\n"));
      setErr("");
    } catch { setErr("Esportazione non riuscita. Il backend è acceso?"); }
  }
  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <section className={card}>
        <h2 className="font-medium">Colore principale</h2>
        <p className="text-sm text-mute">Vale per tutta l'app e resta salvato su questo dispositivo.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {COLORS.map((c) => (
            <button key={c} aria-label={`Colore ${c}`} onClick={() => setPrefs({ accent: c })}
              className={`h-9 w-9 rounded-full ${p.accent === c ? "ring-2 ring-white ring-offset-2 ring-offset-panel" : ""}`} style={{ background: c }} />
          ))}
          <input type="color" aria-label="Colore personalizzato" value={p.accent} onChange={(e) => setPrefs({ accent: e.target.value })} className="h-9 w-9 cursor-pointer rounded-full bg-transparent" />
        </div>
      </section>
      <section className={card}>
        <h2 className="font-medium">Sezioni attive</h2>
        <p className="text-sm text-mute">Nascondere una sezione non cancella i suoi dati.</p>
        <div className="mt-2 divide-y divide-line">
          {TABS.map(([k, l]) => <Toggle key={k} label={l} on={!p.hiddenTabs.includes(k)} onChange={(v) => setPrefs({ hiddenTabs: flip(p.hiddenTabs, k, v) })} />)}
        </div>
      </section>
      <section className={card}>
        <h2 className="font-medium">Widget della Home</h2>
        <div className="mt-2 divide-y divide-line">
          {WIDGETS.map(([k, l]) => <Toggle key={k} label={l} on={!p.hiddenWidgets.includes(k)} onChange={(v) => setPrefs({ hiddenWidgets: flip(p.hiddenWidgets, k, v) })} />)}
        </div>
      </section>
      <section className={card}>
        <h2 className="font-medium">Backup ed esportazione</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={exportJson} className="flex items-center gap-2 rounded-lg border border-line px-4 py-2"><Download size={16} /> Backup completo (JSON)</button>
          <button onClick={exportCsv} className="flex items-center gap-2 rounded-lg border border-line px-4 py-2"><Download size={16} /> Movimenti (CSV)</button>
        </div>
        {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
      </section>
    </div>
  );
}

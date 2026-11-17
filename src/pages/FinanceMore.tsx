import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Trash2 } from "lucide-react";
import { fin, fin2, eur, toCents, monthKey, type BudgetRow, type Category, type ReportRow } from "../api";

const input = "w-full rounded-lg border border-line bg-ink px-3 py-2 text-base";
const card = "rounded-2xl border border-line bg-panel p-5";
const tip = { background: "#222225", border: "1px solid #2e2e32", borderRadius: 8 };

function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => { fn().then(setData).catch(() => setData(null)); }, deps); // eslint-disable-line
  return data;
}

export function Budget({ rev, bump }: { rev: number; bump: () => void }) {
  const mk = monthKey(new Date());
  const rows = useLoad<BudgetRow[]>(() => fin2.budgets(mk), [rev]);
  const cats = useLoad<Category[]>(() => fin.categories(), [rev]);
  const [cat, setCat] = useState(""); const [limit, setLimit] = useState(""); const [err, setErr] = useState("");
  const tot = (rows ?? []).reduce((a, r) => a + r.spent_cents, 0);
  const totLimit = (rows ?? []).reduce((a, r) => a + r.limit_cents, 0);
  const over = (rows ?? []).filter((r) => r.spent_cents > r.limit_cents).length;
  async function save() {
    const cents = toCents(limit);
    if (!cat || !cents || cents <= 0) return setErr("Scegli una categoria e un limite valido.");
    try { await fin2.setBudget(Number(cat), cents); setLimit(""); setErr(""); bump(); }
    catch { setErr("Salvataggio non riuscito."); }
  }
  return (
    <div className="mx-auto grid max-w-2xl gap-3">
      <div className={card}>
        <div className="text-sm capitalize text-mute">Budget del mese · {new Date().toLocaleDateString("it-IT", { month: "long", year: "numeric" })}</div>
        <div className="mt-1 text-3xl font-semibold">{eur(tot)} <span className="text-base text-mute">/ {eur(totLimit)}</span></div>
        <div className="mt-1 text-sm text-mute">{over === 0 ? "Nessun budget sforato" : `${over} budget sforat${over === 1 ? "o" : "i"}`}</div>
      </div>
      {rows && rows.length === 0 && <p className="text-sm text-mute">Nessun budget. Imposta un limite mensile per una categoria.</p>}
      {(rows ?? []).map((r) => {
        const pct = Math.min(100, (r.spent_cents / r.limit_cents) * 100);
        const bad = r.spent_cents > r.limit_cents;
        return (
          <div key={r.id} className={card}>
            <div className="flex items-center justify-between">
              <div className="font-medium">{r.category_name}</div>
              <button aria-label="Elimina budget" className="text-mute hover:text-red-400" onClick={() => fin2.delBudget(r.id).then(bump)}><Trash2 size={16} /></button>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-mute">{eur(r.spent_cents)} di {eur(r.limit_cents)}</span>
              <span className={bad ? "text-red-400" : "text-green-400"}>{bad ? `Sforato di ${eur(r.spent_cents - r.limit_cents)}` : `Restano ${eur(r.limit_cents - r.spent_cents)}`}</span>
            </div>
            <div className="mt-2 h-2 rounded bg-raised"><div className="h-2 rounded" style={{ width: `${pct}%`, background: bad ? "#ef4444" : r.color }} /></div>
          </div>
        );
      })}
      <div className={card}>
        <div className="mb-2 font-medium">Imposta budget mensile</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <select className={input} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Categoria</option>
            {(cats ?? []).filter((c) => c.type === "expense").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className={input} inputMode="decimal" placeholder="Limite mensile (€)" value={limit} onChange={(e) => setLimit(e.target.value)} />
        </div>
        {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
        <button onClick={save} className="mt-3 rounded-lg bg-accent px-4 py-2 font-medium text-black">Salva budget</button>
        <p className="mt-2 text-xs text-mute">Se la categoria ha già un budget, il limite viene aggiornato.</p>
      </div>
    </div>
  );
}

export function Report({ rev }: { rev: number }) {
  const [n, setN] = useState(6);
  const rows = useLoad<ReportRow[]>(() => fin2.report(n), [n, rev]);
  const data = (rows ?? []).map((r) => ({
    mese: new Date(r.month + "-01").toLocaleDateString("it-IT", { month: "short" }),
    Entrate: r.income_cents / 100, Uscite: r.expense_cents / 100, Patrimonio: r.net_worth_cents / 100,
  }));
  const cur = rows?.[rows.length - 1]; const prev = rows && rows.length > 1 ? rows[rows.length - 2] : undefined;
  const line = (label: string, a: number, b?: number) => (
    <div className="flex items-center justify-between border-b border-line py-2 last:border-0">
      <span>{label}</span>
      <span className="text-sm text-mute">{b !== undefined && `prima ${eur(b)}`}</span>
      <span className="font-semibold">{eur(a)}</span>
    </div>
  );
  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <div className="grid grid-cols-3 gap-2">
        {[3, 6, 12].map((p) => (
          <button key={p} onClick={() => setN(p)} className={`rounded-lg border py-2 ${n === p ? "border-accent text-accent" : "border-line text-mute"}`}>{p} mesi</button>
        ))}
      </div>
      {cur && (
        <div className={card}>
          <div className="mb-1 font-medium">Mese corrente a confronto</div>
          {line("Entrate", cur.income_cents, prev?.income_cents)}
          {line("Uscite", cur.expense_cents, prev?.expense_cents)}
          {line("Differenza", cur.income_cents - cur.expense_cents, prev ? prev.income_cents - prev.expense_cents : undefined)}
        </div>
      )}
      <div className={card}>
        <div className="mb-3 font-medium">Entrate e uscite</div>
        <div className="h-60">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid stroke="#2e2e32" vertical={false} />
              <XAxis dataKey="mese" stroke="#8d8d94" tickLine={false} axisLine={false} />
              <YAxis stroke="#8d8d94" tickLine={false} axisLine={false} width={40} />
              <Tooltip contentStyle={tip} cursor={{ fill: "#222225" }} formatter={(v: number) => eur(Math.round(v * 100))} />
              <Legend />
              <Bar dataKey="Entrate" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Uscite" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className={card}>
        <div className="mb-3 font-medium">Patrimonio netto</div>
        <div className="h-60">
          <ResponsiveContainer>
            <AreaChart data={data}>
              <CartesianGrid stroke="#2e2e32" vertical={false} />
              <XAxis dataKey="mese" stroke="#8d8d94" tickLine={false} axisLine={false} />
              <YAxis stroke="#8d8d94" tickLine={false} axisLine={false} width={40} />
              <Tooltip contentStyle={tip} formatter={(v: number) => eur(Math.round(v * 100))} />
              <Area dataKey="Patrimonio" stroke="#ff6a1a" fill="#ff6a1a33" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

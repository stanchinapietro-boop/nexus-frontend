import { useEffect, useState } from "react";
import { Minus, Pause, Play, Plus, Trash2 } from "lucide-react";
import { fin, fin3, eur, toCents, type Account, type Category, type Goal, type Rec } from "../api";

const input = "w-full rounded-lg border border-line bg-ink px-3 py-2 text-base";
const card = "rounded-2xl border border-line bg-panel p-5";
const FREQ: Record<string, string> = { weekly: "ogni settimana", monthly: "ogni mese", yearly: "ogni anno" };

function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => { fn().then(setData).catch(() => setData(null)); }, deps); // eslint-disable-line
  return data;
}

function GoalCard({ g, bump }: { g: Goal; bump: () => void }) {
  const [amt, setAmt] = useState("");
  const pct = Math.min(100, (g.saved_cents / g.target_cents) * 100);
  const days = g.deadline ? Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000) : null;
  const move = (sign: number) => {
    const c = toCents(amt);
    if (!c || c <= 0) return;
    fin3.goalAdd(g.id, sign * c).then(() => { setAmt(""); bump(); });
  };
  return (
    <div className={card}>
      <div className="flex items-center justify-between">
        <div className="font-medium">{g.name}</div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-accent">{Math.round(pct)}%</span>
          <button aria-label="Elimina obiettivo" className="text-mute hover:text-red-400" onClick={() => fin3.delGoal(g.id).then(bump)}><Trash2 size={16} /></button>
        </div>
      </div>
      <div className="mt-1 text-sm text-mute">{eur(g.saved_cents)} di {eur(g.target_cents)}</div>
      <div className="mt-2 h-2 rounded bg-raised"><div className="h-2 rounded bg-accent" style={{ width: `${pct}%` }} /></div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 text-xs text-mute">
          {g.saved_cents >= g.target_cents ? "Obiettivo raggiunto" : `Mancano ${eur(g.target_cents - g.saved_cents)}`}
          {days !== null && g.saved_cents < g.target_cents && ` · ${days >= 0 ? `${days} giorni` : "scaduto"}`}
        </div>
        <input className="w-24 rounded-lg border border-line bg-ink px-2 py-1" inputMode="decimal" placeholder="€" value={amt} onChange={(e) => setAmt(e.target.value)} />
        <button aria-label="Togli" onClick={() => move(-1)} className="rounded-full border border-line p-2"><Minus size={14} /></button>
        <button aria-label="Aggiungi" onClick={() => move(1)} className="rounded-full border border-line p-2"><Plus size={14} /></button>
      </div>
    </div>
  );
}

export function Obiettivi({ rev, bump }: { rev: number; bump: () => void }) {
  const goals = useLoad<Goal[]>(() => fin3.goals(), [rev]);
  const [name, setName] = useState(""); const [target, setTarget] = useState(""); const [dl, setDl] = useState(""); const [err, setErr] = useState("");
  const saved = (goals ?? []).reduce((a, g) => a + g.saved_cents, 0);
  const total = (goals ?? []).reduce((a, g) => a + g.target_cents, 0);
  const done = (goals ?? []).filter((g) => g.saved_cents >= g.target_cents).length;
  async function add() {
    const c = toCents(target);
    if (!name.trim() || !c || c <= 0) return setErr("Inserisci un nome e un importo valido.");
    await fin3.addGoal(name.trim(), c, dl || null);
    setName(""); setTarget(""); setDl(""); setErr(""); bump();
  }
  return (
    <div className="mx-auto grid max-w-2xl gap-3">
      <div className={card}>
        <div className="text-sm text-mute">Messi da parte</div>
        <div className="text-3xl font-semibold">{eur(saved)} <span className="text-base text-mute">/ {eur(total)}</span></div>
        <div className="mt-1 text-sm text-mute">{done} di {(goals ?? []).length} obiettivi raggiunti</div>
        <div className="mt-1 text-xs text-mute">I soldi messi da parte non modificano il saldo dei conti.</div>
      </div>
      {goals && goals.length === 0 && <p className="text-sm text-mute">Nessun obiettivo. Creane uno qui sotto.</p>}
      {(goals ?? []).map((g) => <GoalCard key={g.id} g={g} bump={bump} />)}
      <div className={card}>
        <div className="mb-2 font-medium">Nuovo obiettivo</div>
        <div className="grid gap-2 sm:grid-cols-3">
          <input className={input} placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={input} inputMode="decimal" placeholder="Importo da raggiungere (€)" value={target} onChange={(e) => setTarget(e.target.value)} />
          <input type="date" className={input} aria-label="Scadenza" value={dl} onChange={(e) => setDl(e.target.value)} />
        </div>
        {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
        <button onClick={add} className="mt-3 rounded-lg bg-accent px-4 py-2 font-medium text-black">Crea obiettivo</button>
      </div>
    </div>
  );
}

export function Ricorrenti({ rev, bump }: { rev: number; bump: () => void }) {
  const recs = useLoad<Rec[]>(() => fin3.recurring(), [rev]);
  const [accs, setAccs] = useState<Account[]>([]); const [cats, setCats] = useState<Category[]>([]);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [note, setNote] = useState(""); const [amount, setAmount] = useState(""); const [acc, setAcc] = useState(""); const [cat, setCat] = useState("");
  const [freq, setFreq] = useState("monthly"); const [start, setStart] = useState(new Date().toISOString().slice(0, 10)); const [err, setErr] = useState("");
  useEffect(() => {
    fin.accounts().then((a) => { setAccs(a); if (a[0]) setAcc(String(a[0].id)); });
    fin.categories().then(setCats);
  }, []);
  async function add() {
    const c = toCents(amount);
    if (!note.trim() || !c || c <= 0) return setErr("Inserisci un nome e un importo valido.");
    if (!acc) return setErr("Crea prima un conto.");
    try {
      await fin3.addRec({ note: note.trim(), type, amount_cents: c, account_id: Number(acc), category_id: cat ? Number(cat) : null, freq, start });
      setNote(""); setAmount(""); setErr(""); bump();
    } catch { setErr("Salvataggio non riuscito."); }
  }
  return (
    <div className="mx-auto grid max-w-2xl gap-3">
      <p className="text-sm text-mute">Questi movimenti vengono registrati da soli alla data prevista, anche per le date già passate.</p>
      {recs && recs.length === 0 && <p className="text-sm text-mute">Nessun movimento ricorrente.</p>}
      {(recs ?? []).map((r) => (
        <div key={r.id} className={`${card} flex items-center gap-3 ${r.active ? "" : "opacity-50"}`}>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{r.note}</div>
            <div className="text-xs text-mute">{FREQ[r.freq]} · prossimo {new Date(r.next_day).toLocaleDateString("it-IT")} · {r.account_name}</div>
          </div>
          <div className={r.type === "income" ? "text-green-400" : "text-red-400"}>{r.type === "income" ? "+ " : "− "}{eur(r.amount_cents)}</div>
          <button aria-label={r.active ? "Metti in pausa" : "Riattiva"} onClick={() => fin3.toggleRec(r.id).then(bump)}>{r.active ? <Pause size={18} /> : <Play size={18} />}</button>
          <button aria-label="Elimina ricorrente" className="text-mute hover:text-red-400" onClick={() => fin3.delRec(r.id).then(bump)}><Trash2 size={16} /></button>
        </div>
      ))}
      <div className={card}>
        <div className="mb-2 font-medium">Nuovo ricorrente</div>
        <div className="mb-2 grid grid-cols-2 gap-2">
          {(["expense", "income"] as const).map((t) => (
            <button key={t} onClick={() => { setType(t); setCat(""); }} className={`rounded-lg border py-2 ${type === t ? "border-accent text-accent" : "border-line text-mute"}`}>{t === "expense" ? "Uscita" : "Entrata"}</button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={input} placeholder="Nome (es. Affitto)" value={note} onChange={(e) => setNote(e.target.value)} />
          <input className={input} inputMode="decimal" placeholder="Importo (€)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <select className={input} value={acc} onChange={(e) => setAcc(e.target.value)}>{accs.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <select className={input} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Senza categoria</option>
            {cats.filter((c) => c.type === type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className={input} value={freq} onChange={(e) => setFreq(e.target.value)}>
            <option value="weekly">Ogni settimana</option><option value="monthly">Ogni mese</option><option value="yearly">Ogni anno</option>
          </select>
          <input type="date" className={input} aria-label="Prima data" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
        <button onClick={add} className="mt-3 rounded-lg bg-accent px-4 py-2 font-medium text-black">Crea ricorrente</button>
      </div>
    </div>
  );
}

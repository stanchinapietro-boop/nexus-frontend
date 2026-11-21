import { useFinanceData as useLoad } from "../useFinanceData";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Search, Trash2, X } from "lucide-react";
import { Budget, Report } from "./FinanceMore";
import { Obiettivi, Ricorrenti } from "./FinanceMore2";
import { Donut, Impostazioni, InlineName } from "./FinanceExtra";
import { usePrefs } from "../prefs";
import { fin, fin4, eur, toCents, monthKey, localDay, type Account, type Category, type Summary, type Tx } from "../api";

const input = "w-full rounded-lg border border-line bg-ink px-3 py-2 text-base";
const card = "rounded-2xl border border-line bg-panel p-5";



function TxRow({ t, onDelete, onEdit }: { t: Tx; onDelete: () => void; onEdit: () => void }) {
  const inc = t.type === "income";
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-panel p-3">
      <span className="h-9 w-9 shrink-0 rounded-full" style={{ background: t.category_color + "33", border: `2px solid ${t.category_color}` }} />
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onEdit} title="Modifica">
        <div className="truncate font-medium">{t.note || t.category_name}</div>
        <div className="text-xs text-mute">{t.category_name} · {t.account_name}</div>
      </div>
      <div className={inc ? "text-green-400" : "text-red-400"}>{inc ? "+ " : "− "}{eur(t.amount_cents)}</div>
      <button aria-label="Elimina movimento" onClick={onDelete} className="text-mute hover:text-red-400"><Trash2 size={16} /></button>
    </div>
  );
}

function MonthNav({ month, setMonth }: { month: Date; setMonth: (d: Date) => void }) {
  const go = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  return (
    <div className="flex items-center justify-between">
      <button aria-label="Mese precedente" onClick={() => go(-1)} className="p-2"><ChevronLeft /></button>
      <div className="font-medium capitalize">{month.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}</div>
      <button aria-label="Mese successivo" onClick={() => go(1)} className="p-2"><ChevronRight /></button>
    </div>
  );
}

function Home({ rev, bump, onEdit }: { rev: number; bump: () => void; onEdit: (t: Tx) => void }) {
  const [writeError, setWriteError] = useState("");
  const mk = monthKey(new Date());
  const prefs = usePrefs();
  const show = (k: string) => !prefs.hiddenWidgets.includes(k);
  const { data: s, error } = useLoad<Summary>(() => fin.summary(mk), [rev]);
  if (error) return <p className="text-red-400">{error}</p>;
  if (!s) return null;
  const tot = Math.max(s.income_cents + s.expense_cents, 1);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {writeError && <p role="alert">{writeError}</p>}
      <div className="grid content-start gap-4">
        {show("saldo") && (
          <div className={card}>
            <div className="text-sm text-mute">Saldo totale</div>
            <div className="mt-1 text-5xl font-semibold tracking-tight">{eur(s.balance_cents)}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {s.accounts.map((a) => (
                <span key={a.id} className="rounded-full border border-line bg-ink px-3 py-1 text-sm">{a.name} <span className="text-mute">{eur(a.balance_cents)}</span></span>
              ))}
            </div>
          </div>
        )}
        {show("mese") && (
          <div className={card}>
            <div className="mb-3 font-medium capitalize">{new Date().toLocaleDateString("it-IT", { month: "long", year: "numeric" })}</div>
            <div className="flex h-3 overflow-hidden rounded-full bg-raised">
              <div className="bg-green-500" style={{ width: `${(s.income_cents / tot) * 100}%` }} />
              <div className="bg-red-500" style={{ width: `${(s.expense_cents / tot) * 100}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-3 text-sm">
              <div><div className="text-mute">Entrate</div><div className="text-lg text-green-400">+ {eur(s.income_cents)}</div></div>
              <div><div className="text-mute">Uscite</div><div className="text-lg text-red-400">− {eur(s.expense_cents)}</div></div>
              <div><div className="text-mute">Differenza</div><div className="text-lg font-semibold">{eur(s.income_cents - s.expense_cents)}</div></div>
            </div>
          </div>
        )}
      </div>
      <div className="grid content-start gap-4">
        {show("categorie") && (
          <div className={card}>
            <div className="mb-3 font-medium">Spese per categoria</div>
            {s.by_category.length === 0 && <p className="mb-2 text-sm text-mute">Nessuna spesa in questo periodo.</p>}
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <Donut data={s.by_category} total={s.expense_cents} />
              <div className="w-full min-w-0 flex-1 text-sm">
                {s.by_category.slice(0, 6).map((c) => (
                  <div key={c.category_id ?? c.name} className="flex items-center gap-2 py-1">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-mute">{Math.round((c.cents / Math.max(s.expense_cents, 1)) * 100)}%</span>
                    <span>{eur(c.cents)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {show("ultimi") && (
          <div className={card}>
            <div className="mb-3 font-medium">Ultimi movimenti</div>
            {s.recent.length === 0 && <p className="text-sm text-mute">Nessun movimento. Premi “Nuovo movimento”.</p>}
            <div className="grid gap-2">
              {s.recent.map(t => <TxRow key={t.id} t={t} onDelete={() => fin.delTx(t.id).then(() => { setWriteError(""); bump(); }).catch((e: Error) => setWriteError(e.message))} onEdit={() => onEdit(t)} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Movimenti({ rev, bump, onEdit }: { rev: number; bump: () => void; onEdit: (t: Tx) => void }) {
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();
  const selectedMonth = params.get("mese") || "";
  const month = useMemo(() => {
    const now = new Date();
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth)
      ? new Date(selectedMonth + "-01T12:00:00") : new Date(now.getFullYear(), now.getMonth(), 1);
  }, [selectedMonth]);
  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
  }
  const setMonth = (next: Date) => setFilter("mese", monthKey(next));
  const account = params.get("conto") || "";
  const category = params.get("categoria") || "";
  const type = params.get("tipo") || "";
  const { data: accounts } = useLoad(fin.accounts, []);
  const { data: categories } = useLoad(fin.categories, []);
  const [q, setQ] = useState("");
  const [writeError, setWriteError] = useState("");
  const { data: txs, error } = useLoad<Tx[]>(() => fin.txs(monthKey(month), q, { account_id: account, category_id: category, type }), [month, q, account, category, type, rev]);
  useEffect(() => {
    if (txs && /^#tx-\d+$/.test(hash)) document.getElementById(hash.slice(1))?.scrollIntoView?.({ block: "center" });
  }, [txs, hash]);
  const inc = (txs ?? []).filter((t) => t.type === "income").reduce((a, t) => a + t.amount_cents, 0);
  const exp = (txs ?? []).filter((t) => t.type === "expense").reduce((a, t) => a + t.amount_cents, 0);
  const days = [...new Set((txs ?? []).map((t) => t.day))];
  return (
    <div className="mx-auto grid max-w-2xl gap-3">
      {writeError && <p role="alert">{writeError}</p>}
      <MonthNav month={month} setMonth={setMonth} />
      <div className={`${card} grid grid-cols-3 text-sm`}>
        <div><div className="text-mute">Entrate</div><div className="text-green-400">+ {eur(inc)}</div></div>
        <div><div className="text-mute">Uscite</div><div className="text-red-400">− {eur(exp)}</div></div>
        <div><div className="text-mute">Saldo</div><div>{eur(inc - exp)}</div></div>
      </div>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-mute" />
        <input className={input + " pl-9"} placeholder="Cerca in note e categorie" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <select aria-label="Filtra per conto" className={input} value={account} onChange={e => setFilter("conto", e.target.value)}>
          <option value="">Tutti i conti</option>{accounts?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select aria-label="Filtra per categoria" className={input} value={category} onChange={e => setFilter("categoria", e.target.value)}>
          <option value="">Tutte le categorie</option>{categories?.map(c => <option key={c.id} value={c.id}>{c.name} · {c.type === "income" ? "Entrata" : "Uscita"}</option>)}
        </select>
        <select aria-label="Filtra per tipo" className={input} value={type} onChange={e => setFilter("tipo", e.target.value)}>
          <option value="">Entrate e uscite</option><option value="income">Entrate</option><option value="expense">Uscite</option>
        </select>
      </div>
      {error && <p className="text-red-400">{error}</p>}
      {txs && txs.length === 0 && <p className="text-sm text-mute">Nessun movimento in questo mese.</p>}
      {days.map((d) => (
        <div key={d} className="grid gap-2">
          <div className="mt-2 text-xs text-mute">{new Date(d).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</div>
          {txs!.filter((t) => t.day === d).map((t) => <div key={t.id} id={"tx-" + t.id} className={hash === "#tx-" + t.id ? "rounded-xl ring-1 ring-accent" : ""}><TxRow t={t} onDelete={() => fin.delTx(t.id).then(() => { setWriteError(""); bump(); }).catch((e: Error) => setWriteError(e.message))} onEdit={() => onEdit(t)} /></div>)}
        </div>
      ))}
    </div>
  );
}

function Conti({ rev, bump }: { rev: number; bump: () => void }) {
  const { data: accs, error: loadError } = useLoad<Account[]>(() => fin.accounts(), [rev]);
  const [editing, setEditing] = useState<Account | null>(null);
  const [name, setName] = useState(""); const [kind, setKind] = useState("bank"); const [start, setStart] = useState("");
  const [err, setErr] = useState("");
  const total = (accs ?? []).reduce((a, c) => a + c.balance_cents, 0);
  function selectAccount(account: Account | null) {
    setEditing(account);
    setName(account?.name ?? "");
    setKind(account?.kind ?? "bank");
    setStart(account ? String(account.initial_cents / 100).replace(".", ",") : "");
    setErr("");
  }
  async function saveAccount() {
    if (!name.trim()) return setErr("Inserisci il nome del conto.");
    const cents = start ? toCents(start) : 0;
    if (!Number.isFinite(cents)) return setErr("Inserisci un saldo valido con al massimo due decimali.");
    try {
      if (editing) await fin4.updateAccount(editing.id, name.trim(), kind, cents);
      else await fin.addAccount(name.trim(), kind, cents);
      selectAccount(null); bump();
    } catch (e) { setErr((e as Error).message); }
  }
  if (loadError) return <p role="alert">Conti non disponibili. {loadError}</p>;
  if (!accs) return <p role="status">Caricamento conti…</p>;
  return (
    <div className="mx-auto grid max-w-2xl gap-3">
      <div className={card}><div className="text-sm text-mute">Saldo totale dei conti</div><div className="text-3xl font-semibold">{eur(total)}</div></div>
      {(accs ?? []).map((a) => (
        <div key={a.id} className={`${card} flex items-center justify-between`}>
          <div><button type="button" onClick={() => { selectAccount(a); document.getElementById("finance-account-form")?.scrollIntoView({block: "center"}); }}
            className="block text-left font-medium text-accent" title="Modifica conto">{a.name}</button><Link to={`/finance/movimenti?conto=${a.id}`} className="text-xs text-accent">{a.tx_count} movimenti</Link></div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold">{eur(a.balance_cents)}</span>
            <button aria-label="Elimina conto" className="text-mute hover:text-red-400"
              onClick={() => fin.delAccount(a.id).then(() => { setErr(""); bump(); }).catch((e: Error) => setErr(e.message))}>
              <Trash2 size={16} /></button>
          </div>
        </div>
      ))}
      {(err || loadError) && <p role="alert" className="text-sm text-red-400">{err || loadError}</p>}
      <div className={card} id="finance-account-form">
        <div className="mb-2 font-medium">{editing ? "Modifica conto" : "Nuovo conto"}</div>
        {editing && <p className="mb-2 text-sm text-mute">Il saldo iniziale è la base per il calcolo del saldo del conto.</p>}
        <div className="grid gap-2 sm:grid-cols-3">
          <input className={input} placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <select className={input} value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="bank">Conto bancario</option><option value="cash">Contanti</option>
            <option value="card">Carta</option><option value="savings">Risparmio</option>
            <option value="investments">Investimenti</option><option value="other">Altro</option>
            {editing && !["bank","cash","card","savings","investments","other"].includes(editing.kind) && <option value={editing.kind}>{editing.kind}</option>}
          </select>
          <input className={input} inputMode="decimal" placeholder="Saldo iniziale" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <button onClick={saveAccount} className="mt-3 rounded-lg bg-accent px-4 py-2 font-medium text-black">{editing ? "Salva conto" : "Aggiungi conto"}</button>
        {editing && <button className="ml-3 text-sm text-mute" onClick={() => selectAccount(null)}>Annulla</button>}
      </div>
    </div>
  );
}

function Categorie({ rev, bump }: { rev: number; bump: () => void }) {
  const [err, setErr] = useState("");
  const { data: cats, error: loadError } = useLoad<Category[]>(() => fin.categories(), [rev]);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [name, setName] = useState(""); const [color, setColor] = useState("#ff6a1a");
  async function add() {
    if (!name.trim()) return;
    try { await fin.addCategory(name.trim(), type, color); setName(""); setErr(""); bump(); }
    catch (e) { setErr((e as Error).message); }
  }
  return (
    <div className="mx-auto grid max-w-2xl gap-3">
      <div className="grid grid-cols-2 gap-2">
        {(["expense", "income"] as const).map((t) => (
          <button key={t} onClick={() => setType(t)}
            className={`rounded-lg border py-2 ${type === t ? "border-accent text-accent" : "border-line text-mute"}`}>
            {t === "expense" ? "Uscite" : "Entrate"}
          </button>
        ))}
      </div>
      <div className="grid gap-2">
        {(cats ?? []).filter((c) => c.type === type).map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-lg border border-line bg-panel p-3">
            <input type="color" aria-label="Colore categoria" value={c.color} onChange={(e) => fin4.updateCategory(c.id, c.name, c.type, e.target.value).then(bump).catch((e: Error) => setErr(e.message))} className="h-6 w-6 shrink-0 cursor-pointer rounded-full bg-transparent" />
            <div className="flex-1"><InlineName value={c.name} onSave={(n) => fin4.updateCategory(c.id, n, c.type, c.color).then(bump).catch((e: Error) => setErr(e.message))} /></div>
            <button aria-label="Elimina categoria" className="text-mute hover:text-red-400" onClick={() => fin.delCategory(c.id).then(() => { setErr(""); bump(); }).catch((e: Error) => setErr(e.message))}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      {(err || loadError) && <p role="alert" className="text-sm text-red-400">{err || loadError}</p>}
      <div className={`${card} flex gap-2`}>
        <input type="color" aria-label="Colore" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-12 rounded bg-ink" />
        <input className={input} placeholder="Nuova categoria" value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={add} className="rounded-lg bg-accent px-4 font-medium text-black">Aggiungi</button>
      </div>
    </div>
  );
}

function NewTxModal({ onClose, onDone, edit }: { onClose: () => void; onDone: () => void; edit?: Tx | null }) {
  const [type, setType] = useState<"expense" | "income">(edit?.type ?? "expense");
  const [amount, setAmount] = useState(edit ? String(edit.amount_cents / 100).replace(".", ",") : ""); const [note, setNote] = useState(edit?.note ?? "");
  const [day, setDay] = useState(edit?.day ?? localDay());
  const [accs, setAccs] = useState<Account[]>([]); const [cats, setCats] = useState<Category[]>([]);
  const [acc, setAcc] = useState(""); const [cat, setCat] = useState(edit?.category_id ? String(edit.category_id) : ""); const [err, setErr] = useState("");
  useEffect(() => {
    fin.accounts().then((a) => { setAccs(a); setAcc(String(edit?.account_id ?? a[0]?.id ?? "")); }).catch((e: Error) => setErr(e.message));
    fin.categories().then(setCats).catch((e: Error) => setErr(e.message));
  }, []);
  const [saving, setSaving] = useState(false);
  async function save() {
    if (saving) return;
    const cents = toCents(amount);
    if (!cents || cents <= 0) return setErr("Inserisci un importo valido.");
    if (!acc) return setErr("Crea prima un conto.");
    setSaving(true);
    try {
      const body = { type, amount_cents: cents, day, note, account_id: Number(acc), category_id: cat ? Number(cat) : null };
      if (edit) await fin4.updateTx(edit.id, body); else await fin.addTx(body);
      onDone(); onClose();
    } catch (e) { setErr((e as Error).message); setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 md:items-center md:p-4" onClick={onClose}>
      <div className="max-h-[100dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-line bg-panel p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">{edit ? "Modifica movimento" : "Nuovo movimento"}</h2>
          <button aria-label="Chiudi" onClick={onClose}><X size={20} /></button></div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {(["expense", "income"] as const).map((t) => (
            <button key={t} onClick={() => { setType(t); setCat(""); }}
              className={`rounded-lg border py-2 ${type === t ? "border-accent text-accent" : "border-line text-mute"}`}>
              {t === "expense" ? "Uscita" : "Entrata"}</button>
          ))}
        </div>
        <div className="grid gap-2">
          <input className={input} inputMode="decimal" placeholder="Importo (€)" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
          <select className={input} value={acc} onChange={(e) => setAcc(e.target.value)}>
            {accs.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <select className={input} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Senza categoria</option>
            {cats.filter((c) => c.type === type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <input type="date" className={input} value={day} onChange={(e) => setDay(e.target.value)} />
          <input className={input} placeholder="Nota (facoltativa)" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
        <button disabled={saving} onClick={save} className="mt-3 w-full rounded-lg bg-accent py-2.5 font-medium text-black">Salva movimento</button>
      </div>
    </div>
  );
}

const TABS = [["/finance", "Home"], ["/finance/movimenti", "Movimenti"], ["/finance/conti", "Conti"], ["/finance/categorie", "Categorie"], ["/finance/budget", "Budget"], ["/finance/obiettivi", "Obiettivi"], ["/finance/ricorrenti", "Ricorrenti"], ["/finance/report", "Report"], ["/finance/impostazioni", "Impostazioni"]];

export default function Finance() {
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get("nuova") === "1") {
      setEdit(null);
      setOpen(true);
      const next = new URLSearchParams(params);
      next.delete("nuova");
      setParams(next, { replace: true });
    }
  }, [params, setParams]);
  const [rev, setRev] = useState(0);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Tx | null>(null);
  const prefs = usePrefs();
  const bump = useCallback(() => setRev((r) => r + 1), []);
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Finance</h1>
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-medium text-black">
          <Plus size={18} /> Nuovo movimento</button>
      </div>
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.filter(([to]) => !prefs.hiddenTabs.includes(to.split("/")[2])).map(([to, label]) => (
          <NavLink key={to} to={to} end className={({ isActive }) =>
            `whitespace-nowrap px-4 py-2 text-sm ${isActive ? "border-b-2 border-accent text-accent" : "text-mute"}`}>{label}</NavLink>
        ))}
      </div>
      <Routes>
        <Route index element={<Home rev={rev} bump={bump} onEdit={setEdit} />} />
        <Route path="movimenti" element={<Movimenti rev={rev} bump={bump} onEdit={setEdit} />} />
        <Route path="conti" element={<Conti rev={rev} bump={bump} />} />
        <Route path="budget" element={<Budget rev={rev} bump={bump} />} />
        <Route path="obiettivi" element={<Obiettivi rev={rev} bump={bump} />} />
        <Route path="ricorrenti" element={<Ricorrenti rev={rev} bump={bump} />} />
        <Route path="report" element={<Report rev={rev} />} />
        <Route path="impostazioni" element={<Impostazioni />} />
        <Route path="categorie" element={<Categorie rev={rev} bump={bump} />} />
      </Routes>
      {(open || edit) && <NewTxModal edit={edit} onClose={() => { setOpen(false); setEdit(null); }} onDone={bump} />}
    </div>
  );
}

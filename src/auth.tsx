import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";

const BASE = import.meta.env.PROD ? "/api" : (import.meta.env.VITE_API_BASE ?? "/api");
type Status = { setup_required: boolean; setup_available: boolean; authenticated: boolean };

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}/auth${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `Errore ${res.status}`;
    try { const j = await res.json(); if (typeof j.detail === "string") msg = j.detail; } catch { /* risposta non JSON */ }
    throw new Error(msg);
  }
  return res.json();
}

export const logout = () => call("/logout", {}).catch(() => undefined).finally(() => window.location.reload());

const field = "w-full rounded-xl border border-line bg-ink px-4 py-3 text-base outline-none focus:border-accent";

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center p-6" style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}>
      <div className="w-full max-w-sm rounded-2xl border border-line bg-panel p-7 shadow-2xl shadow-black/40">
        <div className="mb-1 text-lg font-semibold tracking-tight">NEXUS <span className="text-accent">LIFE OS</span></div>
        <h1 className="mb-5 text-sm text-mute">{title}</h1>
        {children}
      </div>
    </div>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try { await call("/login", { password: pw }); onDone(); }
    catch (x) { setErr(x instanceof Error ? x.message : "Errore"); setPw(""); }
    finally { setBusy(false); }
  }
  return (
    <Shell title="Inserisci la password per entrare">
      <form onSubmit={submit} className="grid gap-3">
        <label className="sr-only" htmlFor="pw">Password</label>
        <input id="pw" type="password" autoFocus autoComplete="current-password" className={field} placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button disabled={busy || !pw} className="rounded-xl bg-accent py-3 font-medium text-black disabled:opacity-50">{busy ? "Controllo…" : "Entra"}</button>
      </form>
    </Shell>
  );
}

function Setup({ available, onDone }: { available: boolean; onDone: () => void }) {
  const [code, setCode] = useState(""); const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 10) return setErr("La password deve avere almeno 10 caratteri.");
    if (pw !== pw2) return setErr("Le due password non coincidono.");
    setBusy(true);
    try { await call("/setup", { code, password: pw }); onDone(); }
    catch (x) { setErr(x instanceof Error ? x.message : "Errore"); }
    finally { setBusy(false); }
  }
  return (
    <Shell title="Prima configurazione: scegli la password di accesso">
      {!available && <p className="mb-3 text-sm text-red-400">Sul server manca SETUP_CODE (almeno 16 caratteri). Aggiungilo nelle variabili d'ambiente e rifai il deploy.</p>}
      <form onSubmit={submit} className="grid gap-3">
        <input type="password" autoComplete="off" className={field} placeholder="Codice di configurazione" value={code} onChange={(e) => setCode(e.target.value)} />
        <input type="password" autoComplete="new-password" className={field} placeholder="Nuova password (min. 10 caratteri)" value={pw} onChange={(e) => setPw(e.target.value)} />
        <input type="password" autoComplete="new-password" className={field} placeholder="Ripeti la password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button disabled={busy || !code || !pw} className="rounded-xl bg-accent py-3 font-medium text-black disabled:opacity-50">{busy ? "Salvo…" : "Imposta password"}</button>
      </form>
    </Shell>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [st, setSt] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const refresh = useCallback(() => {
    call<Status>("/status").then((s) => { setSt(s); setError(""); }).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => {
    refresh();
    const onUnauthorized = () => setSt((s) => (s ? { ...s, authenticated: false } : s));
    window.addEventListener("nexus:unauthorized", onUnauthorized);
    return () => window.removeEventListener("nexus:unauthorized", onUnauthorized);
  }, [refresh]);

  if (!st)
    return (
      <Shell title={error ? "Il server non risponde" : "Caricamento…"}>
        {error && (<><p className="mb-3 text-sm text-red-400">{error}</p>
          <button onClick={refresh} className="w-full rounded-xl border border-line py-3">Riprova</button></>)}
      </Shell>
    );
  if (st.authenticated) return <>{children}</>;
  return st.setup_required ? <Setup available={st.setup_available} onDone={refresh} /> : <Login onDone={refresh} />;
}

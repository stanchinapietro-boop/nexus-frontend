import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { projects, projectStates, type Project, type ProjectFields } from "../coreRecords";
const blank: ProjectFields = { title:"", description:"", status:"idea", progress:0, milestone:"", target_date:null };
const input = "mt-1 block w-full rounded-lg border border-line bg-ink p-2";
const button = "rounded-lg border border-line px-3 py-2 hover:bg-raised";

export default function Projects() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<Project[] | null>(null);
  const [draft, setDraft] = useState<ProjectFields | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (params.get("nuovo") === "1") { setEditId(null); setDraft({...blank}); setParams({}, {replace:true}); }
  }, [params,setParams]);
  useEffect(() => {
    let active = true;
    projects.list().then(r => { if(active) setRows(r); }).catch(() => { if(active) setError("Impossibile caricare i progetti."); });
    return () => { active=false; };
  }, [retry]);
  async function save(e: FormEvent) {
    e.preventDefault(); if(!draft || busy || !draft.title.trim()) return;
    setBusy(true); setError("");
    try {
      const record = await projects.save(editId, draft);
      setRows(old => [record, ...(old ?? []).filter(p => p.id !== record.id)]);
      setDraft(null); setParams({id:String(record.id)});
    } catch { setError("Salvataggio non riuscito. I campi sono ancora disponibili."); }
    finally { setBusy(false); }
  }
  async function remove(project: Project) {
    if (busy || !window.confirm("Eliminare il progetto «" + project.title + "»?")) return;
    setBusy(true); setError("");
    try { await projects.remove(project.id); setRows(old => (old ?? []).filter(p=>p.id!==project.id)); setParams({}); }
    catch { setError("Eliminazione non riuscita."); } finally { setBusy(false); }
  }
  const visible = rows?.filter(p=>!params.get("id") || String(p.id)===params.get("id"));
  return <section className="mx-auto max-w-3xl space-y-4"><header className="flex flex-wrap items-center justify-between gap-3">
    <h1 className="text-3xl font-semibold">Progetti</h1>
    {!draft && <button className={button} disabled={busy} onClick={()=>{setEditId(null);setDraft({...blank});}}>Nuovo progetto</button>}</header>
    {error && <p role="alert">{error} <button className="text-accent" onClick={()=>{setError("");setRetry(v=>v+1);}}>Riprova</button></p>}
    {draft ? <form onSubmit={save} className="rounded-xl border border-line bg-panel p-5"><fieldset disabled={busy} className="space-y-3">
      <label className="block">Nome<input className={input} required maxLength={200} autoFocus value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
      <label className="block">Descrizione<textarea className={input} maxLength={20000} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
      <label className="block">Stato<select className={input} value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as ProjectFields["status"]})}>{Object.entries(projectStates).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <label className="block">Avanzamento (%)<input className={input} type="number" min={0} max={100} required value={draft.progress} onChange={e=>setDraft({...draft,progress:Number(e.target.value)})}/></label>
      <label className="block">Prossima milestone<input className={input} maxLength={200} value={draft.milestone} onChange={e=>setDraft({...draft,milestone:e.target.value})}/></label>
      <label className="block">Data obiettivo<input type="date" className={input} value={draft.target_date ?? ""} onChange={e=>setDraft({...draft,target_date:e.target.value||null})}/></label>
      <div className="flex gap-2"><button className={button}>Salva progetto</button><button className={button} type="button" onClick={()=>setDraft(null)}>Annulla</button></div>
    </fieldset></form> : <>
      {params.has("id") && <Link className="text-accent" to="/projects">Tutti i progetti</Link>}
      {!rows && !error && <p role="status">Caricamento…</p>}
      {visible?.length===0 && <p className="text-mute">{params.has("id")?"Progetto non disponibile.":"Nessun progetto registrato."}</p>}
      {visible?.map(p=><article key={p.id} className="space-y-2 rounded-xl border border-line bg-panel p-4">
        <h2 className="break-words font-semibold">{p.title}</h2><p className="text-sm text-mute">{projectStates[p.status]} · {p.progress}%</p>
        <progress aria-label="Avanzamento" max={100} value={p.progress} className="w-full accent-accent"/>
        {p.description && <p className="whitespace-pre-wrap break-words">{p.description}</p>}
        {p.milestone && <p>Prossima milestone · {p.milestone}</p>}{p.target_date && <p>Data obiettivo · {p.target_date}</p>}
        <div className="flex gap-2"><button disabled={busy} className={button} onClick={()=>{const {id,updated_at,...fields}=p;setEditId(id);setDraft(fields);}}>Modifica</button>
          <button disabled={busy} className={button} onClick={()=>void remove(p)}>Elimina</button></div>
      </article>)}</>}
  </section>;
}

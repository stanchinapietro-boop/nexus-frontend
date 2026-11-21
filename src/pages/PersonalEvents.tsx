import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { events, type LifeEvent } from "../coreRecords";
const blank = {title:"", start:"", end:"", location:"", description:"", category:"personal"};
const field = "mt-1 block w-full rounded-lg border border-line bg-ink p-2";
const button = "rounded-lg border border-line px-3 py-2 text-sm hover:bg-raised";
function localInput(stamp: string) {
  const d = new Date(stamp);
  return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
export default function PersonalEvents({ month }: { month: string }) {
  const [params,setParams] = useSearchParams();
  const id = params.get("evento");
  const [rows,setRows] = useState<LifeEvent[] | null>(null);
  const [draft,setDraft] = useState<typeof blank | null>(null);
  const [editing,setEditing] = useState<number | null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [attempt,setAttempt] = useState(0);
  useEffect(()=>{
    if(params.has("nuovo")) { setDraft({...blank}); setEditing(null); setParams({}, {replace:true}); }
  },[params,setParams]);
  useEffect(()=>{
    let active=true;
    events.list().then(value=>{if(active)setRows(value);}).catch(()=>{if(active)setError("Eventi non disponibili.");});
    return ()=>{active=false;};
  },[attempt]);
  useEffect(() => {
    const selected = rows?.find(row => String(row.id) === id);
    if (selected && !params.has("giorno")) setParams({ evento: String(selected.id), giorno: localInput(selected.starts_at).slice(0,10) }, {replace:true});
  }, [rows,id,params,setParams]);
  async function save(e: FormEvent) {
    e.preventDefault(); if (!draft || busy) return;
    if (draft.end && draft.end < draft.start) {setError("La fine precede l’inizio.");return;}
    setBusy(true);setError("");
    try {
      const saved=await events.save(editing,{title:draft.title,category:draft.category,location:draft.location,description:draft.description,
        starts_at:new Date(draft.start).toISOString(),ends_at:draft.end?new Date(draft.end).toISOString():null});
      setRows(old=>[...(old??[]).filter(r=>r.id!==saved.id),saved].sort((a,b)=>a.starts_at.localeCompare(b.starts_at)));
      setDraft(null);setParams({evento:String(saved.id),giorno:draft.start.slice(0,10)});
    } catch {setError("Salvataggio non riuscito. I campi sono ancora disponibili.");} finally {setBusy(false);}
  }
  async function remove(row: LifeEvent) {
    if (busy || !window.confirm("Eliminare l’evento «"+row.title+"»?")) return;
    setBusy(true);setError("");
    try {await events.remove(row.id);setRows(old=>(old??[]).filter(r=>r.id!==row.id));setParams({});}
    catch {setError("Eliminazione non riuscita.");} finally {setBusy(false);}
  }
  const visible=rows?.filter(r => id ? String(r.id)===id : localInput(r.starts_at).startsWith(month));
  return <section className="space-y-3 rounded-xl border border-line bg-panel p-4"><header className="flex flex-wrap items-center justify-between gap-2">
    <h2 className="text-xl font-semibold">Eventi personali</h2>{!draft && <button disabled={busy} className={button} onClick={()=>{setEditing(null);setDraft({...blank});}}>Nuovo evento</button>}</header>
    {error && <p role="alert">{error} <button className="text-accent" onClick={()=>{setError("");setAttempt(n=>n+1);}}>Riprova</button></p>}
    {draft ? <form onSubmit={save}><fieldset disabled={busy} className="space-y-2">
      <label className="block">Titolo<input required autoFocus maxLength={180} value={draft.title} className={field} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
      <label className="block">Inizio<input type="datetime-local" required value={draft.start} className={field} onChange={e=>setDraft({...draft,start:e.target.value})}/></label>
      <label className="block">Fine<input type="datetime-local" min={draft.start} value={draft.end} className={field} onChange={e=>setDraft({...draft,end:e.target.value})}/></label>
      <label className="block">Luogo<input maxLength={180} value={draft.location} className={field} onChange={e=>setDraft({...draft,location:e.target.value})}/></label>
      <label className="block">Descrizione<textarea maxLength={4000} value={draft.description} className={field} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
      <div className="flex gap-2"><button className={button}>Salva evento</button><button className={button} type="button" onClick={()=>setDraft(null)}>Annulla</button></div>
    </fieldset></form> : <>
      {id && <button className="text-sm text-accent" onClick={()=>setParams({})}>Tutti gli eventi del mese</button>}
      {!rows && !error && <p role="status">Caricamento…</p>}{visible?.length===0 && <p className="text-mute">{id?"Evento non disponibile.":"Nessun evento personale in questo mese."}</p>}
      {visible?.map(r=><article key={r.id} className="space-y-2 border-t border-line py-2"><h3 className="break-words font-semibold">{r.title}</h3>
        <p className="text-sm text-mute">{new Date(r.starts_at).toLocaleString("it-IT")}{r.ends_at && " – "+new Date(r.ends_at).toLocaleString("it-IT")}{r.location && " · "+r.location}</p>
        {r.description && <p className="whitespace-pre-wrap break-words">{r.description}</p>}<div className="flex gap-2">
          <button disabled={busy} className={button} onClick={()=>{setEditing(r.id);setDraft({title:r.title,start:localInput(r.starts_at),end:r.ends_at?localInput(r.ends_at):"",location:r.location,description:r.description,category:r.category});}}>Modifica evento</button>
          <button disabled={busy} className={button} onClick={()=>void remove(r)}>Elimina evento</button></div></article>)}</>}
  </section>;
}

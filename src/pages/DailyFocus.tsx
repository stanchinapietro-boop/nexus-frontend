import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { read, write, type DayPlan, btn, field, panel } from "../planner";

export type FocusOption = { key: string; title: string; to: string; source: string };
export default function DailyFocus({day,options,partial,onChange}:{day:string;options:FocusOption[];partial:boolean;onChange?:()=>void}){
  const [plan,setPlan]=useState<DayPlan|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const [rev,setRev]=useState(0),[legacy,setLegacy]=useState<string[]>([]);
  useEffect(()=>{let live=true;setPlan(null);setError("");setLegacy([]);
    read<DayPlan>("days/"+day).then(p=>{if(!live)return;setPlan(p);
      if(!p.version)try{const old=JSON.parse(localStorage.getItem("nexus.daily-focus.v1")??"null");
        if(old?.day===day && Array.isArray(old.keys))setLegacy(old.keys.filter((v:unknown)=>typeof v==="string").slice(0,3));}catch{/* Storage opzionale. */}
    }).catch((e:Error)=>{if(live)setError(e.message);});return()=>{live=false;};},[day,rev]);
  const missingKeys=plan?.priorities.filter(k=>!options.some(x=>x.key===k)).join("|")??"";
  const [extra,setExtra]=useState<FocusOption[]>([]);
  useEffect(()=>{
    let active=true;
    if(missingKeys)import("../plannerSources").then(m=>m.loadSources()).then(s=>{if(active)setExtra(s.items);}).catch(()=>{});
    else setExtra([]);
    return ()=>{active=false;};
  },[missingKeys,day]);
  async function save(keys:string[]){
    if(!plan||busy)return;setBusy(true);setError("");
    try{setPlan(await write<DayPlan>("days/"+day,"PUT",{...plan,priorities:keys}));setLegacy([]);onChange?.();}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <section className={panel}><h2 className="font-semibold">Focus di oggi</h2>
    {error&&<p role="alert">{error} <button className={btn} onClick={()=>setRev(n=>n+1)}>Ricarica priorità</button></p>}
    {plan&&<><ol>{plan.priorities.map((k,i)=>{const item=options.find(x=>x.key===k)??extra.find(x=>x.key===k);return <li key={k} className="flex items-center justify-between gap-2 border-b border-line py-1">
      {item?<Link className="min-w-0 break-words" to={item.to}>{i+1}. {item.title}</Link>:<span>{i+1}. Riferimento non disponibile</span>}
      <button disabled={busy} aria-label={"Rimuovi priorità "+(i+1)} onClick={()=>save(plan.priorities.filter(x=>x!==k))} className={btn}>Rimuovi</button></li>;})}</ol>
      {plan.priorities.length<3&&<label className="block text-sm">Aggiungi una priorità<select disabled={busy} className={field} value="" onChange={e=>save([...plan.priorities,e.target.value])}><option value="">Seleziona un’attività</option>
      {options.filter(x=>!plan.priorities.includes(x.key)).map(x=><option key={x.key} value={x.key}>{x.source} · {x.title}</option>)}</select></label>}
      {!!legacy.length&&<button className={btn} disabled={busy} onClick={()=>save(legacy)}>Recupera le priorità salvate su questo dispositivo</button>}
    </>}{!plan&&!error&&<p role="status">Caricamento priorità…</p>}{partial&&<p className="text-sm text-mute">Alcune fonti sono in caricamento o indisponibili.</p>}
  </section>;
}

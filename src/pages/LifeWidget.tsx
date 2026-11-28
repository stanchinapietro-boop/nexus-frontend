import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {lifeApi} from "../lifeResources";
import {widgetNames} from "../prefs";

type Kind="goals"|"habits"|"health";
type Row={id:number;label:string;detail:string};
const source:Record<Kind,{path:string;empty:string;read:()=>Promise<Row[]>}>={
  goals:{path:"/goals",empty:"Nessun obiettivo attivo.",read:async()=>(await lifeApi.goals()).filter(g=>g.active).slice(0,5)
    .map(g=>({id:g.id,label:g.title,detail:g.progress===null?g.category:g.progress+"%"}))},
  habits:{path:"/life?tab=abitudini",empty:"Nessuna abitudine prevista oggi.",read:async()=>(await lifeApi.habits()).filter(h=>h.active && h.scheduled_today)
    .map(h=>({id:h.id,label:h.name,detail:h.today_completed?"Completata":"Da completare"}))},
  health:{path:"/health",empty:"Nessun allenamento completato.",read:async()=>(await lifeApi.workouts()).filter(w=>w.completed)
    .sort((a,b)=>b.day.localeCompare(a.day)||b.id-a.id).slice(0,5).map(w=>({id:w.id,label:w.name,detail:w.day+" · "+w.duration_minutes+" min"}))},
};
export default function LifeWidget({kind}:{kind:Kind}){
  const [rows,setRows]=useState<Row[]|null>(null),[error,setError]=useState(false),[attempt,retry]=useState(0);
  useEffect(()=>{
    let live=true;setRows(null);setError(false);
    source[kind].read().then(r=>{if(live)setRows(r);}).catch(()=>{if(live)setError(true);});
    return ()=>{live=false;};
  },[kind,attempt]);
  return <section className="rounded-xl border border-line bg-panel p-4"><h2 className="font-semibold">{widgetNames[kind]}</h2>
    {error?<button onClick={()=>retry(n=>n+1)}>Dati indisponibili · Riprova</button>:!rows?<p role="status">Caricamento…</p>:
      !rows.length?<p className="text-mute">{source[kind].empty}</p>:<ul>{rows.map(r=><li className="py-1" key={r.id}>{r.label} <small className="text-mute">{r.detail}</small></li>)}</ul>}
    <Link className="mt-2 inline-block text-sm text-accent" to={source[kind].path}>Apri modulo</Link></section>;
}

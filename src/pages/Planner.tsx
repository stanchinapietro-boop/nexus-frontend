import { useEffect,useState } from "react";
import { Link,useSearchParams } from "react-router-dom";
import { localDay } from "../schoolAgenda";
import { useTasks } from "./Tasks";
import { tt } from "../api";
import { loadSources } from "../plannerSources";
import { read,write,weekSummary,budget,remainingEstimate,classify,emptyPlace,field,panel,btn,monday,moveDay,type DayPlan,type Week,type Area,type Block,type Focus,type Item,type Placement } from "../planner";
import { Weekly,Areas,Blocks,FocusTimer } from "./PlannerEditors";
import { Goals,Habits,Routines } from "./LifeResources";
import DailyFocus from "./DailyFocus";
import { PlanAssistant } from "./PlannerAssistant";
const tabs=[["oggi","Oggi"],["settimana","Settimana e revisione"],["matrice","Matrice"],["tempo","Tempo"],["aree","Aree di vita"],["obiettivi","Obiettivi"],["abitudini","Abitudini e routine"],["focus","Focus"],["insights","Analisi"],["assistente","Assistente"]];
async function load(day:string){
 const [sources,plan,week,placement,areas,blocks,sessions,history,summary]=await Promise.all([loadSources(),read<DayPlan>("days/"+day),read<Week>("weeks/"+monday(day)),read<Placement[]>("placements"),read<Area[]>("areas"),read<Block[]>("blocks"),read<Focus[]>("focus"),read<string[]>("weeks"),weekSummary(day)]);
 return {sources,plan,week,placement,areas,blocks,sessions,history,summary,day};
}
type Data=Awaited<ReturnType<typeof load>>;
const hh=(n:number|null)=>n===null?"":String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
const mins=(s:string)=>s?Number(s.slice(0,2))*60+Number(s.slice(3)):null;
function Hours({plan,save}:{plan:DayPlan;save:(p:DayPlan)=>void}){
 const [a,setA]=useState(hh(plan.start_min)),[b,setB]=useState(hh(plan.end_min));
 return <form className="flex flex-wrap items-end gap-2" onSubmit={e=>{e.preventDefault();save({...plan,start_min:mins(a),end_min:mins(b)});}}>
 <label>Disponibile dalle<input type="time" required className={field} value={a} onChange={e=>setA(e.target.value)}/></label><label>Alle<input type="time" required className={field} value={b} onChange={e=>setB(e.target.value)}/></label><button className={btn}>Salva disponibilità</button></form>;
}
function Organize({item,p,areas,items,save}:{item:Item;p:Placement;areas:Area[];items:Item[];save:(p:Placement)=>void}){
 const [draft,set]=useState(p);
 useEffect(()=>set(p),[p.key,p.version]);
 return <details className="mt-2"><summary className="cursor-pointer py-2 text-sm text-accent">Pianifica {item.title}</summary><form className="grid gap-2 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();save(draft);}}>
 <label>Giorno pianificato<input type="date" className={field} value={draft.scheduled??""} onChange={e=>set({...draft,scheduled:e.target.value||null})}/></label>
 <label>Stima in minuti<input type="number" className={field} min="1" max="1440" value={draft.minutes??""} placeholder={item.minutes?String(item.minutes):""} onChange={e=>set({...draft,minutes:e.target.value?+e.target.value:null})}/></label>
 <label>Quadrante<select className={field} value={draft.quadrant??""} onChange={e=>set({...draft,quadrant:e.target.value?+e.target.value:null})}><option value="">Automatico</option>{[1,2,3,4].map(n=><option key={n} value={n}>Q{n}</option>)}</select></label>
 <label>Area<select className={field} value={draft.area_id??""} onChange={e=>set({...draft,area_id:e.target.value?+e.target.value:null})}><option value="">Senza area</option>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
 {(["goal","project"] as const).map(type=><label key={type}>{type==="goal"?"Obiettivo collegato":"Progetto collegato"}<select className={field} value={draft[type==="goal"?"goal_id":"project_id"]??""} onChange={e=>set({...draft,[type==="goal"?"goal_id":"project_id"]:e.target.value?Number(e.target.value):null})}><option value="">Nessuno</option>{items.filter(x=>x.key.startsWith(type+"-")&&x.key!==item.key).map(x=><option key={x.key} value={x.key.split("-")[1]}>{x.title}</option>)}</select></label>)}
 <label>Energia richiesta<select aria-label="Energia richiesta" className={field} value={draft.energy??""} onChange={e=>set({...draft,energy:(e.target.value||null) as Placement["energy"]})}><option value="">Non indicata</option>{(["bassa","media","alta"] as const).map(v=><option key={v}>{v}</option>)}</select></label>
 <label>Contesto<input className={field} value={draft.context} maxLength={100} onChange={e=>set({...draft,context:e.target.value})}/></label>
 <label>Richiede prima<select aria-label="Aggiungi dipendenza" className={field} value="" onChange={e=>e.target.value&&set({...draft,dependencies:[...draft.dependencies,e.target.value]})}><option value="">Scegli attività</option>{items.filter(x=>x.task&&x.key!==item.key&&!draft.dependencies.includes(x.key)).map(x=><option key={x.key} value={x.key}>{x.title}</option>)}</select></label>
 {draft.dependencies.map(k=><button type="button" key={k} className={btn} onClick={()=>set({...draft,dependencies:draft.dependencies.filter(v=>v!==k)})}>Scollega {items.find(x=>x.key===k)?.title??k}</button>)}
 <button className={btn}>Salva pianificazione</button></form></details>;
}
export default function Planner({legacy=false,assistant=false}:{legacy?:boolean;assistant?:boolean}){
 const [params,setParams]=useSearchParams();const today=localDay(new Date()),requested=params.get("giorno")??"";
 const day=/^\d{4}-\d{2}-\d{2}$/.test(requested)&&Number.isFinite(Date.parse(requested))?requested:today;
 const tab=assistant?"assistente":params.get("tab")||"oggi";
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[rev,bump]=useState(0);
 const [focusKey,setFocusKey]=useState("");const tick=useTasks();
 const navigate=(t:string,d=day)=>setParams({tab:t,giorno:d});
 useEffect(()=>{let live=true;setError("");load(day).then(d=>{if(live)setData(d);}).catch((e:Error)=>{if(live){setData(null);setError(e.message);}});return()=>{live=false;};},[day,rev]);
 async function run(fn:()=>Promise<unknown>){if(busy)return false;setBusy(true);setError("");try{await fn();setData(await load(day));return true;}catch(e){setError((e as Error).message);return false;}finally{setBusy(false);}}
 const header=<header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-semibold">{assistant?"AI Assistant":"Life Planner"}</h1><p className="text-mute">{new Date().getHours()<13?"Buongiorno":new Date().getHours()<18?"Buon pomeriggio":"Buonasera"} · {new Date(day+"T12:00").toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})} · settimana del {monday(day)}</p></div>
 <label>Data del piano<input type="date" className={field} value={day} onChange={e=>e.target.value&&navigate(tab,e.target.value)}/></label></header>;
 if(!data||data.day!==day)return <section>{header}{error?<p role="alert">{error} <button className={btn} onClick={()=>bump(v=>v+1)}>Riprova</button></p>:<p role="status">Caricamento del piano…</p>}</section>;
 const d=data,s=d.sources;
 const items:Item[]=[...s.items,...(tick.data?.tasks??[]).map(t=>({key:"tt-"+t.project_id+"-"+t.id,title:t.title,source:"TickTick",to:"/tasks",due:t.due_date,done:false,important:t.priority>=3,task:true,complete:async()=>{await tt.complete(t.project_id,t.id);await tick.load();}}))];
 const place=(k:string)=>d.placement.find(p=>p.key===k)??emptyPlace(k);
 const onDay=(x:Item)=>(place(x.key).scheduled??x.due)===day;
 const planned=items.filter(onDay),weekStart=monday(day),weekEnd=moveDay(weekStart,7);
 const pending=items.filter(x=>!x.done),must=pending.filter(x=>x.task&&(onDay(x)||!!x.due&&x.due<=day||x.important&&x.urgent));
 const estimates=planned.filter(x=>!x.done&&x.source!=="Calendario");
 const plannedMins=estimates.reduce((total,x)=>total+remainingEstimate(day,d.plan,s.calendar,d.blocks,x.key,place(x.key).minutes??x.minutes??0),0);
 const unknown=estimates.filter(x=>!(place(x.key).minutes??x.minutes)).length;
 const time=budget(day,d.plan,s.calendar,plannedMins);
 const weekly=items.filter(x=>{const v=place(x.key).scheduled??x.due;return v&&v>=weekStart&&v<weekEnd;});
 const dueSoon=pending.filter(x=>x.due&&x.due>=day&&x.due<moveDay(day,4));
 const propose=pending.filter(x=>x.task&&place(x.key).dependencies.every(k=>items.find(i=>i.key===k)?.done)).sort((a,b)=>classify(a,day,place(a.key)).q-classify(b,day,place(b.key)).q||(a.due??"9999").localeCompare(b.due??"9999")).slice(0,3);
 const focusMinutes=(start:string,end:string)=>Math.floor(d.sessions.filter(r=>r.status==="completed"&&localDay(new Date(r.started))>=start&&localDay(new Date(r.started))<end).reduce((v,r)=>v+r.elapsed,0)/60);
 const saveDay=(next:DayPlan)=>run(()=>write("days/"+day,"PUT",next));
 function row(x:Item){return <article key={x.key} className="min-w-0 break-words border-t border-line py-2"><Link to={x.to} className="font-medium">{x.title}</Link><p className="text-sm text-mute">{x.source}{x.due?" · "+x.due:""}{x.done?" · completato":""}</p>
 <div className="flex flex-wrap gap-1">{!x.done&&x.complete&&<button className={btn} onClick={()=>run(x.complete!)}>Completa</button>}{!x.done&&<button className={btn} onClick={()=>{setFocusKey(x.key);navigate("focus");}}>Focus</button>}</div>
 <Organize items={items} item={x} p={place(x.key)} areas={d.areas} save={v=>{const {key,...body}=v;void run(()=>write("placements/"+encodeURIComponent(key),"PUT",body));}}/></article>;}
 return <section className="mx-auto min-w-0 max-w-5xl space-y-4">{header}
 <nav aria-label="Sezioni Life Planner" className="flex flex-wrap gap-1">{tabs.map(([k,v])=><Link key={k} to={"/life?tab="+k+"&giorno="+day} aria-current={tab===k?"page":undefined} className={btn+(tab===k?" border-accent text-accent":"")}>{v}</Link>)}{legacy&&<Link className={btn} to="/life/archivio">Altre sezioni Life</Link>}</nav>
 {error&&<p role="alert" className="rounded border border-red-400 p-2">{error} <button className={btn} onClick={()=>bump(v=>v+1)}>Ricarica dati</button></p>}
 {(s.missing.length>0||tick.error)&&<p role="status">Fonti indisponibili: {[...s.missing,...(tick.error?["TickTick"]:[])].join(", ")}.</p>}{tick.status&&!tick.status.connected&&<Link className="text-sm text-accent" to="/tasks">TickTick da collegare in Tasks</Link>}
 <fieldset disabled={busy} className="min-w-0 space-y-4">
 {tab==="oggi"&&<><div className="grid gap-3 sm:grid-cols-3">{[["Attività pianificate",String(planned.filter(x=>x.task).length)],["Priorità concluse",d.plan.priorities.filter(k=>items.find(x=>x.key===k)?.done).length+" / "+d.plan.priorities.length],["Focus registrato",focusMinutes(day,moveDay(day,1))+" min"]].map(([l,v])=><div className={panel} key={l}><p className="text-sm text-mute">{l}</p><strong className="text-2xl">{v}</strong></div>)}</div>
 <DailyFocus key={day+":"+d.plan.version} day={day} partial={!!s.missing.length||!!tick.error} options={items} onChange={()=>bump(n=>n+1)}/>
 <section className={panel}><h2 className="font-semibold">Da fare</h2>{must.length?must.map(row):<p>Nessuna attività urgente nelle fonti disponibili.</p>}</section>
 <section className={panel}><h2 className="font-semibold">In programma</h2>{planned.filter(x=>!x.done&&!must.includes(x)).map(row)}{!planned.length&&<p>Nessun impegno pianificato.</p>}<Link className="text-accent" to={"/calendar?giorno="+day}>Apri il calendario</Link></section>
 <section className={panel}><h2 className="font-semibold">Completati nel piano del giorno</h2>{planned.filter(x=>x.done).map(row)}<p>Abitudini completate oggi: {s.habits.filter(h=>h.scheduled_today&&h.today_completed).length} / {s.habits.filter(h=>h.scheduled_today).length}</p></section></>}
 {tab==="settimana"&&<><section className={panel}><h2 className="font-semibold">Bilancio della settimana</h2><p>{d.summary.weekly_objectives_done} / {d.summary.weekly_objectives} obiettivi settimanali · {d.summary.habit_completions} completamenti abitudini registrati · {d.summary.focus_minutes} min di focus concluso.</p></section><Weekly day={weekStart} week={d.week} items={items} placements={d.placement} history={d.history} openWeek={v=>navigate(tab,v)} save={v=>run(()=>write("weeks/"+weekStart,"PUT",v))} habits={s.habits} routines={s.routines}/></>}
 {tab==="matrice"&&<div className="grid gap-3 md:grid-cols-2">{["Agisci","Pianifica","Delega o riduci","Rimanda"].map((name,i)=><section key={name} className={panel}><h2 className="font-semibold">Q{i+1} · {name}</h2>{pending.filter(x=>x.task&&classify(x,day,place(x.key)).q===i+1).map(x=><div key={x.key}>{row(x)}<p className="text-sm text-mute">{classify(x,day,place(x.key)).reason}</p></div>)}</section>)}</div>}
 {(tab==="oggi"||tab==="tempo")&&<section className={panel}><h2 className="font-semibold">Tempo disponibile</h2><Hours key={day+":"+d.plan.version} plan={d.plan} save={saveDay}/>
 <p>{time?`Finestra di ${time.capacity} min · ${time.occupied} min di calendario · ${plannedMins} min stimati fuori dai blocchi. ${time.remaining<0?"Sovraccarico di "+(-time.remaining):"Margine stimato "+time.remaining} min.`:"Imposta gli orari per stimare il tempo disponibile."}</p>{unknown>0&&<p className="text-sm text-mute">{unknown} elementi senza stima. Il margine considera solo le durate note.</p>}</section>}
 {tab==="tempo"&&<Blocks key={day} day={day} rows={s.calendar} links={d.blocks} items={items} projects={s.proj} run={run}/>}
 {tab==="aree"&&<Areas items={items} areas={d.areas} placements={d.placement} run={run}/>}
 {tab==="obiettivi"&&<><Goals goals={s.goals} run={async fn=>{await run(fn);}}/><section className={panel}><h2>Avanzamento dalle attività collegate</h2>{s.goals.map(g=>{
 const links=d.placement.filter(p=>p.goal_id===g.id&&/^(school|tt|local)-/.test(p.key));
 const resolved=links.map(p=>items.find(x=>x.key===p.key)),known=resolved.filter(Boolean).length,done=resolved.filter(x=>x?.done).length;
 return <p key={g.id}>{g.title} · {links.length?(known===links.length?done+" / "+known+" · "+Math.round(done*100/known)+"%":done+" concluse · "+(links.length-known)+" riferimenti indisponibili"):"Nessuna attività collegata"}</p>;})}</section><section className={panel}><h2>Obiettivi finanziari</h2>{items.filter(x=>x.source==="Risparmio").map(row)}<Link to="/finance/obiettivi" className="text-accent">Apri Finance</Link></section></>}
 {tab==="abitudini"&&<><Habits habits={s.habits} run={async fn=>{await run(fn);}}/><Routines routines={s.routines} run={async fn=>{await run(fn);}}/></>}
 {tab==="focus"&&<FocusTimer rows={d.sessions} items={items} initial={focusKey} run={run}/>}
 {tab==="insights"&&<section className={panel}><h2 className="font-semibold">Dal {weekStart} al {moveDay(weekEnd,-1)}</h2><p>{weekly.filter(x=>x.task&&x.done).length} attività completate sulle {weekly.filter(x=>x.task).length} con data in questa settimana. <Link className="text-accent" to={"/life?tab=settimana&giorno="+day}>Rivedi la settimana</Link></p>
 <p>{focusMinutes(weekStart,weekEnd)} min di focus nelle sessioni concluse iniziate in questa settimana.</p><p>{dueSoon.length} elementi aperti con scadenza dal {day} al {moveDay(day,3)}.</p>
 {dueSoon.map(x=><Link className="block text-accent" key={x.key} to={x.to}>{x.title} · {x.due}</Link>)}<p>{s.workouts.filter(x=>x.day>=weekStart&&x.day<weekEnd).length} allenamenti registrati dal {weekStart} al {moveDay(weekEnd,-1)}. <Link className="text-accent" to="/life?tab=tempo">Riserva tempo per lo sport</Link></p>
 <p>{d.summary.habit_completions} completamenti di abitudini registrati nella settimana. <Link className="text-accent" to="/life?tab=abitudini">Consulta lo storico</Link></p><p>{s.studies.filter(x=>localDay(new Date(x.started_at))>=weekStart&&localDay(new Date(x.started_at))<weekEnd).length} sessioni di studio iniziate nella settimana.</p></section>}
 {tab==="assistente"&&<PlanAssistant day={day} candidates={propose} time={time?.remaining??null} sources={[
 ...items,
 ...(time?[{key:"capacity-"+day,title:time.capacity+" minuti disponibili, "+time.occupied+" in calendario, margine stimato "+time.remaining+" min",source:"Budget tempo",due:day}]:[]),
 ...d.areas.map(a=>({key:"area-"+a.id,title:a.name+" · "+d.placement.filter(p=>p.area_id===a.id).length+" elementi collegati",source:"Aree di vita",due:null})),
 ...d.sessions.map(f=>({key:"focus-"+f.id,title:((items.find(x=>x.key===f.source_key)?.title??f.source_key).slice(0,110))+" · "+Math.floor(f.elapsed/60)+" min · "+f.status,source:"Sessione focus",due:localDay(new Date(f.started))})),
 ...s.studies.map(v=>({key:"study-"+v.id,title:("Studio "+(v.course_name||"individuale")).slice(0,110)+" · "+Math.floor(v.elapsed_seconds/60)+" min",source:"Sessione di studio",due:localDay(new Date(v.started_at))})),
 ...d.week.objectives.map((v,i)=>({key:"week-"+i,title:v.title,source:v.done?"Obiettivo settimanale concluso":"Obiettivo settimanale aperto",due:moveDay(weekEnd,-1)}))
 ]} onAccept={keys=>saveDay({...d.plan,priorities:keys})}/>}
 {tab==="settimana"&&<details className={panel}><summary>Pianifica elementi e scadenze</summary>{pending.map(row)}</details>}
 </fieldset></section>;
}

import type { LifeHabit, LifeRoutine } from "../lifeResources";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { LifeEvent, Project } from "../coreRecords";
import { btn,field,panel,write,moveDay,type Week,type Item,type Placement,type Area,type Focus,type Block } from "../planner";
export type Run=(fn:()=>Promise<unknown>)=>Promise<boolean>;
const dateText=(d:Date)=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
export function Weekly({week,items,placements,save,history,openWeek,day,habits,routines}:{habits:LifeHabit[];routines:LifeRoutine[];week:Week;items:Item[];placements:Placement[];save:(v:Week)=>Promise<boolean>;history:string[];openWeek:(d:string)=>void;day:string}){
 const [draft,setDraft]=useState(week),[title,setTitle]=useState(""),[main,setMain]=useState(true),[link,setLink]=useState("");
 useEffect(()=>{setDraft(week);},[week]);
 const scheduled=items.filter(x=>{const d=placements.find(p=>p.key===x.key)?.scheduled??x.due;return d&&d>=day&&d<moveDay(day,7);});
 const weekTasks=scheduled.filter(x=>x.task);
 const submit=async(e:FormEvent)=>{e.preventDefault();const next={...draft,objectives:[...draft.objectives,{title:title.trim(),main,done:false,links:link?[link]:[]}]};
 if(await save(next)){setTitle("");setLink("");}};
 return <div className="space-y-4"><section className={panel}><h2 className="font-semibold">Piano settimanale</h2>
 <div className="flex flex-wrap gap-3"><button className={btn} onClick={()=>openWeek(moveDay(day,-7))}>Settimana precedente</button><button className={btn} onClick={()=>openWeek(moveDay(day,7))}>Settimana successiva</button></div>
 <p>{weekTasks.filter(x=>x.done).length} di {weekTasks.length} attività completate{weekTasks.length?" · "+Math.round(100*weekTasks.filter(x=>x.done).length/weekTasks.length)+"%":""}</p>
 {Array.from({length:7},(_,i)=>moveDay(day,i)).map((d,i)=><div className="border-t border-line pt-2" key={d}><Link className="text-accent" to={"/calendar?giorno="+d}>{new Date(d+"T12:00").toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"short"})}</Link>
 <ul>{scheduled.filter(x=>(placements.find(p=>p.key===x.key)?.scheduled??x.due)===d).map(x=><li key={x.key}><Link to={x.to}>{x.done?"✓ ":""}{x.title} · {x.source}</Link></li>)}</ul>
 {habits.filter(h=>d>=h.start_date&&h.days.includes(i)&&!scheduled.some(x=>x.key==="habit-"+h.id&&(placements.find(p=>p.key===x.key)?.scheduled??x.due)===d)).map(h=><p key={h.id}><Link to="/life?tab=abitudini">{h.name} · Abitudine prevista</Link></p>)}
 {routines.filter(r=>r.days.includes(i)).map(r=><p key={r.id}><Link to="/life?tab=abitudini">{r.name} · Routine · {r.steps.reduce((n,x)=>n+x.duration_minutes,0)} min</Link></p>)}</div>)}</section>
 <section className={panel}><h2 className="font-semibold">Obiettivi della settimana</h2>
 {week.objectives.map((o,i)=><div key={i} className="flex flex-wrap items-center gap-2"><label className="flex-1"><input type="checkbox" checked={o.done} onChange={()=>save({...draft,objectives:week.objectives.map((v,k)=>k===i?{...v,done:!v.done}:v)})}/> {o.title} {o.main?"· principale":""}</label>
 {o.links.map(k=><span className="text-sm text-mute" key={k}>{items.find(x=>x.key===k)?.title??"Riferimento non disponibile"}</span>)}<button className={btn} onClick={()=>save({...draft,objectives:week.objectives.filter((_,k)=>k!==i)})}>Rimuovi</button></div>)}
 <form onSubmit={submit} className="space-y-2"><label>Obiettivo settimanale<input className={field} required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}/></label>
 <label><input type="checkbox" checked={main} onChange={e=>setMain(e.target.checked)}/> Principale (massimo tre)</label>
 <label className="block">Collega un’attività<select className={field} value={link} onChange={e=>setLink(e.target.value)}><option value="">Nessuna</option>{items.filter(x=>!x.done).map(x=><option key={x.key} value={x.key}>{x.title}</option>)}</select></label>
 <button className={btn} disabled={main&&week.objectives.filter(x=>x.main).length>=3}>Aggiungi obiettivo</button></form></section>
 <section className={panel}><h2 className="font-semibold">Revisione settimanale</h2>
 {([["achievements","Risultati raggiunti"],["obstacles","Ostacoli"],["next_week","Priorità per la prossima settimana"]] as const).map(([k,l])=><label className="block" key={k}>{l}<textarea aria-label={l} className={field} maxLength={3000} value={draft[k]} onChange={e=>setDraft({...draft,[k]:e.target.value})}/></label>)}
 <button className={btn} onClick={()=>save(draft)}>Salva revisione</button>
 {!!history.length&&<label className="block">Settimane salvate<select className={field} value={history.includes(day)?day:""} onChange={e=>openWeek(e.target.value)}><option value="">Scegli</option>{history.map(d=><option key={d}>{d}</option>)}</select></label>}</section></div>;
}
export function FocusTimer({rows,items,initial,run}:{rows:Focus[];items:Item[];initial:string;run:Run}){
 const [key,setKey]=useState(initial),[minutes,setMinutes]=useState(25),[notes,setNotes]=useState(""),[tick,setTick]=useState(0);
 const active=rows.find(x=>["running","paused"].includes(x.status));
 useEffect(()=>{setTick(0);if(active?.status!=="running")return;const start=Date.now();const timer=setInterval(()=>setTick(Math.floor((Date.now()-start)/1000)),1000);return()=>clearInterval(timer);},[rows,active?.status]);
 const elapsed=active?active.elapsed+tick:0;
 return <section className={panel}><h2 className="font-semibold">Sessione focus</h2>
 {active?<><p>{items.find(x=>x.key===active.source_key)?.title??active.source_key}</p>
 <p className="text-3xl tabular-nums">{Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,"0")} <small className="text-sm text-mute">/ {active.target_minutes} min</small></p>
 <div className="flex flex-wrap gap-2">{(active.status==="running"?["pause","complete","cancel"]:["resume","complete","cancel"]).map(a=><button key={a} className={btn} onClick={()=>run(()=>write("focus/"+active.id+"/"+a,"POST"))}>{({pause:"Pausa",resume:"Riprendi",complete:"Concludi",cancel:"Annulla sessione"})[a]}</button>)}</div></>:<form className="space-y-2" onSubmit={e=>{e.preventDefault();void run(()=>write("focus","POST",{source_key:key,target_minutes:minutes,notes}));}}>
 <label>Attività focus<select className={field} required value={key} onChange={e=>setKey(e.target.value)}><option value="">Seleziona</option>{items.filter(x=>!x.done).map(x=><option key={x.key} value={x.key}>{x.title}</option>)}</select></label>
 <label>Durata prevista (minuti)<input className={field} type="number" required min="1" max="360" value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/></label>
 <label>Note sessione<input className={field} maxLength={500} value={notes} onChange={e=>setNotes(e.target.value)}/></label><button className={btn}>Avvia focus</button></form>}
 <h3>Sessioni recenti</h3>{rows.slice(0,12).map(x=><p key={x.id} className="text-sm">{items.find(i=>i.key===x.source_key)?.title??x.source_key} · {new Date(x.started).toLocaleDateString("it-IT")} · {Math.floor(x.elapsed/60)} min · {({paused:"in pausa",running:"in corso",completed:"conclusa",cancelled:"annullata"})[x.status]}</p>)}</section>;
}
export function Areas({areas,placements,items,run}:{areas:Area[];placements:Placement[];items:Item[];run:Run}){
 const blank={id:0,name:"",description:"",icon:"",color:"#38bdf8",importance:3};const [d,set]=useState(blank);
 return <section className={panel}><h2 className="font-semibold">Aree di vita</h2>{areas.map(a=>{const linked=placements.filter(p=>p.area_id===a.id&&items.some(x=>x.key===p.key));return <div key={a.id} className="border-l-4 pl-3" style={{borderColor:a.color}}><button className="text-left font-semibold" onClick={()=>set(a)}>{a.icon} {a.name}</button><p className="text-sm text-mute">{linked.length} elementi collegati · {linked.reduce((s,p)=>s+(p.minutes??0),0)} min stimati · {linked.filter(p=>/^(goal|finance)-/.test(p.key)).length} obiettivi</p></div>;})}
 <form className="space-y-2" onSubmit={async e=>{e.preventDefault();const {id,...body}=d;if(await run(()=>write("areas"+(id?"/"+id:""),id?"PUT":"POST",body)))set(blank);}}>
 <label>Nome area<input className={field} required maxLength={80} value={d.name} onChange={e=>set({...d,name:e.target.value})}/></label>
 <label>Descrizione<input className={field} maxLength={300} value={d.description} onChange={e=>set({...d,description:e.target.value})}/></label>
 <div className="flex flex-wrap gap-3"><label>Icona<input className={field} maxLength={24} value={d.icon} onChange={e=>set({...d,icon:e.target.value})}/></label><label>Colore<input className="block" type="color" value={d.color} onChange={e=>set({...d,color:e.target.value})}/></label><label>Importanza<input className={field} type="number" min="1" max="5" value={d.importance} onChange={e=>set({...d,importance:Number(e.target.value)})}/></label></div>
 <button className={btn}>Salva area</button>{d.id>0&&<><button className={btn} type="button" onClick={()=>set(blank)}>Nuova area</button><button type="button" className={btn} onClick={async()=>{if(confirm("Eliminare l’area e scollegare i suoi riferimenti?")&&await run(()=>write("areas/"+d.id,"DELETE")))set(blank);}}>Elimina area</button></>}</form></section>;
}
export function Blocks({day,rows,links,items,projects,run}:{day:string;rows:LifeEvent[];links:Block[];items:Item[];projects:Project[];run:Run}){
 const blank={id:0,title:"",start:day+"T09:00",end:day+"T09:30",category:"studio",description:"",source_key:"",project:"",color:"#38bdf8"};
 const [d,set]=useState(blank),[allow,setAllow]=useState(false);
 function edit(e:LifeEvent,b:Block,copy:boolean){set({id:copy?0:e.id,title:e.title,start:dateText(new Date(e.starts_at)),end:dateText(new Date(e.ends_at??e.starts_at)),category:e.category,description:e.description,source_key:b.source_key??"",project:b.project_id?String(b.project_id):"",color:b.color});setAllow(false);}
 return <section className={panel}><h2 className="font-semibold">Blocchi di tempo</h2><Link className="text-accent" to={"/calendar?giorno="+day}>Apri Calendario</Link>
 {links.map(b=>{const x=rows.find(r=>r.id===b.event_id);return x&&dateText(new Date(x.starts_at)).startsWith(day)?<article className="border-l-4 pl-2" key={b.event_id} style={{borderColor:b.color}}><b>{x.title}</b> · {new Date(x.starts_at).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}
 <div className="flex flex-wrap gap-1"><button className={btn} onClick={()=>edit(x,b,false)}>Modifica</button><button className={btn} onClick={()=>edit(x,b,true)}>Duplica</button><button className={btn} onClick={()=>confirm("Eliminare questo blocco dal calendario?")&&run(()=>write("blocks/"+x.id,"DELETE"))}>Elimina blocco</button></div></article>:null;})}
 <form className="space-y-2" onSubmit={async e=>{e.preventDefault();if(await run(()=>write("blocks"+(d.id?"/"+d.id:""),d.id?"PUT":"POST",{title:d.title,starts_at:new Date(d.start).toISOString(),ends_at:new Date(d.end).toISOString(),category:d.category,description:d.description,color:d.color,project_id:d.project?Number(d.project):null,source_key:d.source_key||null,allow_overlap:allow}))){set(blank);setAllow(false);}}}>
 <label>Titolo blocco<input required className={field} maxLength={180} value={d.title} onChange={e=>set({...d,title:e.target.value})}/></label>
 <div className="grid gap-2 sm:grid-cols-2">{(["start","end"] as const).map(k=><label key={k}>{k==="start"?"Inizio blocco":"Fine blocco"}<input required type="datetime-local" className={field} value={d[k]} onChange={e=>{set({...d,[k]:e.target.value});setAllow(false);}}/></label>)}</div>
 <label>Tipo<select className={field} value={d.category} onChange={e=>set({...d,category:e.target.value})}>{["studio","lavoro","sport","progetto","personale","riposo","attività"].map(v=><option key={v}>{v}</option>)}</select></label>
 <label>Riferimento<select className={field} value={d.source_key} onChange={e=>set({...d,source_key:e.target.value})}><option value="">Nessuno</option>{items.filter(x=>!x.done).map(x=><option key={x.key} value={x.key}>{x.title}</option>)}</select></label>
 <label>Progetto<select className={field} value={d.project} onChange={e=>set({...d,project:e.target.value})}><option value="">Nessuno</option>{projects.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
 <label>Note del blocco<input className={field} value={d.description} onChange={e=>set({...d,description:e.target.value})}/></label><label>Colore blocco <input type="color" value={d.color} onChange={e=>set({...d,color:e.target.value})}/></label>
 <label className="block"><input type="checkbox" checked={allow} onChange={e=>setAllow(e.target.checked)}/> Consenti sovrapposizione con altri eventi</label><button className={btn}>Salva blocco</button>{d.id>0&&<button type="button" className={btn} onClick={()=>set(blank)}>Annulla modifica</button>}</form></section>;
}

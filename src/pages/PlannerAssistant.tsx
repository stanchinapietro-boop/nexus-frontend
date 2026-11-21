import {useState} from "react";
import {btn,panel,field,write,type Item} from "../planner";
export type AdviceItem=Pick<Item,"key"|"title"|"source"|"due">;
export function PlanAssistant({day,candidates,time,sources,onAccept}:{day:string;candidates:Item[];time:number|null;sources:AdviceItem[];onAccept:(keys:string[])=>Promise<boolean>}){
 const [sent,setSent]=useState(false),[cloud,setCloud]=useState(false),[text,setText]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false),[question,setQuestion]=useState("Organizza la mia giornata.");
 const [filter,setFilter]=useState("");
 const visible=sources.filter(x=>(x.title+" "+x.source).toLocaleLowerCase().includes(filter.toLocaleLowerCase())).slice(0,40);
 const [allowed,setAllowed]=useState<string[]>([]);
 return <section className={panel}><h2 className="font-semibold">Piano proposto per il {day}</h2><p>Le regole del Planner ordinano le attività aperte per quadrante, poi per scadenza. Una dipendenza aperta o indisponibile esclude l’attività dalla proposta.</p>
 {candidates.map((x,i)=><p key={x.key}>{i+1}. {x.title} · {x.source}{x.due?" · "+x.due:""}</p>)}{!candidates.length&&<p>Nessuna attività aperta nelle fonti disponibili.</p>}
 {time!==null&&<p>Margine stimato: {time} min.</p>}<button disabled={!candidates.length} className={btn} onClick={async()=>setSent(await onAccept(candidates.map(x=>x.key)))}>Conferma e sostituisci le priorità del giorno</button>{sent&&<p role="status">Priorità salvate.</p>}
 <details><summary className="cursor-pointer py-2">Consulta il modello configurato per NEXUS</summary>
 <label>Domanda<input className={field} maxLength={800} value={question} onChange={e=>setQuestion(e.target.value)}/></label>
 <p className="text-sm text-mute">Scegli i titoli, le fonti e le scadenze da condividere con il provider configurato sul server.</p>
 <label>Cerca nel contesto NEXUS<input className={field} value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Titolo oppure modulo"/></label>
 <p className="text-sm">{allowed.length} elementi selezionati. Per ogni ricerca sono visibili fino a 40 risultati.</p>
 {visible.map(x=><label key={x.key} className="block"><input type="checkbox" disabled={allowed.length>=80&&!allowed.includes(x.key)} checked={allowed.includes(x.key)} onChange={e=>setAllowed(e.target.checked?[...allowed,x.key]:allowed.filter(k=>k!==x.key))}/> {x.title}</label>)}
 <label className="block"><input type="checkbox" checked={cloud} onChange={e=>setCloud(e.target.checked)}/> Autorizzo l’invio della domanda e dei soli elementi selezionati.</label>
 <button className={btn} disabled={busy||!cloud||!allowed.length||!question.trim()} onClick={async()=>{setBusy(true);setError("");setText("");try{const result=await write<{answer:string}>("assistant","POST",{consent:true,question,day,items:sources.filter(x=>allowed.includes(x.key)).map(({title,source,due})=>({title,source,due}))});setText(result.answer);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>Chiedi al modello</button>{text&&<p className="whitespace-pre-wrap">{text}</p>}{error&&<p role="alert">{error}</p>}</details></section>;
}

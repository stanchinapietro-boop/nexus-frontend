import { sameValue } from "./configuration";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {useLocation} from "react-router-dom";
import {req,setViewRevision,viewRevision} from "./api";
import {applyCloudPrefs,type Prefs} from "./prefs";
type State={mode:string;workspace:string;revision:number;version:number;preferences:Partial<Prefs>};
export default function CloudSync({children}:{children:ReactNode}){
 const [ready,setReady]=useState(false);
 const [identity,setIdentity]=useState("");
 const [epoch,refresh]=useState(0),[notice,message]=useState(""),[pending,setPending]=useState(false);
 const observed=useRef<State|null>(null), interacted=useRef(false), path=useLocation();
 useEffect(()=>{interacted.current=false;setPending(false);const s=observed.current;if(s?.workspace)setViewRevision(s.workspace+"/"+s.revision);},[path.key]);
 useEffect(()=>{
  let live=true,seq=0;
  const queued: Partial<Prefs>[] = [];
  function optimistic(confirmed: Partial<Prefs>) {
    return Object.assign({}, confirmed, ...queued) as Partial<Prefs>;
  }
  function receive(s:State){
   if(!live)return;
   const old=observed.current;observed.current=s;setReady(true);
   if(s.mode!=="cloud"){message("Archivio locale · dati limitati a questo server");return;}
   setIdentity(s.workspace.slice(0,8));
   const tag=s.workspace+"/"+s.revision;
   if(!old)setViewRevision(tag);
   if(!old||old.workspace!==s.workspace||old.version!==s.version)applyCloudPrefs(optimistic(s.preferences));
   message("");
   if(old&&(old.workspace!==s.workspace||old.revision!==s.revision)){
    if(viewRevision!==tag){if(interacted.current)setPending(true);else {setViewRevision(tag);refresh(n=>n+1);}}
   }
  }
  async function check(){const id=++seq;try{const s=await req<State>("/sync/state",{cache:"no-store"});if(id===seq)receive(s);}catch{if(live&&id===seq)message("Server non raggiungibile o sincronizzazione indisponibile. Riprova prima di salvare.");}}
  let writes=Promise.resolve();
  const save=(e:Event)=>{const patch=(e as CustomEvent).detail;const base=observed.current;
   if(!base||base.mode!=="cloud"){message("Preferenza disponibile su questo dispositivo. Sincronizzazione cloud indisponibile.");return;}
   const expected = optimistic(base.preferences);
   queued.push(patch);
   writes=writes.then(async()=>{
    if(!live)return;
    const latest=observed.current;
    const keys = new Set<keyof Prefs>(["activeProfile", ...Object.keys(patch) as (keyof Prefs)[]]);
    if (!latest || latest.workspace !== base.workspace || [...keys].some(key =>
      !sameValue(expected[key], latest.preferences[key]))) {
      queued.shift();
      if (latest) applyCloudPrefs(optimistic(latest.preferences));
      message("Preferenza cambiata. Controlla il valore e riprova.");
      return;
    }
    try {
      const result=await req<State>("/sync/preferences",{method:"PATCH",body:JSON.stringify({patch,version:latest.version})});
      queued.shift(); seq++; receive(result);
    } catch {
      queued.shift(); await check();
      if(live && observed.current) applyCloudPrefs(optimistic(observed.current.preferences));
      if(live) message("Preferenza cloud non salvata. Verifica il valore e riprova.");
    }
   });
  };
  const tick=()=>{if(!document.hidden)void check();};
  const offline=()=>message("Offline · modifiche cloud sospese");
  void check();const timer=setInterval(tick,10000);
  window.addEventListener("nexus:save-prefs",save);window.addEventListener("online",tick);window.addEventListener("offline",offline);document.addEventListener("visibilitychange",tick);
  return()=>{live=false;setViewRevision("");clearInterval(timer);window.removeEventListener("nexus:save-prefs",save);window.removeEventListener("online",tick);window.removeEventListener("offline",offline);document.removeEventListener("visibilitychange",tick);};
 },[]);
 return <>{path.pathname==="/settings"&&identity&&<p className="text-sm text-mute">Archivio cloud NEXUS · {identity}</p>}{notice&&<p role="status">{notice}</p>}{pending&&<button className="rounded border p-2" onClick={()=>{interacted.current=false;setPending(false);const s=observed.current;if(s)setViewRevision(s.workspace+"/"+s.revision);refresh(n=>n+1);}}>Dati aggiornati sul server · ricarica questa sezione dopo aver salvato le bozze</button>}
 <div key={epoch} onClickCapture={()=>{interacted.current=true;}} onChangeCapture={()=>{interacted.current=true;}}>{ready?children:<p role="status">Connessione all’archivio NEXUS…</p>}</div></>;
}

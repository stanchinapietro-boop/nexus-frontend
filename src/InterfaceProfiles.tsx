import {useState} from "react";
import {appearance,profilePatch,setPrefs,usePrefs} from "./prefs";
import {newProfileId} from "./configuration";
const button="rounded-lg border border-line px-3 py-2 disabled:opacity-40";
export default function InterfaceProfiles(){
  const prefs=usePrefs();
  const [name,setName]=useState(""),[confirm,setConfirm]=useState<string|null>(null);
  const library=prefs.interfaceProfiles;
  function capture(){return {workspaceId:prefs.activeProfile,appearance:appearance(prefs)};}
  return <div className="space-y-3"><div className="flex flex-wrap items-end gap-2">
    <label>Nome del profilo<input value={name} maxLength={60} className="ml-2 rounded-lg border border-line bg-ink p-2"
      onChange={e=>setName(e.target.value)}/></label>
    <button className={button} disabled={!name.trim() || library.length>=12 || library.some(p=>p.name===name.trim())}
      onClick={()=>{setPrefs({interfaceProfiles:[...library,{id:newProfileId(),name:name.trim(),...capture()}]});setName("");}}>Salva profilo corrente</button>
    </div>
    <ul className="divide-y divide-line">{library.map(p=>{
      const workspace=prefs.profiles.find(w=>w.id===p.workspaceId);
      return <li key={p.id} className="flex flex-wrap items-center gap-2 py-2"><span className="mr-auto">{p.name} <small className="text-mute">{workspace?.name??"Workspace rimosso"}</small></span>
        <button disabled={!workspace} className={button} aria-label={"Attiva profilo "+p.name} onClick={()=>setPrefs(profilePatch(prefs,p))}>Attiva</button>
        <button className={button} onClick={()=>setConfirm(p.id)}>Gestisci</button>
        {confirm===p.id && <div className="flex w-full flex-wrap items-center gap-2"><button className={button} onClick={()=>{
          setPrefs({interfaceProfiles:library.map(row=>row.id===p.id?{...row,...capture()}:row)});setConfirm(null);
        }}>Sostituisci con lo stile corrente</button><button className={button} onClick={()=>{
          setPrefs({interfaceProfiles:library.filter(row=>row.id!==p.id)});setConfirm(null);
        }}>Elimina profilo {p.name}</button><button className={button} onClick={()=>setConfirm(null)}>Annulla</button></div>}
      </li>;
    })}</ul></div>;
}

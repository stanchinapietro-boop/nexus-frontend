import {useState,type ReactNode} from "react";
import {useLocation} from "react-router-dom";
import {SlidersHorizontal} from "lucide-react";
import {usePrefs,setPrefs} from "./prefs";
import {defaultSections,sectionNames,type Section,type SectionId} from "./pageLayouts";
import {NAV} from "./nav";
import ActivityFeed from "./pages/ActivityFeed";
import AssistantWidget from "./AssistantWidget";

const control="rounded-lg border border-line px-3 py-2 text-sm hover:bg-raised disabled:opacity-40";
function Editor({path,children}:{path:string;children:ReactNode}){
  const prefs=usePrefs();
  const saved=prefs.pageLayouts[path]??defaultSections;
  const [draft,setDraft]=useState<Section[]|null>(null);
  const [baseline,setBaseline]=useState("");
  const [drag,setDrag]=useState<SectionId|null>(null);
  const current=draft??saved;
  const conflict=draft!==null && baseline!==JSON.stringify(saved);
  function move(id:SectionId,target:SectionId){
    if(!draft||id===target)return;
    const next=draft.slice(), from=next.findIndex(r=>r.id===id), to=next.findIndex(r=>r.id===target);
    next.splice(to,0,...next.splice(from,1));setDraft(next);
  }
  function toggle(id:SectionId,key:"wide"|"visible"){
    setDraft(current.map(row=>row.id===id ? {...row,[key]:!row[key]} : row));
  }
  return <div className="space-y-3">
    <div className="flex justify-end"><button className={control+" inline-flex items-center gap-2"} aria-expanded={!!draft}
      onClick={()=>{if(draft)setDraft(null);else{setBaseline(JSON.stringify(saved));setDraft(saved);}}}>
      <SlidersHorizontal size={15}/>{draft?"Chiudi editor pagina":"Personalizza pagina"}</button></div>
    {draft && <section className="rounded-xl border border-line bg-panel p-3" aria-label="Layout della pagina">
      <ul className="divide-y divide-line">{draft.map((row,i)=><li key={row.id} className="flex flex-wrap items-center gap-2 py-2"
        onDragOver={e=>{if(drag)e.preventDefault();}} onDrop={e=>{e.preventDefault();if(drag)move(drag,row.id);setDrag(null);}}>
        <span draggable className="cursor-grab p-1 text-mute" title={"Trascina "+sectionNames[row.id]}
          onDragStart={e=>{e.dataTransfer.setData("text/plain",row.id);setDrag(row.id);}} onDragEnd={()=>setDrag(null)}>⠿</span>
        <label className="mr-auto"><input type="checkbox" checked={row.visible} onChange={()=>toggle(row.id,"visible")}/> {sectionNames[row.id]}</label>
        <button className={control} aria-label={"Intera larghezza "+sectionNames[row.id]} aria-pressed={row.wide} onClick={()=>toggle(row.id,"wide")}>{row.wide?"Intera larghezza":"Mezza larghezza"}</button>
        <button className={control} disabled={!i} aria-label={"Alza "+sectionNames[row.id]} onClick={()=>move(row.id,draft[i-1].id)}>↑</button>
        <button className={control} disabled={i+1===draft.length} aria-label={"Abbassa "+sectionNames[row.id]} onClick={()=>move(row.id,draft[i+1].id)}>↓</button>
      </li>)}</ul>
      <div className="mt-2 flex flex-wrap gap-2"><button className={control} disabled={conflict} onClick={()=>{
        setPrefs({pageLayouts:{...prefs.pageLayouts,[path]:draft}});setDraft(null);
      }}>Applica layout pagina</button><button className={control} onClick={()=>setDraft(null)}>Annulla layout pagina</button>
      <button className={control} onClick={()=>setDraft(defaultSections)}>Ripristina layout pagina</button></div>
      {conflict && <p role="alert">Il layout della pagina è cambiato. Riapri l’editor per aggiornare la bozza.</p>}
    </section>}
    <div className={"grid min-w-0 gap-4 md:grid-cols-2 "+(draft?"rounded-xl border border-dashed border-line p-2":"")}>
      {current.map(row=><div key={row.id} hidden={!row.visible} data-page-section={row.id} className={"min-w-0 "+(row.wide?"md:col-span-2":"")}>
        {row.id==="module"?children:row.visible && (row.id==="history"?<ActivityFeed/>:<AssistantWidget/>)}
      </div>)}
    </div>
  </div>;
}
export default function PageLayout({children}:{children:ReactNode}){
  const {pathname}=useLocation(), {activeProfile}=usePrefs();
  const path="/"+pathname.split("/")[1];
  if(path==="/" || !NAV.some(item=>item.path===path))return <>{children}</>;
  return <Editor key={path+activeProfile} path={path}>{children}</Editor>;
}

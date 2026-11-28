import {defaultVisual,choices,type Visual} from "./visual";
import {setPrefs,usePrefs} from "./prefs";

const labels:Record<keyof Visual,string>={font:"Carattere interfaccia",headings:"Carattere titoli",scale:"Scala testo",
  radius:"Raggio delle schede",cards:"Stile delle schede",background:"Sfondo",sidebar:"Larghezza barra laterale",motion:"Movimento"};
export default function VisualSettings(){
  const prefs=usePrefs();
  return <><div className="grid gap-3 sm:grid-cols-2">{(Object.keys(choices) as (keyof Visual)[]).map(key=>
    <label key={key} className="space-y-1"><span>{labels[key]}</span>
    <select aria-label={labels[key]} className="w-full rounded-lg border border-line bg-ink px-3 py-2" value={prefs.visual[key]}
      onChange={e=>setPrefs({visual:{...prefs.visual,[key]:e.target.value}})}>
      {Object.entries(choices[key]).map(([value,label])=><option key={value} value={value}>{label}</option>)}
    </select></label>)}</div>
    <button className="rounded-lg border border-line px-3 py-2" onClick={()=>setPrefs({visual:{...defaultVisual}})}>Ripristina stile del workspace</button></>;
}

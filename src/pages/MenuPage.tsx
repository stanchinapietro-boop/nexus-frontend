import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Eye, EyeOff, LogOut, Star } from "lucide-react";
import { useState } from "react";
import { orderedNav,defaultNavStyle,navIcons,NAV,type NavStyle } from "../nav";
import { usePrefs, setPrefs } from "../prefs";
import { logout } from "../auth";

const iconButton = "grid h-11 w-10 place-items-center rounded-lg text-mute hover:bg-raised hover:text-white disabled:opacity-25";

export default function MenuPage() {
  const { favoritePaths, navOrder, hiddenTabs,navigation } = usePrefs();
  const items = orderedNav(navOrder,navigation);
  const [editing,setEditing]=useState("/");
  const [draft,setDraft]=useState<NavStyle|null>(null);
  const [drag,setDrag]=useState<string|null>(null);
  const [rename,setRename]=useState("");
  const current=navigation[editing]??defaultNavStyle;
  const style=draft??current;
  function changeStyle(patch:Partial<NavStyle>){setDraft({...style,...patch});}
  const groups=[...new Set(Object.values(navigation).map(row=>row.group).filter(Boolean))];
  function move(index: number, delta: number) {
    const paths = items.map(item => item.path);
    [paths[index], paths[index + delta]] = [paths[index + delta], paths[index]];
    setPrefs({ navOrder: paths });
  }
  return <section className="mx-auto max-w-3xl">
    <h1 className="mb-4 text-2xl font-semibold">Tutte le sezioni</h1>
    <p className="mb-3 text-sm text-mute">La stella aggiunge una sezione ai preferiti. Le frecce ne cambiano la posizione nel menu.</p>
    <details className="mb-4 rounded-xl border border-line bg-panel p-3"><summary className="cursor-pointer">Etichette, gruppi e icone</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label>Pagina<select aria-label="Pagina da personalizzare" className="block w-full rounded border border-line bg-ink p-2" value={editing}
          onChange={e=>{setEditing(e.target.value);setDraft(null);setRename("");}}>{NAV.map(n=><option key={n.path} value={n.path}>{n.label}</option>)}</select></label>
        <label>Etichetta personalizzata<input className="block w-full rounded border border-line bg-ink p-2" maxLength={60} value={style.label}
          placeholder={NAV.find(n=>n.path===editing)?.label} onChange={e=>changeStyle({label:e.target.value})}/></label>
        <label>Gruppo di navigazione<input list="nexus-nav-groups" className="block w-full rounded border border-line bg-ink p-2" maxLength={40} value={style.group}
          onChange={e=>changeStyle({group:e.target.value})}/></label><datalist id="nexus-nav-groups">{groups.map(g=><option key={g} value={g}/>)}</datalist>
        <label>Icona<select aria-label="Icona della pagina" className="block w-full rounded border border-line bg-ink p-2" value={style.icon}
          onChange={e=>changeStyle({icon:e.target.value as NavStyle["icon"]})}>{Object.keys(navIcons).map((k,i)=><option key={k} value={k}>{["Originale","Stella","Libro","Calendario","Cartella","Assistente","Attività"][i]}</option>)}</select></label>
      </div><button className="my-2 rounded-lg border border-line p-2" disabled={!draft} onClick={()=>{
        setPrefs({navigation:{...navigation,[editing]:{...style,label:style.label.trim(),group:style.group.trim()}}});setDraft(null);
      }}>Salva voce di menu</button>
      {current.group && !draft && <div className="flex flex-wrap items-end gap-2"><label>Rinomina gruppo {current.group}<input className="ml-2 border border-line bg-ink p-2"
        value={rename} maxLength={40} onChange={e=>setRename(e.target.value)}/></label>
        <button disabled={!rename.trim()||rename.trim()===current.group} onClick={()=>{
          setPrefs({navigation:Object.fromEntries(Object.entries(navigation).map(([path,row])=>[path,row.group===current.group?{...row,group:rename.trim()}:row]))});setRename("");
        }}>Applica nome gruppo</button></div>}
    </details>
    <ul className="divide-y divide-line rounded-xl border border-line bg-panel px-2">
      {items.map(({ path, label, icon: Icon, ready }, index) => {
        const favorite = favoritePaths.includes(path);
        return <li key={path} className="flex flex-wrap items-center gap-1 py-1" onDragOver={e=>{if(drag)e.preventDefault();}}
          onDrop={e=>{e.preventDefault();if(drag && drag!==path){
            const paths=items.map(item=>item.path);paths.splice(paths.indexOf(drag),1);paths.splice(index,0,drag);setPrefs({navOrder:paths});
          }setDrag(null);}}>
          <span className="cursor-grab p-1 text-mute" draggable title={"Trascina "+label} onDragStart={e=>{e.dataTransfer.setData("text/plain",path);setDrag(path);}} onDragEnd={()=>setDrag(null)}>⠿</span>
          <Link to={path} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 hover:bg-raised"><Icon size={19} className="shrink-0 text-accent" /><span className="min-w-0 break-words">{label}{!ready && <small className="block text-mute">In programma</small>}</span></Link>
          <button className={iconButton} aria-label={"Preferito: " + label} aria-pressed={favorite}
            onClick={() => setPrefs({ favoritePaths: favorite ? favoritePaths.filter(p => p !== path) : [...favoritePaths, path] })}>
            <Star size={16} className={favorite ? "fill-current text-accent" : ""} />
          </button>
          <button className={iconButton} disabled={index === 0} aria-label={"Sposta in alto " + label} onClick={() => move(index, -1)}><ArrowUp size={16}/></button>
          <button className={iconButton} aria-label={"Visibile nella navigazione: "+label} aria-pressed={!hiddenTabs.includes(path)}
            onClick={()=>setPrefs({hiddenTabs:hiddenTabs.includes(path)?hiddenTabs.filter(p=>p!==path):[...hiddenTabs,path]})}>
            {hiddenTabs.includes(path)?<EyeOff size={16}/>:<Eye size={16}/>}</button>
          <button className={iconButton} disabled={index === items.length - 1} aria-label={"Sposta in basso " + label} onClick={() => move(index, 1)}><ArrowDown size={16}/></button>
        </li>;
      })}
    </ul>
    <button onClick={logout} className="mt-4 flex min-h-11 items-center gap-2 text-mute"><LogOut size={18} /> Esci</button>
  </section>;
}

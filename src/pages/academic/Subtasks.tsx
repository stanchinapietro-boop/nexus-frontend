import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { academic, type Subtask } from "../../api";

export default function Subtasks({ taskId, total, done, onChange }: { taskId: number; total: number; done: number; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Subtask[]>([]);
  const [title, setTitle] = useState("");
  const load = async () => setRows(await academic.subtasks(taskId));
  const toggle = async () => { const next = !open; setOpen(next); if (next) await load(); };
  const add = async (e: React.FormEvent) => { e.preventDefault(); if (!title.trim()) return; await academic.addSubtask(taskId, title.trim()); setTitle(""); await load(); onChange(); };
  return <div className="mt-2"><button type="button" onClick={()=>void toggle()} className="flex items-center gap-1 text-[11px] text-mute hover:text-accent">{open?<ChevronDown size={13}/>:<ChevronRight size={13}/>}Sottoattività {total>0&&`· ${done}/${total}`}</button>{open&&<div className="mt-2 space-y-1 pl-2">{rows.map(row=><div key={row.id} className="flex items-center gap-2 text-xs"><button type="button" aria-label="Completa sottoattività" onClick={async()=>{await academic.toggleSubtask(row.id); await load(); onChange();}} className={row.done?"text-emerald-400":"text-mute"}><Check size={13}/></button><span className={`flex-1 ${row.done?"text-mute line-through":""}`}>{row.title}</span><button type="button" aria-label="Elimina sottoattività" onClick={async()=>{await academic.deleteSubtask(row.id); await load(); onChange();}} className="text-mute hover:text-red-400"><Trash2 size={12}/></button></div>)}<form onSubmit={e=>void add(e)} className="flex gap-1"><input className="min-w-0 flex-1 rounded border border-line bg-black/20 px-2 py-1 text-xs outline-none" placeholder="Aggiungi sottoattività" value={title} onChange={e=>setTitle(e.target.value)}/><button aria-label="Aggiungi sottoattività" className="text-accent"><Plus size={14}/></button></form></div>}</div>;
}

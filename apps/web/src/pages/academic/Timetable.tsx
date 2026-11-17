import { useEffect, useState } from "react";
import { Plus, Trash2, Clock3 } from "lucide-react";
import { academic, type Course, type Lesson } from "../../api";

const weekdays = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì"];
const input = "min-w-0 rounded-lg border border-line bg-panel px-3 py-2 text-sm text-white outline-none focus:border-accent";

export default function Timetable({ courses }: { courses: Course[] }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [course, setCourse] = useState("");
  const [weekday, setWeekday] = useState(0);
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("09:00");
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");
  const refresh = async () => setLessons(await academic.lessons());
  useEffect(() => { refresh().catch(() => setError("Non riesco a caricare l'orario.")); }, []);
  const add = async (e: React.FormEvent) => { e.preventDefault(); setError(""); try { await academic.addLesson({ course_id: Number(course), weekday, start_time: start, end_time: end, room }); await refresh(); } catch (err) { setError(err instanceof Error ? err.message : "Salvataggio non riuscito"); } };
  const remove = async (id: number) => { await academic.deleteLesson(id); await refresh(); };
  return <div className="space-y-5"><form onSubmit={add} className="grid gap-3 rounded-2xl border border-line bg-panel p-5 sm:grid-cols-2 lg:grid-cols-6"><select aria-label="Materia" className={`${input} lg:col-span-2`} value={course} onChange={e=>setCourse(e.target.value)} required><option value="">Materia</option>{courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select aria-label="Giorno" className={input} value={weekday} onChange={e=>setWeekday(Number(e.target.value))}>{weekdays.map((d,i)=><option key={d} value={i}>{d}</option>)}</select><input aria-label="Inizio" className={input} type="time" value={start} onChange={e=>setStart(e.target.value)} required/><input aria-label="Fine" className={input} type="time" value={end} onChange={e=>setEnd(e.target.value)} required/><input aria-label="Aula" className={input} placeholder="Aula" value={room} onChange={e=>setRoom(e.target.value)}/><button className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 font-medium text-black sm:col-span-2 lg:col-span-6"><Plus size={16}/> Aggiungi lezione</button></form>
    {error&&<p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{weekdays.map((day,index)=>{const items=lessons.filter(l=>l.weekday===index);return <section key={day} className="min-h-48 rounded-2xl border border-line bg-panel p-4"><h2 className="mb-4 text-sm font-semibold">{day}</h2>{items.length===0?<p className="text-xs text-mute">Nessuna lezione</p>:<div className="space-y-2">{items.map(l=><article key={l.id} className="rounded-xl border border-line p-3" style={{borderLeftColor:l.course_color,borderLeftWidth:3}}><div className="flex items-start justify-between gap-2"><p className="text-sm font-medium">{l.course_name}</p><button aria-label="Elimina lezione" onClick={()=>void remove(l.id)} className="text-mute hover:text-red-400"><Trash2 size={14}/></button></div><p className="mt-2 flex items-center gap-1.5 text-xs text-mute"><Clock3 size={12}/>{l.start_time}–{l.end_time}</p>{l.room&&<p className="mt-1 text-xs text-mute">Aula {l.room}</p>}</article>)}</div>}</section>})}</div></div>;
}

import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, LogOut, Star } from "lucide-react";
import { orderedNav } from "../nav";
import { usePrefs, setPrefs } from "../prefs";
import { logout } from "../auth";

const iconButton = "grid h-11 w-10 place-items-center rounded-lg text-mute hover:bg-raised hover:text-white disabled:opacity-25";

export default function MenuPage() {
  const { favoritePaths, navOrder } = usePrefs();
  const items = orderedNav(navOrder);
  function move(index: number, delta: number) {
    const paths = items.map(item => item.path);
    [paths[index], paths[index + delta]] = [paths[index + delta], paths[index]];
    setPrefs({ navOrder: paths });
  }
  return <section className="mx-auto max-w-3xl">
    <h1 className="mb-4 text-2xl font-semibold">Tutte le sezioni</h1>
    <p className="mb-3 text-sm text-mute">La stella aggiunge una sezione ai preferiti. Le frecce ne cambiano la posizione nel menu.</p>
    <ul className="divide-y divide-line rounded-xl border border-line bg-panel px-2">
      {items.map(({ path, label, icon: Icon, ready }, index) => {
        const favorite = favoritePaths.includes(path);
        return <li key={path} className="flex items-center gap-1 py-1">
          <Link to={path} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 hover:bg-raised"><Icon size={19} className="shrink-0 text-accent" /><span className="min-w-0 break-words">{label}{!ready && <small className="block text-mute">In programma</small>}</span></Link>
          <button className={iconButton} aria-label={"Preferito: " + label} aria-pressed={favorite}
            onClick={() => setPrefs({ favoritePaths: favorite ? favoritePaths.filter(p => p !== path) : [...favoritePaths, path] })}>
            <Star size={16} className={favorite ? "fill-current text-accent" : ""} />
          </button>
          <button className={iconButton} disabled={index === 0} aria-label={"Sposta in alto " + label} onClick={() => move(index, -1)}><ArrowUp size={16}/></button>
          <button className={iconButton} disabled={index === items.length - 1} aria-label={"Sposta in basso " + label} onClick={() => move(index, 1)}><ArrowDown size={16}/></button>
        </li>;
      })}
    </ul>
    <button onClick={logout} className="mt-4 flex min-h-11 items-center gap-2 text-mute"><LogOut size={18} /> Esci</button>
  </section>;
}

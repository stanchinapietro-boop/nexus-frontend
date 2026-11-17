import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { logout } from "../auth";
import { NAV } from "../nav";

export default function MenuPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Tutte le sezioni</h1>
      <div className="grid gap-2">
        {NAV.map(({ path, label, icon: Icon }) => (
          <Link key={path} to={path} className="flex items-center gap-3 rounded-lg border border-line bg-panel p-4">
            <Icon size={20} className="text-accent" /> {label}
          </Link>
        ))}
        <button onClick={logout} className="flex items-center gap-3 rounded-lg border border-line bg-panel p-4 text-left text-mute">
          <LogOut size={20} /> Esci
        </button>
      </div>
    </div>
  );
}

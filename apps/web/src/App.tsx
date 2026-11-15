import { NavLink, Route, Routes } from "react-router-dom";
import { Menu } from "lucide-react";
import { BOTTOM, NAV } from "./nav";
import Dashboard from "./pages/Dashboard";
import SettingsPage from "./pages/Settings";
import Soon from "./pages/Soon";
import MenuPage from "./pages/MenuPage";
import Finance from "./pages/Finance";

const link = (active: boolean) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
    active ? "bg-accent/15 text-accent" : "text-mute hover:bg-raised hover:text-white"
  }`;

export default function App() {
  return (
    <div className="flex h-full">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-panel p-4 md:flex">
        <div className="mb-6 px-3 text-lg font-semibold tracking-tight">
          NEXUS <span className="text-accent">LIFE OS</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ path, label, icon: Icon }) => (
            <NavLink key={path} to={path} end={path === "/"} className={({ isActive }) => link(isActive)}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/finance/*" element={<Finance />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/menu" element={<MenuPage />} />
          {NAV.filter((n) => !n.ready).map((n) => (
            <Route key={n.path} path={n.path} element={<Soon title={n.label} />} />
          ))}
        </Routes>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-panel md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {[...NAV.filter((n) => BOTTOM.includes(n.path))].map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2 text-[11px] ${isActive ? "text-accent" : "text-mute"}`
            }
          >
            <Icon size={20} /> {label.split(" ")[0]}
          </NavLink>
        ))}
        <NavLink
          to="/menu"
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2 text-[11px] ${isActive ? "text-accent" : "text-mute"}`
          }
        >
          <Menu size={20} /> Altro
        </NavLink>
      </nav>
    </div>
  );
}

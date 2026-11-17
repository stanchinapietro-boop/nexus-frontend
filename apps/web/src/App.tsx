import { lazy, Suspense } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { Menu } from "lucide-react";
import { BOTTOM, NAV } from "./nav";
import Dashboard from "./pages/Dashboard";
import SettingsPage from "./pages/Settings";
import Soon from "./pages/Soon";
import MenuPage from "./pages/MenuPage";
const Finance = lazy(() => import("./pages/Finance"));
const Life = lazy(() => import("./pages/Life"));
const Academic = lazy(() => import("./pages/Academic"));
import Tasks from "./pages/Tasks";

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

      <main className="min-w-0 flex-1 overflow-y-auto p-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] md:p-8 md:pb-8 md:pt-8">
        <Suspense fallback={<div className="grid min-h-48 place-items-center text-sm text-mute">Caricamento sezione…</div>}><Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/finance/*" element={<Finance />} />
          <Route path="/life/*" element={<Life />} />
          <Route path="/academic" element={<Academic />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/menu" element={<MenuPage />} />
          {NAV.filter((n) => !n.ready).map((n) => (
            <Route key={n.path} path={n.path} element={<Soon title={n.label} />} />
          ))}
        </Routes></Suspense>
      </main>

      <nav aria-label="Navigazione principale" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-panel/90 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto flex max-w-md items-stretch px-2 pt-1.5">
          {[...NAV.filter((n) => BOTTOM.includes(n.path)), { path: "/menu", label: "Altro", icon: Menu, ready: true }].map(({ path, label, icon: Icon }) => (
            <NavLink key={path} to={path} end={path === "/"}
              className={({ isActive }) => `flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${isActive ? "text-accent" : "text-mute"}`}>
              {({ isActive }) => (
                <>
                  <span className={`flex h-7 w-14 items-center justify-center rounded-full transition-colors ${isActive ? "bg-accent/15" : ""}`}><Icon size={21} /></span>
                  {label.split(" ")[0]}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

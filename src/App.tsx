import CloudSync from "./CloudSync";
import { lazy, Suspense, useEffect, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Bell, ListFilter, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus, Search } from "lucide-react";
import { logout } from "./auth";
import { BOTTOM, NAV, orderedNav, type NavItem } from "./nav";
import { setPrefs, usePrefs } from "./prefs";
import CommandPalette from "./CommandPalette";
import QuickCapture, { openQuickCapture } from "./QuickCapture";
import { NotificationBadge } from "./notifications";
import Dashboard from "./pages/Dashboard";
import MenuPage from "./pages/MenuPage";
import Soon from "./pages/Soon";
const NeuralMap = lazy(() => import("./pages/NeuralMap"));
const Training = lazy(() => import("./pages/Training"));
const Projects = lazy(() => import("./pages/Projects"));
const Planner = lazy(() => import("./pages/Planner"));
const Finance = lazy(() => import("./pages/Finance"));
const Academic = lazy(() => import("./pages/Academic"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Knowledge = lazy(() => import("./pages/Knowledge"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const SearchPage = lazy(() => import("./pages/Search"));
const InboxPage = lazy(() => import("./pages/Inbox"));
const Notifications = lazy(() => import("./pages/Notifications"));

const iconButton = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-mute hover:bg-raised hover:text-white";
function SectionLink({ item, compact }: { item: NavItem; compact: boolean }) {
  const Icon = item.icon;
  return <NavLink end={item.path === "/"} to={item.path} aria-label={compact ? item.label : undefined}
    title={item.label + (item.ready ? "" : " · In programma")}
    className={({ isActive }) => "flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors " +
      (compact ? "justify-center " : "") + (isActive ? "bg-accent/15 text-accent" : "text-mute hover:bg-raised hover:text-white")}>
    <Icon size={17} className="shrink-0" />{!compact && <><span className="truncate">{item.label}</span>{!item.ready && <span aria-label="In programma" title="In programma" className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full border border-current" />}</>}
  </NavLink>;
}

export default function App() {
  const { compactSidebar: compact, favoritePaths, navOrder } = usePrefs();
  const items = orderedNav(navOrder);
  const favorites = items.filter(item => favoritePaths.includes(item.path));
  const [palette, setPalette] = useState(false);
  const { pathname } = useLocation();
  const active = NAV.find(item => item.path === pathname || (item.path !== "/" && pathname.startsWith(item.path + "/")));
  useEffect(() => {
    function shortcut(e: KeyboardEvent) {
      if (e.repeat || e.isComposing || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "k") return;
      if (document.querySelector('dialog[open]:not([aria-labelledby="palette-title"])')) return;
      e.preventDefault();
      setPalette(open => !open);
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  return <div className="flex h-full">
    <aside className={"hidden shrink-0 flex-col border-r border-line bg-panel px-2 py-3 md:flex " + (compact ? "w-16" : "w-56")}>
      <div className={"mb-3 flex items-center " + (compact ? "justify-center" : "justify-between pl-2.5")}>
        {!compact && <Link to="/" className="font-semibold tracking-tight">NEXUS <span className="text-accent">LIFE OS</span></Link>}
        <button className={iconButton} title={compact ? "Espandi sidebar" : "Riduci sidebar"} aria-label={compact ? "Espandi sidebar" : "Riduci sidebar"}
          aria-expanded={!compact} onClick={() => setPrefs({ compactSidebar: !compact })}>{compact ? <PanelLeftOpen size={18}/> : <PanelLeftClose size={18}/>}</button>
      </div>
      <nav aria-label="Sezioni" className="min-h-0 flex-1 overflow-y-auto">
        {!!favorites.length && <div className="mb-2 border-b border-line pb-2">{!compact && <p className="px-2.5 py-1 text-xs text-mute">Preferiti</p>}{favorites.map(item => <SectionLink key={item.path} item={item} compact={compact}/>)}</div>}
        {items.filter(item => !favoritePaths.includes(item.path)).map(item => <SectionLink key={item.path} item={item} compact={compact}/>)}
      </nav>
      <div className="mt-2 border-t border-line pt-2">
        <NavLink to="/menu" title="Personalizza menu" aria-label="Personalizza menu" className={iconButton + " w-full gap-2 " + (compact ? "" : "justify-start px-2.5 text-sm")}><ListFilter size={17}/>{!compact && "Personalizza menu"}</NavLink>
        <button onClick={logout} title="Esci" aria-label="Esci" className={iconButton + " w-full gap-2 " + (compact ? "" : "justify-start px-2.5 text-sm")}><LogOut size={17}/>{!compact && "Esci"}</button>
      </div>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-1 border-b border-line px-3 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] md:px-6">
        <span className="mr-auto truncate text-sm font-semibold">{active?.label ?? (pathname === "/menu" ? "Menu" : "NEXUS LIFE OS")}</span>
        <button className={iconButton + " gap-2 px-2 text-sm"} onClick={() => setPalette(true)} aria-label="Cerca e apri comandi rapidi" title="Comandi rapidi (Ctrl/⌘ K)"><Search size={18}/><span className="hidden md:inline">Cerca</span><kbd className="hidden text-xs md:inline">Ctrl/⌘ K</kbd></button>
        <NavLink to="/notifications" title="Notifiche" aria-label="Notifiche" className={iconButton + " gap-1"}><Bell size={18}/><NotificationBadge /></NavLink>
        <button onClick={() => openQuickCapture()} aria-label="Acquisizione rapida" title="Acquisizione rapida" className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg bg-accent px-3 font-semibold text-black"><Plus size={18}/><span className="hidden text-sm sm:inline">Acquisisci</span></button>
      </header>
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-8">
        <CloudSync><Suspense fallback={<p role="status">Caricamento sezione…</p>}><Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/life/*" element={<Planner />} />
          <Route path="/finance/*" element={<Finance />} />
          <Route path="/academic" element={<Academic />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/ai" element={<Planner assistant />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/health" element={<Training key="health" volley={false}/>} />
          <Route path="/volley" element={<Training key="volley" volley/>} />
          <Route path="/goals" element={<Navigate replace to="/life?tab=obiettivi"/>} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/map" element={<NeuralMap />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/menu" element={<MenuPage />} />
          {NAV.filter(item => !item.ready).map(item => <Route key={item.path} path={item.path} element={<Soon item={item}/>}/>)}
          <Route path="*" element={<section><h1 className="text-xl font-semibold">Pagina non trovata</h1><Link to="/" className="mt-3 inline-block text-accent">Torna al Command Center</Link></section>}/>
        </Routes></Suspense></CloudSync>
      </main>
    </div>
    <nav aria-label="Navigazione mobile" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-panel/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto flex max-w-md items-stretch px-1">{[...BOTTOM.map(path => NAV.find(item => item.path === path)!), { path: "/menu", label: "Menu", icon: Menu }].map(({ path, icon: Icon, label }) =>
        <NavLink key={path} to={path} end={path === "/"} aria-label={label} className={({ isActive }) => "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] " + (isActive ? "text-accent" : "text-mute")}>
          <Icon size={19}/>{path === "/" ? "Home" : label}
        </NavLink>)}</div>
    </nav>
    {palette && <CommandPalette onDismiss={() => setPalette(false)}/>}
    <QuickCapture />
  </div>;
}

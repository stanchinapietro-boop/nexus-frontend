import {
  Activity, BarChart3, Bell, BookOpen, CalendarDays, FolderKanban, GraduationCap,
  Inbox, LayoutDashboard, ListChecks, Search, Settings, Sparkles, Target, Wallet,
  Waypoints, Workflow, type LucideIcon,
} from "lucide-react";

export type NavItem = { path: string; label: string; icon: LucideIcon; ready: boolean };
export const NAV: NavItem[] = [
  { path: "/", label: "Command Center", icon: LayoutDashboard, ready: true },
  { path: "/inbox", label: "Inbox", icon: Inbox, ready: true },
  { path: "/ai", label: "AI Assistant", icon: Sparkles, ready: true },
  { path: "/life", label: "Life Planner", icon: Waypoints, ready: true },
  { path: "/tasks", label: "Tasks", icon: ListChecks, ready: true },
  { path: "/calendar", label: "Calendar", icon: CalendarDays, ready: true },
  { path: "/finance", label: "Finance", icon: Wallet, ready: true },
  { path: "/academic", label: "Academic", icon: GraduationCap, ready: true },
  { path: "/projects", label: "Projects", icon: FolderKanban, ready: true },
  { path: "/map", label: "Neural Map", icon: Waypoints, ready: true },
  { path: "/knowledge", label: "Second Brain", icon: BookOpen, ready: true },
  { path: "/health", label: "Health & Fitness", icon: Activity, ready: true },
  { path: "/volley", label: "Volley", icon: Activity, ready: true },
  { path: "/goals", label: "Goals & Habits", icon: Target, ready: true },
  { path: "/analytics", label: "Analytics", icon: BarChart3, ready: false },
  { path: "/automations", label: "Automazioni", icon: Workflow, ready: true },
  { path: "/search", label: "Cerca", icon: Search, ready: true },
  { path: "/notifications", label: "Notifiche", icon: Bell, ready: true },
  { path: "/settings", label: "Settings", icon: Settings, ready: true },
];

export const BOTTOM = ["/", "/inbox", "/tasks", "/calendar"];

export function orderedNav(order: string[]): NavItem[] {
  const paths = new Set([...order, ...NAV.map(item => item.path)]);
  return Array.from(paths).flatMap(path => {
    const item = NAV.find(module => module.path === path);
    return item ? [item] : [];
  });
}

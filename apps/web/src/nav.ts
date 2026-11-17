import {
  LayoutDashboard, Wallet, GraduationCap, Target, FolderKanban,
  CalendarDays, BookOpen, ListChecks, Sparkles, Settings, type LucideIcon,
} from "lucide-react";

export type NavItem = { path: string; label: string; icon: LucideIcon; ready: boolean };

export const NAV: NavItem[] = [
  { path: "/", label: "Overview", icon: LayoutDashboard, ready: true },
  { path: "/finance", label: "Finance", icon: Wallet, ready: true },
  { path: "/academic", label: "Academic", icon: GraduationCap, ready: true },
  { path: "/tasks", label: "Tasks", icon: ListChecks, ready: true },
  { path: "/life", label: "Life Planner", icon: Target, ready: true },
  { path: "/projects", label: "Projects", icon: FolderKanban, ready: false },
  { path: "/calendar", label: "Calendar", icon: CalendarDays, ready: false },
  { path: "/knowledge", label: "Knowledge", icon: BookOpen, ready: false },
  { path: "/ai", label: "AI Assistant", icon: Sparkles, ready: false },
  { path: "/settings", label: "Settings", icon: Settings, ready: true },
];

export const BOTTOM = ["/", "/finance", "/tasks", "/academic"];

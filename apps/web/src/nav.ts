import {
  LayoutDashboard, Wallet, GraduationCap, Target, FolderKanban,
  CalendarDays, BookOpen, Sparkles, Settings, type LucideIcon,
} from "lucide-react";

export type NavItem = { path: string; label: string; icon: LucideIcon; ready: boolean };

export const NAV: NavItem[] = [
  { path: "/", label: "Overview", icon: LayoutDashboard, ready: true },
  { path: "/finance", label: "Finance", icon: Wallet, ready: true },
  { path: "/academic", label: "Academic", icon: GraduationCap, ready: false },
  { path: "/life", label: "Life Planner", icon: Target, ready: false },
  { path: "/projects", label: "Projects", icon: FolderKanban, ready: false },
  { path: "/calendar", label: "Calendar", icon: CalendarDays, ready: false },
  { path: "/knowledge", label: "Knowledge", icon: BookOpen, ready: false },
  { path: "/ai", label: "AI Assistant", icon: Sparkles, ready: false },
  { path: "/settings", label: "Settings", icon: Settings, ready: true },
];

export const BOTTOM = ["/", "/finance", "/calendar", "/ai", "/settings"];

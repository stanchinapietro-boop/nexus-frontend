import {
  Activity, BarChart3, Bell, BookOpen, CalendarDays, FolderKanban, GraduationCap,
  Inbox, LayoutDashboard, ListChecks, Search, Settings, Sparkles, Target, Wallet,
  Waypoints, Workflow, Star, type LucideIcon,
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
  { path: "/analytics", label: "Analytics", icon: BarChart3, ready: true },
  { path: "/automations", label: "Automazioni", icon: Workflow, ready: true },
  { path: "/search", label: "Cerca", icon: Search, ready: true },
  { path: "/notifications", label: "Notifiche", icon: Bell, ready: true },
  { path: "/settings", label: "Settings", icon: Settings, ready: true },
];

export const BOTTOM = ["/", "/inbox", "/tasks", "/calendar"];

export const navIcons={default:undefined,star:Star,book:BookOpen,time:CalendarDays,folder:FolderKanban,ai:Sparkles,activity:Activity};
export type NavStyle={label:string;group:string;icon:keyof typeof navIcons};
export type Navigation=Record<string,NavStyle>;
export const defaultNavStyle:NavStyle={label:"",group:"",icon:"default"};
export function decodeNavigation(input:unknown):Navigation {
  const result:Navigation={};
  if(!input || typeof input!=="object")return result;
  for(const item of NAV){
    const row=(input as Record<string,Partial<NavStyle>>)[item.path];
    if(row && typeof row.label==="string" && row.label.length<=60 && typeof row.group==="string" && row.group.length<=40 &&
      row.icon && Object.prototype.hasOwnProperty.call(navIcons,row.icon))result[item.path]={label:row.label,group:row.group,icon:row.icon};
  }
  return result;
}
export function orderedNav(order: string[], config:Navigation={}): NavItem[] {
  const paths = new Set([...order, ...NAV.map(item => item.path)]);
  return Array.from(paths).flatMap(path => {
    const item = NAV.find(module => module.path === path);
    if(!item)return [];
    const style=config[path];
    return [style ? {...item,label:style.label||item.label,icon:navIcons[style.icon]??item.icon} : item];
  });
}

import { applyTheme, isTheme, validColors, validSavedTheme, type Colors, type SavedTheme, themes, type ThemeId } from "./themes";
import { useSyncExternalStore } from "react";

export const widgetNames = {
  tasks: "Attività di oggi",
  focus: "Priorità del giorno",
  school: "Scadenze scolastiche",
  capture: "Acquisizione rapida",
  notes: "Note recenti",
  history: "Attività recente",
  chart: "Note negli ultimi sette giorni",
  modules: "Panoramica moduli",
  projects: "Progetti in corso",
  upcoming: "Prossimi eventi",
  ai: "Stato AI",
  insights: "Avanzamento scolastico",
} as const;
export type WidgetId = keyof typeof widgetNames;
export const defaultWidgets = Object.keys(widgetNames) as WidgetId[];

type FlatPrefs = {
  tasksView:string;tasksUrgency:number;
  theme: ThemeId;
  colors: Colors;
  savedThemes: SavedTheme[];
  badges: boolean;
  quietFrom: string;
  quietTo: string;
  accent: string;
  hiddenTabs: string[];
  hiddenWidgets: string[];
  compactSidebar: boolean;
  favoritePaths: string[];
  navOrder: string[];
  recentCommands: string[];
  dashboardOrder: WidgetId[];
  dashboardHidden: WidgetId[];
  dashboardWide: WidgetId[];
  density: "standard" | "compact";
  timeZone: string;
  clock: "system" | "12" | "24";
  dateFormat: "long" | "numeric";
};
const KEY = "nexus.prefs";
export const defaultWide: WidgetId[] = ["history"];
const defaults: FlatPrefs = {
  tasksView:"all",tasksUrgency:1,
  colors: {}, savedThemes: [],
  theme: "dark", badges: true, quietFrom: "", quietTo: "",
  accent: themes.dark[1], hiddenTabs: [], hiddenWidgets: [],
  compactSidebar: false, favoritePaths: [], navOrder: [], recentCommands: [],
  dashboardOrder: defaultWidgets, dashboardHidden: [], dashboardWide: defaultWide,
  density: "standard", timeZone: "", clock: "system", dateFormat: "long",
};

function strings(value: unknown) {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string"))] : [];
}
function widgetIds(value: unknown): WidgetId[] {
  return strings(value).filter((id): id is WidgetId => defaultWidgets.includes(id as WidgetId));
}
export function validZone(value: string) {
  try { new Intl.DateTimeFormat("it-IT", { timeZone: value }).format(0); return true; }
  catch { return false; }
}
function validTime(value: unknown): value is string {
  return typeof value === "string" && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
}
function decodeFlat(value: unknown): FlatPrefs {
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;
  const data = value as Record<string, unknown>;
  const order = widgetIds(data.dashboardOrder);
  return {
    tasksView: typeof data.tasksView==="string"?data.tasksView:"all",
    tasksUrgency: [0,1,2,3,7].includes(Number(data.tasksUrgency))?Number(data.tasksUrgency):1,
    colors: validColors(data.colors) ? data.colors : {},
    savedThemes: Array.isArray(data.savedThemes) ? data.savedThemes.filter(validSavedTheme).slice(0, 24) : [],
    theme: isTheme(data.theme) ? data.theme : "dark",
    badges: data.badges !== false,
    quietFrom: validTime(data.quietFrom) ? data.quietFrom : "",
    quietTo: validTime(data.quietTo) ? data.quietTo : "",
    accent: typeof data.accent === "string" && /^#[\da-f]{6}$/i.test(data.accent) ? data.accent : defaults.accent,
    hiddenTabs: strings(data.hiddenTabs), hiddenWidgets: strings(data.hiddenWidgets),
    compactSidebar: data.compactSidebar === true, favoritePaths: strings(data.favoritePaths),
    navOrder: strings(data.navOrder), recentCommands: strings(data.recentCommands),
    dashboardOrder: [...order, ...defaultWidgets.filter(key => !order.includes(key))],
    dashboardHidden: widgetIds(data.dashboardHidden),
    dashboardWide: Array.isArray(data.dashboardWide) ? widgetIds(data.dashboardWide) : defaultWide,
    density: data.density === "compact" ? "compact" : "standard",
    timeZone: typeof data.timeZone === "string" && data.timeZone && validZone(data.timeZone) ? data.timeZone : "",
    clock: data.clock === "12" || data.clock === "24" ? data.clock : "system",
    dateFormat: data.dateFormat === "numeric" ? "numeric" : "long",
  };
}
const profileKeys = ["theme", "accent", "colors", "compactSidebar", "favoritePaths", "navOrder", "hiddenTabs",
  "dashboardOrder", "dashboardHidden", "dashboardWide", "density"] as const;
type Appearance = Pick<FlatPrefs, typeof profileKeys[number]>;
export type Workspace = { id: string; name: string; appearance: Appearance };
export type Prefs = FlatPrefs & { activeProfile: string; profiles: Workspace[] };
export function appearance(prefs: FlatPrefs): Appearance {
  return Object.fromEntries(profileKeys.map(key => [key, prefs[key]])) as Appearance;
}
export const defaultAppearance = appearance(defaults);
export function decodePreferences(value: unknown): Prefs {
  const flat = decodeFlat(value);
  const data = (value ?? {}) as Partial<Prefs>;
  const profiles: Workspace[] = [];
  if (Array.isArray(data.profiles)) {
    for (const profile of data.profiles.slice(0, 24)) {
      if (!profile || typeof profile.id !== "string" || !/^[a-z0-9-]{1,36}$/.test(profile.id) ||
          typeof profile.name !== "string" || !profile.name.trim() || profiles.some(row => row.id === profile.id)) continue;
      profiles.push({ id: profile.id, name: profile.name.trim().slice(0, 60), appearance: appearance(decodeFlat(profile.appearance)) });
    }
  }
  if (!profiles.length) {
    for (const name of ["Personal", "School", "Projects", "Engineering", "Finance", "Gaming", "Second Brain"]) {
      profiles.push({ id: name.toLowerCase().replace(" ", "-"), name, appearance: defaultAppearance });
    }
  }
  const activeProfile = profiles.find(row => row.id === data.activeProfile)?.id ?? profiles[0].id;
  return { ...flat, activeProfile, profiles };
}
function readSaved(): Prefs {
  return decodePreferences(JSON.parse(localStorage.getItem(KEY) ?? "null"));
}
function load() {
  try { return readSaved(); } catch { return decodePreferences(null); }
}
let current = load();
let persisted = true;
const listeners = new Set<() => void>();
function change(next: Prefs) {
  current = next;
  applyTheme(next.theme, next.accent, next.colors);
  for (const listener of listeners) listener();
}
if (typeof window !== "undefined") {
  window.addEventListener("storage", event => {
    if ((event.key === KEY || event.key === null) && event.storageArea === localStorage) {
      persisted = true;
      change(load());
    }
  });
}
export function setPrefs(update: Partial<Prefs>) {
  let base = current;
  if (persisted) {
    try { base = readSaved(); } catch { /* Browser storage is unavailable. */ }
  }
  const next = decodePreferences({ ...base, ...update });
  try { localStorage.setItem(KEY, JSON.stringify(next)); persisted = true; }
  catch { persisted = false; }
  change(next);
  window.dispatchEvent(new CustomEvent("nexus:save-prefs",{detail:update}));
}
export function applyCloudPrefs(value:Partial<Prefs>){
 const next=decodePreferences({...defaults,...value});
 try {
   const old=localStorage.getItem(KEY);
   if(old && !localStorage.getItem("nexus.prefs.before-cloud"))localStorage.setItem("nexus.prefs.before-cloud",old);
 }catch{/* browser storage is optional */}
 try { localStorage.setItem(KEY, JSON.stringify(next)); persisted = true; }
 catch { persisted = false; }
 change(next);
}
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};
export function usePrefs() {
  return useSyncExternalStore(subscribe, () => current, () => current);
}
export function prefsSaved() { return persisted; }

export function getZoneOptions(prefs: Prefs): Intl.DateTimeFormatOptions {
  return prefs.timeZone ? { timeZone: prefs.timeZone } : {};
}
export function getDateOptions(prefs: Prefs): Intl.DateTimeFormatOptions {
  return prefs.dateFormat === "numeric"
    ? { ...getZoneOptions(prefs), day: "2-digit", month: "2-digit", year: "numeric" }
    : { ...getZoneOptions(prefs), weekday: "long", day: "numeric", month: "long" };
}
export function getClockOptions(prefs: Prefs): Intl.DateTimeFormatOptions {
  return { ...getZoneOptions(prefs), hour: "2-digit", minute: "2-digit",
    ...(prefs.clock === "system" ? {} : { hourCycle: prefs.clock === "24" ? "h23" : "h12" }) };
}
export function displayDay(date: Date, prefs: Prefs) {
  const parts = new Intl.DateTimeFormat("en-US", { ...getZoneOptions(prefs), year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const field = (type: "year" | "month" | "day") => parts.find(part => part.type === type)?.value;
  return `${field("year")}-${field("month")}-${field("day")}`;
}
if (typeof document !== "undefined") applyTheme(current.theme, current.accent, current.colors);

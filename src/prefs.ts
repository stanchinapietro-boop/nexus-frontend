import { useEffect, useState } from "react";

export type Prefs = { accent: string; hiddenTabs: string[]; hiddenWidgets: string[] };
const KEY = "nexus.prefs";
const DEF: Prefs = { accent: "#ff6a1a", hiddenTabs: [], hiddenWidgets: [] };
const subs = new Set<() => void>();

function load(): Prefs {
  try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return DEF; }
}
let cur = load();

export function applyAccent(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  document.documentElement.style.setProperty("--accent", `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`);
}
export function setPrefs(p: Partial<Prefs>) {
  cur = { ...cur, ...p };
  try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch { /* storage non disponibile */ }
  applyAccent(cur.accent);
  subs.forEach((f) => f());
}
export function usePrefs() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((x) => x + 1);
    subs.add(f);
    return () => { subs.delete(f); };
  }, []);
  return cur;
}
applyAccent(cur.accent);

import { appearance, decodePreferences, type Prefs } from "./prefs";
import { defaultVisual } from "./visual";
export const configurationLimit=512_000;

export function sameValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const a = left as Record<string, unknown>, b = right as Record<string, unknown>;
  return Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every(key => Object.prototype.hasOwnProperty.call(b, key) && sameValue(a[key], b[key]));
}

export function exportConfiguration(prefs: Prefs) {
  return { format: "nexus.configuration.v2", preferences: { ...prefs,
    profiles: prefs.profiles.map(row => row.id === prefs.activeProfile ? { ...row, appearance: appearance(prefs) } : row) } };
}
export function readConfiguration(input: string): Prefs {
  const fail = () => new Error("Il file non contiene una configurazione NEXUS valida.");
  if (new TextEncoder().encode(input).length > configurationLimit) throw fail();
  const data = JSON.parse(input);
  if (!["nexus.configuration.v1","nexus.configuration.v2"].includes(data?.format)) throw fail();
  // Add only fields absent from historic v1 exports, then validate their full shape.
  if (data.format==="nexus.configuration.v1" && data.preferences && typeof data.preferences === "object") {
    data.preferences.colors ??= {};
    data.preferences.savedThemes ??= [];
    if (!("interfaceProfiles" in data.preferences)) data.preferences.interfaceProfiles=[];
    if (!("recentColors" in data.preferences)) data.preferences.recentColors=[];
    if (!("visual" in data.preferences)) data.preferences.visual = defaultVisual;
    if (!("dashboardSizes" in data.preferences)) data.preferences.dashboardSizes={};
    if (!("pageLayouts" in data.preferences)) data.preferences.pageLayouts={};
    if (!("navigation" in data.preferences)) data.preferences.navigation={};
    for (const row of data.preferences.profiles ?? []) {
      if (row?.appearance) row.appearance.colors ??= {};
      if (row?.appearance && !("visual" in row.appearance)) row.appearance.visual=defaultVisual;
      if (row?.appearance && !("dashboardSizes" in row.appearance)) row.appearance.dashboardSizes={};
      if (row?.appearance && !("pageLayouts" in row.appearance)) row.appearance.pageLayouts={};
      if (row?.appearance && !("navigation" in row.appearance)) row.appearance.navigation={};
    }
  }
  const prefs = decodePreferences(data.preferences);
  if (!sameValue(prefs, data.preferences)) throw fail();
  return prefs;
}
export function newProfileId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join("");
}

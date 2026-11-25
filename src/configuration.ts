import { appearance, decodePreferences, type Prefs } from "./prefs";

export function sameValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const a = left as Record<string, unknown>, b = right as Record<string, unknown>;
  return Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every(key => Object.prototype.hasOwnProperty.call(b, key) && sameValue(a[key], b[key]));
}

export function exportConfiguration(prefs: Prefs) {
  return { format: "nexus.configuration.v1", preferences: { ...prefs,
    profiles: prefs.profiles.map(row => row.id === prefs.activeProfile ? { ...row, appearance: appearance(prefs) } : row) } };
}
export function readConfiguration(input: string): Prefs {
  const fail = () => new Error("Il file non contiene una configurazione NEXUS v1 valida.");
  if (input.length > 128000) throw fail();
  const data = JSON.parse(input);
  if (data?.format !== "nexus.configuration.v1") throw fail();
  const prefs = decodePreferences(data.preferences);
  if (!sameValue(prefs, data.preferences)) throw fail();
  return prefs;
}
export function newProfileId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join("");
}

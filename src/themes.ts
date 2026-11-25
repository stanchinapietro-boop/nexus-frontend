// Palette values apply to the same semantic tokens across all modules.
export const themes = {
  dark: ["NEXUS Default", "#64d8e6", "#090b0e", "#101318", "#171b21", "#313940"],
  midnight: ["Midnight", "#91b8ff", "#090d1b", "#11192e", "#1b2742", "#354263"],
  aurora: ["Aurora", "#83e5f0", "#101128", "#191a34", "#2b2547", "#524569"],
  cyberpunk: ["Cyberpunk", "#f599e8", "#160c1d", "#26122e", "#361e40", "#55345e"],
  matrix: ["Matrix", "#82e68c", "#071006", "#10200e", "#1c3218", "#354d30"],
  titanium: ["Titanium", "#bdd1e0", "#171a1c", "#22272a", "#303639", "#485054"],
  ocean: ["Ocean", "#72d8f4", "#07151e", "#0d2231", "#173346", "#304e60"],
  minimal: ["Minimal", "#dedede", "#141414", "#202020", "#2b2b2b", "#424242"],
  light: ["Light", "#64d8e6", "#f4f6f8", "#ffffff", "#f0f3f6", "#c6cdd3"],
  oled: ["OLED Black", "#6ee2d5", "#000000", "#070707", "#111111", "#323232"],
} as const;
export type ThemeId = keyof typeof themes;
export function isTheme(value: unknown): value is ThemeId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(themes, value);
}
function channels(hex: string) {
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16)).join(" ");
}
export const colorNames = { ink: "Sfondo", panel: "Schede", raised: "Superficie elevata", line: "Bordi", text: "Testo", mute: "Testo secondario", sidebar: "Barra laterale" };
export type Colors = Partial<Record<keyof typeof colorNames, string>>;
export type SavedTheme = { name: string; theme: ThemeId; accent: string; colors: Colors };
export function validColors(value: unknown): value is Colors {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.entries(value).every(([k,v]) => Object.prototype.hasOwnProperty.call(colorNames,k) && typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v));
}
export function validSavedTheme(value: unknown): value is SavedTheme {
  if (!value || typeof value !== "object") return false;
  const t = value as Partial<SavedTheme>;
  return Object.keys(t).length === 4 && typeof t.name === "string" && t.name.trim().length > 0 && t.name.length <= 60 &&
    isTheme(t.theme) && typeof t.accent === "string" && /^#[0-9a-f]{6}$/i.test(t.accent) && validColors(t.colors);
}
export function palette(id: ThemeId) {
  const [, , ink, panel, raised, line] = themes[id];
  return { ink, panel, raised, line, sidebar: panel, text: id === "light" ? "#1c1e24" : "#e8edf2", mute: id === "light" ? "#52565f" : "#95959e" };
}
export function applyTheme(id: ThemeId, accent: string, colors: Colors = {}) {
  const root = document.documentElement;
  root.dataset.theme = id;
  Object.entries({ ...palette(id), ...colors }).forEach(([key, color]) =>
    root.style.setProperty("--nexus-" + key, channels(color)));
  root.style.setProperty("--accent", channels(accent));
}

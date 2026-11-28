export const choices = {
  font: {system:"Sistema", sans:"Arial", serif:"Georgia", mono:"Monospace"},
  headings: {inherit:"Come l’interfaccia", sans:"Arial", serif:"Georgia", mono:"Monospace"},
  scale: {small:"90%", normal:"100%", large:"112%", largest:"125%"},
  radius: {sharp:"Netto", small:"Piccolo", medium:"Medio", large:"Grande", round:"Extra arrotondato"},
  cards: {solid:"Solide", glass:"Vetro", transparent:"Trasparenti", elevated:"In rilievo", minimal:"Bordo minimo"},
  background: {solid:"Tinta unita", glow:"Bagliore", gradient:"Sfumatura", animated:"Sfumatura animata"},
  sidebar: {narrow:"192 px", standard:"224 px", wide:"272 px", widest:"304 px"},
  motion: {off:"Disattivato", reduced:"Ridotto", subtle:"Discreto", normal:"Normale", cinematic:"Cinematico"},
} as const;
export type Visual = { [K in keyof typeof choices]: keyof typeof choices[K] };
export const defaultVisual:Visual = {font:"system", headings:"inherit", scale:"normal", radius:"medium",
  cards:"solid", background:"glow", sidebar:"standard", motion:"normal"};
export function decodeVisual(value:unknown):Visual {
  const result={...defaultVisual};
  if (!value || typeof value!=="object") return result;
  for(const key of Object.keys(choices) as (keyof Visual)[]){
    const v=(value as Record<string,unknown>)[key];
    if(typeof v==="string" && Object.prototype.hasOwnProperty.call(choices[key],v)) Object.assign(result,{[key]:v});
  }
  return result;
}
export function applyVisual(v:Visual) {
  const root=document.documentElement;
  for(const key of Object.keys(v) as (keyof Visual)[]) root.dataset[key]=v[key];
}

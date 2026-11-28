export const sectionNames = {module:"Contenuto della pagina", history:"Attività recente", assistant:"Stato AI"} as const;
export type SectionId=keyof typeof sectionNames;
export type Section={id:SectionId; wide:boolean; visible:boolean};
export type PageLayouts=Record<string,Section[]>;
export const defaultSections:Section[]=[
  {id:"module",wide:true,visible:true},{id:"history",wide:false,visible:false},{id:"assistant",wide:false,visible:false},
];
export function decodePageLayouts(input:unknown):PageLayouts{
  const result:PageLayouts={};
  if(!input || typeof input!=="object")return result;
  for(const [path,rows] of Object.entries(input).slice(0,32)){
    if(!/^\/[a-z-]{1,32}$/.test(path)|| !Array.isArray(rows) || rows.length!==defaultSections.length)continue;
    if(rows.every(row=>row && Object.prototype.hasOwnProperty.call(sectionNames,row.id)
      && typeof row.wide==="boolean" && typeof row.visible==="boolean") && new Set(rows.map(row=>row.id)).size===rows.length){
      result[path]=rows.map(({id,wide,visible})=>({id,wide,visible}));
    }
  }
  return result;
}

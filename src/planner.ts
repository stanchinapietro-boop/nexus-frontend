import { req } from "./api";
import type { LifeEvent } from "./coreRecords";
import { localDay } from "./schoolAgenda";

export type Item = {key:string; title:string; source:string; to:string; due:string|null; done:boolean; important:boolean; minutes?:number; urgent?:boolean; task?:boolean; complete?:()=>Promise<unknown>};
export type DayPlan = {priorities:string[]; start_min:number|null; end_min:number|null; version:number};
export type Objective = {title:string; main:boolean; done:boolean; links:string[]};
export type Week = {objectives:Objective[]; achievements:string; obstacles:string; next_week:string; version:number};
export type Placement = {key:string; goal_id:number|null; project_id:number|null; energy:"bassa"|"media"|"alta"|null; context:string; dependencies:string[]; scheduled:string|null; minutes:number|null; quadrant:number|null; area_id:number|null; version:number};
export type Area = {id:number;name:string;color:string;description:string;icon:string;importance:number};
export type Focus = {id:number;source_key:string;status:string;started:string;ended:string|null;elapsed:number;target_minutes:number;notes:string};
export type Block = {event_id:number;source_key:string|null;project_id:number|null;color:string};
export const defaults = {priorities:[], start_min:null,end_min:null,version:0} as DayPlan;
export function read<T>(path:string) {return req<T>("/planner/"+path);}
export function write<T>(path:string,method:string,body?:unknown) {return req<T>("/planner/"+path,{method,body:body===undefined?undefined:JSON.stringify(body)});}
export const moveDay=(d:string,n:number)=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()+n);return localDay(x);};
export const monday=(d:string)=>moveDay(d,-((new Date(d+"T12:00:00").getDay()+6)%7));
export function classify(t:Item,day:string,p?:Placement) {
  const distance=t.due?(Date.parse(t.due)-Date.parse(day))/86400000:null;
  const minutes=p?.minutes??t.minutes??0;
  const near=distance!==null && distance<=Math.max(1,Math.ceil(minutes/480));
  const urgent=near || !!t.urgent;
  const reason=[t.important?"importanza alta":"importanza ordinaria",near?(distance!<0?"scadenza superata":"scadenza ravvicinata"):t.urgent?"urgenza indicata alla fonte":t.due?"scadenza "+t.due:"senza scadenza"];
  if(minutes)reason.push(minutes+" min stimati");
  return {q:p?.quadrant??(t.important?(urgent?1:2):(urgent?3:4)),reason:(p?.quadrant?"Scelta manuale · ":"")+reason.join(" · ")};
}
export function budget(day:string,plan:DayPlan,events:LifeEvent[],unblockedMinutes:number) {
  if(plan.start_min===null||plan.end_min===null)return null;
  const at=(m:number)=>{const t=new Date(day+"T00:00:00");t.setMinutes(m);return t.getTime();};
  const a=at(plan.start_min),b=at(plan.end_min);
  const spans=events.filter(e=>e.ends_at).map(e=>[Math.max(a,Date.parse(e.starts_at)),Math.min(b,Date.parse(e.ends_at!))]).filter(([s,e])=>s<e).sort((x,y)=>x[0]-y[0]);
  let cursor=a,used=0;for(const [s,e] of spans){used+=Math.max(0,e-Math.max(cursor,s));cursor=Math.max(cursor,e);}
  const occupied=Math.round(used/60000),capacity=Math.round((b-a)/60000);
  return {capacity,occupied,remaining:capacity-occupied-unblockedMinutes};
}
export function remainingEstimate(day:string, plan:DayPlan, events:LifeEvent[], links:Block[], key:string, minutes:number) {
  const ids=new Set(links.filter(link=>link.source_key===key).map(link=>link.event_id));
  const reserved=budget(day,plan,events.filter(event=>ids.has(event.id)),0)?.occupied??0;
  return Math.max(0,minutes-reserved);
}
export const emptyPlace=(key:string):Placement=>({key,goal_id:null,project_id:null,energy:null,context:"",dependencies:[],scheduled:null,minutes:null,quadrant:null,area_id:null,version:0});
export const field="block w-full min-w-0 rounded-lg border border-line bg-ink px-3 py-2 text-base";
export const btn="min-h-11 rounded-lg border border-line px-3 py-2 text-sm hover:border-accent";
export const panel="min-w-0 space-y-3 rounded-xl border border-line bg-panel p-4";

export type WeekSummary={weekly_objectives:number;weekly_objectives_done:number;habit_completions:number;focus_minutes:number;daily_priorities:number};
export function weekSummary(day:string){
  return read<WeekSummary>("overview/"+day+"?zone="+encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone||"Europe/Rome"));
}

import {academic,fin3} from "./api";
import {projects,events} from "./coreRecords";
import {lifeApi} from "./lifeResources";
import type {Item} from "./planner";
import {localDay} from "./schoolAgenda";

export async function loadSources(){
  const missing:string[]=[];
  const safe=async<T>(label:string,p:Promise<T[]>)=>p.catch(()=>{missing.push(label);return [] as T[];});
  const [school,exams,proj,calendar,goals,habits,routines,workouts,savings,recurring,studies]=await Promise.all([
    safe("Attività scolastiche",academic.tasks()),safe("Verifiche",academic.exams()),safe("Progetti",projects.list()),
    safe("Calendario",events.list()),safe("Obiettivi",lifeApi.goals()),safe("Abitudini",lifeApi.habits()),safe("Routine",lifeApi.routines()),
    safe("Allenamenti",lifeApi.workouts()),safe("Risparmio",fin3.goals()),safe("Ricorrenze finanziarie",fin3.recurring()),
    safe("Sessioni di studio",academic.studySessions()),
  ]);
  const items:Item[]=[
    ...school.filter(x=>x.status!=="cancelled").map(x=>({key:"school-"+x.id,title:x.title,source:"Academic",to:"/academic?sezione=agenda",due:x.due_date,important:x.important||x.priority==="high",urgent:x.urgent,minutes:x.estimated_minutes,done:x.done,task:true,complete:()=>academic.toggleTask(x.id)})),
    ...exams.map(x=>({key:"exam-"+x.id,title:x.title,source:"Verifica",to:"/academic?sezione=exams",due:x.exam_date,important:x.priority==="high",done:x.prep_status==="taken"})),
    ...proj.filter(x=>x.status!=="archived").map(x=>({key:"project-"+x.id,title:x.title+(x.milestone?" · "+x.milestone:""),source:"Progetti",to:"/projects?id="+x.id,due:x.target_date,important:false,done:x.status==="completed"})),
    ...goals.map(x=>({key:"goal-"+x.id,title:x.title,source:"Obiettivo",to:"/life?tab=obiettivi",due:x.due_date,important:false,done:x.progress===100})),
    ...habits.map(x=>({key:"habit-"+x.id,title:x.name,source:"Abitudine",to:"/life?tab=abitudini",due:x.scheduled_today?localDay(new Date()):null,important:false,done:x.today_completed})),
    ...workouts.map(x=>({key:"workout-"+x.id,title:x.name,source:"Sport",to:"/life?tab=oggi",due:x.day,minutes:x.duration_minutes,important:false,done:x.completed})),
    ...savings.map(x=>({key:"finance-"+x.id,title:x.name,source:"Risparmio",to:"/finance/obiettivi",due:x.deadline,important:false,done:x.saved_cents>=x.target_cents})),
    ...recurring.filter(x=>x.active).map(x=>({key:"payment-"+x.id,title:x.note,source:"Scadenza finanziaria",to:"/finance/ricorrenti",due:x.next_day,important:false,done:false})),
    ...calendar.map(x=>({key:"event-"+x.id,title:x.title,source:"Calendario",to:"/calendar?evento="+x.id,due:localDay(new Date(x.starts_at)),important:false,done:false})),
  ];
  return {items,missing,calendar,goals,habits,routines,workouts,proj,studies};
}

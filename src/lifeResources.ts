import { req } from "./api";
export type LifeGoal = {id:number;title:string;description:string;category:string;goal_type:string;target_value:number|null;current_value:number;unit:string;due_date:string|null;motivation:string;active:boolean;progress:number|null};
export type LifeHabit = {id:number;name:string;description:string;category:string;kind:string;days:number[];target_value:number;unit:string;start_date:string;active:boolean;scheduled_today:boolean;today_value:number;today_completed:boolean;streak:number};
export type LifeRoutine = {id:number;name:string;kind:string;days:number[];completed_steps:number[];steps:LifeRoutineStep[]};
export const lifeApi = {
  goals:()=>req<LifeGoal[]>("/life/goals"),
  addGoal:(data:Record<string,unknown>)=>req<LifeGoal>("/life/goals",{method:"POST",body:JSON.stringify(data)}),
  updateGoal:(id:number,data:Record<string,unknown>)=>req<LifeGoal>(`/life/goals/${id}`,{method:"PUT",body:JSON.stringify(data)}),
  deleteGoal:(id:number)=>req<void>(`/life/goals/${id}`,{method:"DELETE"}),
  completeGoal:(id:number)=>req<LifeGoal>(`/life/goals/${id}/complete`,{method:"POST"}),
  milestones:(id:number)=>req<LifeMilestone[]>(`/life/goals/${id}/milestones`),
  addMilestone:(id:number,title:string,due_date:string|null)=>req<LifeMilestone>(`/life/goals/${id}/milestones`,{method:"POST",body:JSON.stringify({title,due_date})}),
  toggleMilestone:(id:number)=>req<{id:number;completed:boolean}>(`/life/milestones/${id}/toggle`,{method:"POST"}),
  deleteMilestone:(id:number)=>req<void>(`/life/milestones/${id}`,{method:"DELETE"}),
  habits:()=>req<LifeHabit[]>("/life/habits"),
  addHabit:(data:Record<string,unknown>)=>req<LifeHabit>("/life/habits",{method:"POST",body:JSON.stringify(data)}),
  logHabit:(id:number,data:{value:number;completed:boolean;note:string})=>req<LifeHabit>(`/life/habits/${id}/log`,{method:"POST",body:JSON.stringify(data)}),
  deleteHabit:(id:number)=>req<void>(`/life/habits/${id}`,{method:"DELETE"}),
  routines:()=>req<LifeRoutine[]>("/life/routines"),
  addRoutine:(data:Record<string,unknown>)=>req<LifeRoutine>("/life/routines",{method:"POST",body:JSON.stringify(data)}),
  addRoutineStep:(id:number,data:{title:string;duration_minutes:number})=>req<LifeRoutineStep>(`/life/routines/${id}/steps`,{method:"POST",body:JSON.stringify(data)}),
  reorderSteps:(id:number,expected:number[],ordered:number[])=>req<void>(`/life/routines/${id}/order`,{method:"PUT",body:JSON.stringify({expected,ordered})}),
  habitHistory:(id:number)=>req<{day:string;value:number;completed:boolean;note:string}[]>(`/life/habits/${id}/history`),
  completeRoutineStep:(id:number,step:number)=>req<{progress:number}>(`/life/routines/${id}/complete?step_id=${step}`,{method:"POST"}),
  workouts:()=>req<LifeWorkout[]>("/life/workouts"),
};

export type LifeMilestone={id:number;title:string;due_date:string|null;completed:boolean};
export type LifeRoutineStep = {id:number;title:string;position:number;duration_minutes:number};
export type LifeWorkout={id:number;name:string;sport:string;day:string;duration_minutes:number;place:string;description:string;intensity:number|null;notes:string;completed:boolean};

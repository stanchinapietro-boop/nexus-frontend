import { useRef, useState } from "react";

export type GraphNode = {key:string; title:string; kind:string; path:string};
export type Connection = {origin:GraphNode; destination:GraphNode};
type Props = {nodes:GraphNode[]; edges:Connection[]; selected:GraphNode|null; select:(node:GraphNode)=>void; zoom:number};

export default function Constellation({nodes,edges,selected,select,zoom}:Props){
  const [yaw,rotate]=useState(0), [pitch,tilt]=useState(0);
  const drag=useRef<{x:number;y:number;angle:number;pitch:number;moved:boolean}|null>(null);
  const skipClick=useRef(false);
  const points = nodes.map((node,index)=>{
    const y=1-2*(index+.5)/nodes.length;
    const ring=Math.sqrt(1-y*y), angle=index*Math.PI*(3-Math.sqrt(5))+yaw;
    const x=ring*Math.cos(angle), z=ring*Math.sin(angle);
    const height=y*Math.cos(pitch)-z*Math.sin(pitch);
    const depth=y*Math.sin(pitch)+z*Math.cos(pitch);
    const scale=zoom*125/(1.5-depth*.32);
    return {node,x:180+x*scale,y:140+height*scale,depth};
  });
  const byKey=new Map(points.map(p=>[p.node.key,p]));
  return <div className="rounded-xl border border-line bg-panel p-2">
    <svg aria-label="Costellazione delle relazioni" role="group" viewBox="0 0 360 280" className="mx-auto block w-full max-w-2xl touch-none"
      onPointerDown={e=>{if(e.button!==0)return;skipClick.current=false;drag.current={x:e.clientX,y:e.clientY,angle:yaw,pitch,moved:false};}}
      onPointerMove={e=>{const d=drag.current;if(!d)return;
        const dx=e.clientX-d.x,dy=e.clientY-d.y;if(!d.moved && Math.hypot(dx,dy)<5)return;
        d.moved=true;e.currentTarget.setPointerCapture(e.pointerId);
        rotate(d.angle+dx*.012);tilt(d.pitch+dy*.012);}}
      onPointerCancel={()=>{drag.current=null;}}
      onPointerLeave={()=>{if(!drag.current?.moved)drag.current=null;}}
      onPointerUp={()=>{skipClick.current=!!drag.current?.moved;drag.current=null;}}>
      {edges.map(({origin,destination})=>{
        const a=byKey.get(origin.key)!,b=byKey.get(destination.key)!;
        const active=selected?.key===origin.key || selected?.key===destination.key;
        return <line key={origin.key+"|"+destination.key} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke="rgb(var(--accent))" strokeWidth={active?1.6:.8} opacity={!selected || active ? .7 : .2}/>;
      })}
      {points.sort((a,b)=>a.depth-b.depth).map(p=><g key={p.node.key} role="button" tabIndex={0} aria-label={p.node.kind+" "+p.node.title}
        aria-pressed={selected?.key===p.node.key} transform={`translate(${p.x} ${p.y})`} className="cursor-pointer"
        onClick={()=>{if(!skipClick.current)select(p.node);}} onKeyDown={e=>{if(e.key==="Enter" || e.key===" "){e.preventDefault();select(p.node);}}}>
        <title>{p.node.title}</title><circle r="9" fill="transparent"/>
        <circle r={selected?.key===p.node.key?5:3.8+p.depth} fill="rgb(var(--accent))" stroke="rgb(var(--nexus-panel))"/>
        {(nodes.length<9 || p.node.key===selected?.key) && <text textAnchor="middle" y="-8" fill="rgb(var(--nexus-text))" fontSize="6.5">
          {p.node.title.length>25?p.node.title.slice(0,24)+"…":p.node.title}</text>}
      </g>)}
    </svg>
    <div className="flex flex-wrap justify-center gap-3 text-sm">
      <button onClick={()=>rotate(yaw-.3)} aria-label="Ruota a sinistra">← Ruota</button>
      <button onClick={()=>{rotate(0);tilt(0);}}>Vista iniziale</button>
      <button onClick={()=>rotate(yaw+.3)} aria-label="Ruota a destra">Ruota →</button>
    </div></div>;
}

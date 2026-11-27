import { useEffect, useState } from "react";
import { req } from "./api";

export function useAssistantStatus() {
  const [provider,setProvider] = useState<"checking"|"configured"|"missing"|"error">("checking");
  const [attempt,setAttempt] = useState(0);
  useEffect(()=>{
    const controller = new AbortController();
    setProvider("checking");
    req<{configured:boolean}>("/planner/assistant/status",{signal:controller.signal})
      .then(status=>{if(!controller.signal.aborted)setProvider(status.configured?"configured":"missing");})
      .catch(()=>{if(!controller.signal.aborted)setProvider("error");});
    return ()=>controller.abort();
  },[attempt]);
  return {provider, retry:()=>setAttempt(n=>n+1)};
}

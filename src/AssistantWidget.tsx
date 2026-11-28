import { Link } from "react-router-dom";
import {useAssistantStatus} from "./useAssistantStatus";

const panel = "rounded-xl border border-line bg-panel p-4 sm:p-5";
const action = "text-sm font-medium text-accent underline-offset-4 hover:underline";

export default function AssistantWidget() {
  const {provider,retry} = useAssistantStatus();
  return <section className={panel}><h2 className="font-semibold">Stato AI</h2>
    <p role="status" className="my-2 text-sm text-mute">{{
      checking:"Verifica configurazione…", missing:"Provider AI da configurare. Il piano locale è disponibile.",
      configured:"Provider configurato sul server.", error:"Stato del provider indisponibile.",
    }[provider]}</p>
    {provider==="error" && <button onClick={retry} className={action+" mr-3"}>Riprova</button>}
    <Link to="/ai" className={action}>Apri assistente</Link></section>;
}

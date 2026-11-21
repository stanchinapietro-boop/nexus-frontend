import { Link } from "react-router-dom";
import { type NavItem } from "../nav";

const planned: Record<string, { description: string; features: string[]; related: string; link: string }> = {
  "/ai": { description: "Assistente personale con accesso al contesto che scegli di condividere.", features: ["Conversazioni", "Selezione del modello", "Permessi per le azioni"], related: "/search", link: "Cerca nei tuoi dati" },
  "/life": { description: "Pianificazione della giornata e della settimana a partire dagli impegni.", features: ["Routine", "Piano settimanale", "Blocchi di tempo"], related: "/tasks", link: "Apri le attività TickTick" },
  "/health": { description: "Diario personale per allenamenti, sonno e recupero.", features: ["Diario allenamenti", "Storico del sonno", "Andamento nel tempo"], related: "/inbox", link: "Apri l’Inbox" },
  "/goals": { description: "Obiettivi personali e abitudini con progressi misurabili.", features: ["Traguardi", "Registro delle abitudini", "Frequenza e progressione"], related: "/inbox", link: "Apri l’Inbox" },
  "/analytics": { description: "Andamento dei dati raccolti nei diversi moduli.", features: ["Report periodici", "Confronti tra periodi", "Filtri per modulo"], related: "/academic?sezione=analytics", link: "Apri le statistiche scolastiche" },
  "/automations": { description: "Regole per avviare operazioni quando si verifica un evento.", features: ["Trigger e condizioni", "Azioni autorizzate", "Registro esecuzioni"], related: "/notifications", link: "Apri le notifiche" },
};

export default function Soon({ item }: { item: NavItem }) {
  const plan = planned[item.path];
  const Icon = item.icon;
  return <section className="mx-auto max-w-2xl space-y-5">
    <header><Icon className="mb-4 text-accent" size={28} aria-hidden="true" />
      <h1 className="text-3xl font-semibold tracking-tight">{item.label}</h1>
      <p className="mt-2 text-mute">{plan.description}</p></header>
    <section className="rounded-xl border border-line bg-panel p-5">
      <h2 className="font-semibold">Modulo in programma</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-mute">{plan.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
    </section>
    <Link to={plan.related} className="inline-block py-2 text-accent">{plan.link} →</Link>
  </section>;
}

import { useRef, useState } from "react";
import { exportConfiguration, newProfileId, readConfiguration } from "./configuration";
import { setPrefs, usePrefs, type Prefs } from "./prefs";

const button = "min-h-11 rounded-lg border border-line px-3";
export default function ConfigurationFiles() {
  const prefs = usePrefs();
  const [incoming, setIncoming] = useState<Prefs | null>(null);
  const [error, setError] = useState("");
  const selection = useRef(0);
  function download() {
    const json = JSON.stringify(exportConfiguration(prefs));
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = "nexus-configurazione-v1.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function inspect(file?: File) {
    const current = ++selection.current;
    setError(""); setIncoming(null);
    if (!file) return;
    try {
      if (file.size > 128000) throw new Error();
      const candidate = readConfiguration(await file.text());
      if (current === selection.current) setIncoming(candidate);
    } catch {
      if (current === selection.current) setError("File non valido. Seleziona un export NEXUS v1 fino a 128 KB.");
    }
  }
  return <div className="space-y-3">
    <p className="text-sm text-mute">Il file contiene preferenze, temi, navigazione e layout dei workspace.</p>
    <button className={button} onClick={download}>Esporta configurazione</button>
    <label className="block">Importa configurazione<input type="file" accept=".json,application/json" className="block max-w-full"
      onChange={e => { void inspect(e.target.files?.[0]); e.target.value = ""; }}/></label>
    {error && <p role="alert">{error}</p>}
    {incoming && <section className="space-y-2 rounded-lg border border-line p-3">
      <h3>Anteprima importazione</h3><p>{incoming.profiles.map(row => row.name).join(", ")}</p>
      <p className="text-sm">Unisci per aggiungere copie dei workspace. Sostituisci per applicare tutte le preferenze del file.</p>
      {prefs.profiles.length + incoming.profiles.length <= 24 && <button className={button} onClick={() => {
        const copies = incoming.profiles.map(row => ({ ...row, id: newProfileId() }));
        setPrefs({ activeProfile: prefs.activeProfile, profiles: [...prefs.profiles, ...copies] }); setIncoming(null);
      }}>Unisci workspace</button>}{" "}
      <button className={button} onClick={() => { setPrefs(incoming); setIncoming(null); }}>Conferma sostituzione</button>{" "}
      <button className={button} onClick={() => setIncoming(null)}>Annulla importazione</button>
    </section>}
  </div>;
}

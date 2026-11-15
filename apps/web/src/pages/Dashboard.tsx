import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, type Note } from "../api";

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="text-sm text-mute">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-mute">{hint}</div>}
    </div>
  );
}

export default function Dashboard() {
  const now = useNow();
  const [status, setStatus] = useState<"..." | "online" | "offline">("...");
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    api.health().then(() => setStatus("online")).catch(() => setStatus("offline"));
    api.listNotes().then(setNotes).catch(() => setNotes([]));
  }, []);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";

  const chart = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    return days.map((d) => ({
      giorno: d.toLocaleDateString("it-IT", { weekday: "short" }),
      note: notes.filter((n) => new Date(n.created_at).toDateString() === d.toDateString()).length,
    }));
  }, [notes]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-semibold tracking-tight">{greeting}</h1>
      <p className="mt-1 text-mute">
        {now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })} ·{" "}
        {now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Backend" value={status} hint="API FastAPI" />
        <Card label="Note salvate" value={String(notes.length)} hint="Dal database" />
        <Card label="Moduli attivi" value="1 / 9" hint="Overview" />
        <Card label="Versione" value="0.1" hint="Foundation" />
      </div>

      <div className="mt-6 rounded-xl border border-line bg-panel p-4">
        <div className="mb-3 text-sm text-mute">Note create negli ultimi 7 giorni</div>
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={chart}>
              <XAxis dataKey="giorno" stroke="#8d8d94" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} stroke="#8d8d94" tickLine={false} axisLine={false} width={24} />
              <Tooltip contentStyle={{ background: "#222225", border: "1px solid #2e2e32", borderRadius: 8 }} cursor={{ fill: "#222225" }} />
              <Bar dataKey="note" fill="#ff6a1a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

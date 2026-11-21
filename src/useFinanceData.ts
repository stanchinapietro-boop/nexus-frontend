import { useEffect, useState } from "react";

export function useFinanceData<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setError("");
    load().then(value => {
      if (active) setData(value);
    }).catch((e: Error) => {
      if (active) { setData(null); setError(e.message); }
    });
    return () => { active = false; };
  }, deps);
  return { data, error };
}

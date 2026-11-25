import { useEffect, useState } from "react";
import { req } from "./api";
export type Hit = { id: number | string; group: string; title: string; detail: string; day: string | null; to: string };
type Matches = { results: Hit[]; unavailable: string[]; per_category: number };
export function useRecordSearch(q: string, attempt = 0) {
  const [response, setResponse] = useState<Matches | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    setResponse(null);
    setError(false);
    if (q.length < 2) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      req<Matches>("/search?q=" + encodeURIComponent(q), { signal: controller.signal })
        .then(data => { if (!controller.signal.aborted) setResponse(data); })
        .catch(() => { if (!controller.signal.aborted) setError(true); });
    }, 180);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [q, attempt]);
  return {response, error};
}

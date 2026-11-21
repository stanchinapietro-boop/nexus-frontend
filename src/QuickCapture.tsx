import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import InboxForm from "./InboxForm";
import { inboxApi } from "./inboxApi";

const openEvent = "nexus:quick-capture";

export function openQuickCapture() {
  window.dispatchEvent(new Event(openEvent));
}

export default function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    const show = () => { setSavedId(null); setOpen(true); };
    function key(event: KeyboardEvent) {
      if (!event.repeat && !event.isComposing && !event.shiftKey && (event.ctrlKey || event.metaKey) && event.altKey && event.code === "KeyI") {
        event.preventDefault();
        show();
      }
    }
    window.addEventListener(openEvent, show);
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener(openEvent, show); window.removeEventListener("keydown", key); };
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, [open]);
  useEffect(() => {
    if (savedId === null) return;
    const timer = window.setTimeout(() => setSavedId(null), 7000);
    return () => window.clearTimeout(timer);
  }, [savedId]);

  return <>
    {open && <dialog ref={dialog} aria-labelledby="capture-title"
      className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-line bg-panel p-5 text-white backdrop:bg-black/70"
      style={{ width: "min(32rem, calc(100vw - 2rem))" }}
      onCancel={event => { event.preventDefault(); if (!busy.current) setOpen(false); }}>
      <h2 id="capture-title" className="mb-4 text-xl font-semibold">Acquisizione rapida</h2>
      <InboxForm onCancel={() => setOpen(false)} onBusy={value => { busy.current = value; }} onSave={async (values, token) => {
        const item = await inboxApi.create(values, token);
        setOpen(false);
        setSavedId(item.id);
      }} />
    </dialog>}
    {savedId !== null && <div role="status" className="fixed inset-x-4 bottom-24 z-30 mx-auto flex max-w-sm justify-between gap-3 rounded-xl border border-line bg-panel p-4 shadow-lg md:bottom-6">
      <span>Elemento salvato in Inbox.</span>
      <Link onClick={() => setSavedId(null)} className="font-medium text-accent" to={"/inbox?id=" + savedId}>Apri</Link>
    </div>}
  </>;
}

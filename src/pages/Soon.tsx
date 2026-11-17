export default function Soon({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-md text-mute">
        Questo modulo non è ancora sviluppato. Arriverà in una delle prossime milestone.
      </p>
    </div>
  );
}

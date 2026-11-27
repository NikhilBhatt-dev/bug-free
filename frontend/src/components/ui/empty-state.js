export function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 px-6 py-12 text-center">
      <p className="font-medium text-zinc-200">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

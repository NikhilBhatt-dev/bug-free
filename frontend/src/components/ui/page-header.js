export function PageHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-zinc-400">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

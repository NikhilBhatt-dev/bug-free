export function FormField({ label, htmlFor, error, hint, children, className = "" }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-zinc-300">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-zinc-500">{hint}</p> : null}
      {error ? <p className="mt-1.5 text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}

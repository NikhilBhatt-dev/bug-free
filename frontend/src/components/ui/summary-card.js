export function SummaryCard({ label, value, icon: Icon, tone = "emerald" }) {
  const tones = {
    emerald: "bg-emerald-400/10 text-emerald-300",
    blue: "bg-sky-400/10 text-sky-300",
    amber: "bg-amber-400/10 text-amber-300",
    rose: "bg-rose-400/10 text-rose-300",
    violet: "bg-violet-400/10 text-violet-300",
  };
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{label}</p>
        {Icon ? (
          <span className={`grid size-9 place-items-center rounded-lg ${tones[tone]}`}>
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-3xl font-semibold text-zinc-100">{value}</p>
    </article>
  );
}

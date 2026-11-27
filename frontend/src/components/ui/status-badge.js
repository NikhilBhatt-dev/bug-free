import { cn } from "@/utils/cn";

const styles = {
  saved: "border-zinc-700 bg-zinc-800 text-zinc-300",
  ready: "border-sky-800 bg-sky-950 text-sky-300",
  applied: "border-emerald-800 bg-emerald-950 text-emerald-300",
  interviewing: "border-violet-800 bg-violet-950 text-violet-300",
  offer: "border-amber-800 bg-amber-950 text-amber-300",
  rejected: "border-rose-800 bg-rose-950 text-rose-300",
  withdrawn: "border-zinc-700 bg-zinc-900 text-zinc-400",
};

export function StatusBadge({ status }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
        styles[status] || styles.saved,
      )}
    >
      {status}
    </span>
  );
}

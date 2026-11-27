import { LoaderCircle } from "lucide-react";

export function LoadingState({ label = "Loading..." }) {
  return (
    <div className="flex min-h-48 items-center justify-center text-zinc-400">
      <LoaderCircle className="mr-2 size-5 animate-spin" />
      {label}
    </div>
  );
}

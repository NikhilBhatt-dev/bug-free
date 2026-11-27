import { AlertCircle } from "lucide-react";

export function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-rose-900/60 bg-rose-950/20 px-5 py-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-400" />
        <div className="flex-1">
          <p className="text-sm text-rose-200">{message}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 text-sm font-medium text-rose-300 hover:text-rose-200"
            >
              Try again
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
